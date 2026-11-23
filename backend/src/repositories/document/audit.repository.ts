import { randomUUID } from "crypto";
import { Decimal128 } from "mongodb";
import { getMongoDb } from "../../config/databases";

export class DocumentAuditRepository {
  async registrarWebhook(proveedor: string, payload: Record<string, unknown>): Promise<string> {
    const db = getMongoDb();
    const webhookId = `wh_${randomUUID()}`;
    await db.collection("webhooks_bancarios").insertOne({
      webhook_id: webhookId,
      proveedor,
      payload,
      recibido_en: new Date(),
      procesado: false,
    });
    return webhookId;
  }

  async actualizarEstadoWebhook(
    webhookId: string,
    procesado: boolean,
    errorLog?: string
  ): Promise<void> {
    const db = getMongoDb();
    await db.collection("webhooks_bancarios").updateOne(
      { webhook_id: webhookId },
      {
        $set: {
          procesado,
          ...(errorLog ? { error_log: errorLog } : {}),
        },
      }
    );
  }

  async registrarEventoBoveda(params: {
    boveda_id: string;
    usuario_id: string;
    tipo_evento: "PROVISION_AUTOMATICA" | "RUPTURA_CRISTAL" | "REABASTECIMIENTO";
    monto: number;
    saldo_resultante: number;
    deuda_resultante: number;
    justificacion?: string;
  }): Promise<string> {
    const db = getMongoDb();
    const eventoId = `evt_${randomUUID()}`;
    await db.collection("bitacora_boveda").insertOne({
      evento_id: eventoId,
      boveda_id: params.boveda_id,
      usuario_id: params.usuario_id,
      tipo_evento: params.tipo_evento,
      monto: Decimal128.fromString(params.monto.toFixed(2)),
      saldo_resultante: Decimal128.fromString(params.saldo_resultante.toFixed(2)),
      deuda_resultante: Decimal128.fromString(params.deuda_resultante.toFixed(2)),
      ...(params.justificacion ? { justificacion: params.justificacion } : {}),
      fecha_timestamp: new Date(),
    });
    return eventoId;
  }

  async registrarExpedienteCfdi(params: {
    cfdi_id: string;
    usuario_id: string;
    transaccion_id: string;
    uuid_fiscal: string;
    monto_total: number;
    fecha_emision: string;
  }): Promise<void> {
    const db = getMongoDb();
    await db.collection("expedientes_cfdi").insertOne({
      cfdi_id: params.cfdi_id,
      usuario_id: params.usuario_id,
      transaccion_id: params.transaccion_id,
      uuid_fiscal: params.uuid_fiscal,
      version_cfdi: "4.0",
      monto_total: Decimal128.fromString(params.monto_total.toFixed(2)),
      fecha_timbrado: params.fecha_emision,
      registrado_en: new Date(),
    });
  }

  async encolarSincronizacionGrafo(evento: Record<string, unknown>): Promise<string> {
    const db = getMongoDb();
    const taskId = `sync_${randomUUID()}`;
    await db.collection("pendientes_sincronizacion_grafo").insertOne({
      task_id: taskId,
      estado: "PENDIENTE",
      creado_en: new Date(),
      reintentos: 0,
      datos: evento,
    });
    return taskId;
  }

  async obtenerTareasPendientesGrafo(limit = 20) {
    const db = getMongoDb();
    return db
      .collection("pendientes_sincronizacion_grafo")
      .find({ estado: "PENDIENTE" })
      .sort({ creado_en: 1 })
      .limit(limit)
      .toArray();
  }

  async marcarTareaGrafoSincronizada(taskId: string): Promise<void> {
    const db = getMongoDb();
    await db.collection("pendientes_sincronizacion_grafo").updateOne(
      { task_id: taskId },
      { $set: { estado: "SINCRONIZADO", sincronizado_en: new Date() } }
    );
  }

  async incrementarReintentoGrafo(taskId: string, errorMsg: string): Promise<void> {
    const db = getMongoDb();
    await db.collection("pendientes_sincronizacion_grafo").updateOne(
      { task_id: taskId },
      { $inc: { reintentos: 1 }, $set: { ultimo_error: errorMsg, ultimo_intento: new Date() } }
    );
  }

  async obtenerBitacoraUsuario(usuario_id: string) {
    const db = getMongoDb();
    return db
      .collection("bitacora_boveda")
      .find({ usuario_id })
      .sort({ fecha_timestamp: -1 })
      .limit(15)
      .toArray();
  }
}
