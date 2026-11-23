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

  async reabastecerBoveda(input: {
    usuario_id: string;
    cuenta_id: string;
    monto: number;
    justificacion?: string;
  }) {
    const resultado = await this.relationalRepo.reabastecerBoveda(input);

    const eventoId = await this.documentRepo.registrarEventoBoveda({
      boveda_id: resultado.boveda_id,
      usuario_id: input.usuario_id,
      tipo_evento: "REABASTECIMIENTO",
      monto: input.monto,
      saldo_resultante: resultado.saldo_reservado,
      deuda_resultante: resultado.deuda_restante,
      justificacion: input.justificacion || "Abono a deuda interna de bóveda fiscal",
    });

    return {
      evento_id: eventoId,
      ...resultado,
    };
  }

  async vincularCfdi(input: {
    usuario_id: string;
    transaccion_id: string;
    uuid_fiscal: string;
  }) {
    const cfdi = await this.relationalRepo.vincularCfdiTransaccion(input);

    await this.documentRepo.registrarExpedienteCfdi({
      cfdi_id: cfdi.cfdi_id,
      usuario_id: input.usuario_id,
      transaccion_id: input.transaccion_id,
      uuid_fiscal: cfdi.uuid_fiscal,
      monto_total: cfdi.monto_total,
      fecha_emision: cfdi.fecha_emision,
    });

    await this.graphRepo.vincularCfdiEnGrafo({
      transaccion_id: input.transaccion_id,
      cfdi_id: cfdi.cfdi_id,
      uuid_fiscal: cfdi.uuid_fiscal,
      monto_total: cfdi.monto_total,
      fecha_emision: cfdi.fecha_emision,
    });

    return cfdi;
  }

  async procesarColaReconciliacion() {
    const pendientes = await this.documentRepo.obtenerTareasPendientesGrafo(20);
    let sincronizados = 0;
    let fallidos = 0;

    for (const task of pendientes) {
      try {
        const datos: any = task.datos || {};
        const p = datos.provision;
        if (!p) {
          await this.documentRepo.marcarTareaGrafoSincronizada(task.task_id);
          continue;
        }
        await this.graphRepo.registrarProvisionEnGrafo({
          transaccion_id: p.transaccion_id,
          cuenta_id: datos.cuenta_id,
          boveda_id: p.boveda_id,
          regla_id: p.regla_id,
          cliente_id: datos.cliente_id || null,
          monto: p.monto_bruto,
          iva_retenido: p.iva_retenido,
          isr_retenido: p.isr_retenido,
          total_retenido: p.total_retenido,
          saldo_reservado_boveda: p.saldo_reservado_boveda,
          fecha: p.fecha,
        });
        await this.documentRepo.marcarTareaGrafoSincronizada(task.task_id);
        sincronizados++;
      } catch (err: any) {
        await this.documentRepo.incrementarReintentoGrafo(
          task.task_id,
          err?.message || "Error al reconciliar con Neo4j"
        );
        fallidos++;
      }
    }

    return {
      revisados: pendientes.length,
      sincronizados,
      fallidos,
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
