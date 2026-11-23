"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KananOrchestratorService = void 0;
const fiscal_repository_1 = require("../repositories/relational/fiscal.repository");
const audit_repository_1 = require("../repositories/document/audit.repository");
const lineage_repository_1 = require("../repositories/graph/lineage.repository");
class KananOrchestratorService {
    relationalRepo = new fiscal_repository_1.RelationalFiscalRepository();
    documentRepo = new audit_repository_1.DocumentAuditRepository();
    graphRepo = new lineage_repository_1.GraphLineageRepository();
    async provisionarIngreso(input) {
        const webhookId = await this.documentRepo.registrarWebhook(input.proveedor || "SIMULADOR_SPEI", input);
        let provision;
        try {
            provision = await this.relationalRepo.provisionarIngreso({
                usuario_id: input.usuario_id,
                cuenta_id: input.cuenta_id,
                cliente_id: input.cliente_id,
                monto: input.monto,
                concepto: input.concepto,
            });
        }
        catch (pgError) {
            await this.documentRepo.actualizarEstadoWebhook(webhookId, false, pgError?.message || "Error en PostgreSQL");
            throw pgError;
        }
        await this.documentRepo.registrarEventoBoveda({
            boveda_id: provision.boveda_id,
            usuario_id: provision.usuario_id,
            tipo_evento: "PROVISION_AUTOMATICA",
            monto: provision.total_retenido,
            saldo_resultante: provision.saldo_reservado_boveda,
            deuda_resultante: provision.deuda_interna_boveda,
            justificacion: `Provisión automática: ${input.concepto}`,
        });
        let neo4jStatus = "SINCRONIZADO";
        let reconciliationTaskId = null;
        try {
            if (input.simular_fallo_neo4j) {
                throw new Error("Fallo simulado de conectividad con Neo4j (PR-05)");
            }
            await this.graphRepo.registrarProvisionEnGrafo({
                transaccion_id: provision.transaccion_id,
                cuenta_id: input.cuenta_id,
                boveda_id: provision.boveda_id,
                regla_id: provision.regla_id,
                cliente_id: input.cliente_id,
                monto: provision.monto_bruto,
                iva_retenido: provision.iva_retenido,
                isr_retenido: provision.isr_retenido,
                total_retenido: provision.total_retenido,
                saldo_reservado_boveda: provision.saldo_reservado_boveda,
                fecha: provision.fecha,
            });
        }
        catch (neoError) {
            neo4jStatus = "ENCOLADO_RECONCILIACION";
            reconciliationTaskId = await this.documentRepo.encolarSincronizacionGrafo({
                webhook_id: webhookId,
                provision,
                cuenta_id: input.cuenta_id,
                cliente_id: input.cliente_id || null,
                motivo: neoError?.message || "Error de conexión con Neo4j",
            });
        }
        await this.documentRepo.actualizarEstadoWebhook(webhookId, true);
        return {
            transaccion_id: provision.transaccion_id,
            webhook_id: webhookId,
            monto_bruto: provision.monto_bruto,
            iva_retenido: provision.iva_retenido,
            isr_retenido: provision.isr_retenido,
            saldo_retenido: provision.total_retenido,
            monto_neto_disponible: provision.monto_neto_disponible,
            saldo_reservado_boveda: provision.saldo_reservado_boveda,
            status: neo4jStatus,
            ...(reconciliationTaskId ? { reconciliation_task_id: reconciliationTaskId } : {}),
        };
    }
    async rupturaCristal(input) {
        const resultado = await this.relationalRepo.ejecutarRupturaCristal(input);
        const eventoId = await this.documentRepo.registrarEventoBoveda({
            boveda_id: resultado.boveda_id,
            usuario_id: input.usuario_id,
            tipo_evento: "RUPTURA_CRISTAL",
            monto: input.monto,
            saldo_resultante: resultado.saldo_restante,
            deuda_resultante: resultado.deuda_generada,
            justificacion: input.justificacion,
        });
        return {
            evento_id: eventoId,
            saldo_restante: resultado.saldo_restante,
            deuda_generada: resultado.deuda_generada,
        };
    }
    async obtenerHuerfanos(usuario_id) {
        return this.graphRepo.obtenerDepositosHuerfanos(usuario_id);
    }
    async obtenerTrazabilidad(usuario_id) {
        return this.graphRepo.obtenerTrazabilidad(usuario_id);
    }
    async obtenerDashboard(usuario_id) {
        const [resumenPg, huerfanos, trazabilidad, bitacora] = await Promise.all([
            this.relationalRepo.obtenerResumenUsuario(usuario_id),
            this.graphRepo.obtenerDepositosHuerfanos(usuario_id),
            this.graphRepo.obtenerTrazabilidad(usuario_id),
            this.documentRepo.obtenerBitacoraUsuario(usuario_id),
        ]);
        return {
            ...resumenPg,
            huerfanos,
            trazabilidad,
            bitacora_boveda: bitacora,
        };
    }
}
exports.KananOrchestratorService = KananOrchestratorService;
