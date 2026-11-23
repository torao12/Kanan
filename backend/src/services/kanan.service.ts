import { RelationalFiscalRepository } from "../repositories/relational/fiscal.repository";
import { DocumentAuditRepository } from "../repositories/document/audit.repository";
import { GraphLineageRepository } from "../repositories/graph/lineage.repository";

export class KananOrchestratorService {
  private relationalRepo = new RelationalFiscalRepository();
  private documentRepo = new DocumentAuditRepository();
  private graphRepo = new GraphLineageRepository();

  async provisionarIngreso(input: {
    usuario_id: string;
    cuenta_id: string;
    cliente_id?: string | null;
    monto: number;
    concepto: string;
    proveedor?: string;
    simular_fallo_neo4j?: boolean;
  }) {
    const webhookId = await this.documentRepo.registrarWebhook(
      input.proveedor || "SIMULADOR_SPEI",
      input
    );

    let provision;
    try {
      provision = await this.relationalRepo.provisionarIngreso({
        usuario_id: input.usuario_id,
        cuenta_id: input.cuenta_id,
        cliente_id: input.cliente_id,
        monto: input.monto,
        concepto: input.concepto,
      });
    } catch (pgError: any) {
      await this.documentRepo.actualizarEstadoWebhook(
        webhookId,
        false,
        pgError?.message || "Error en PostgreSQL"
      );
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
    let reconciliationTaskId: string | null = null;
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
    } catch (neoError: any) {
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

  async rupturaCristal(input: {
    usuario_id: string;
    monto: number;
    justificacion: string;
  }) {
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

  async obtenerHuerfanos(usuario_id: string) {
    return this.graphRepo.obtenerDepositosHuerfanos(usuario_id);
  }

  async obtenerTrazabilidad(usuario_id: string) {
    return this.graphRepo.obtenerTrazabilidad(usuario_id);
  }

  async obtenerDashboard(usuario_id: string) {
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
