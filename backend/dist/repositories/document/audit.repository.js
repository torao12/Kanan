"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentAuditRepository = void 0;
const crypto_1 = require("crypto");
const mongodb_1 = require("mongodb");
const databases_1 = require("../../config/databases");
class DocumentAuditRepository {
    async registrarWebhook(proveedor, payload) {
        const db = (0, databases_1.getMongoDb)();
        const webhookId = `wh_${(0, crypto_1.randomUUID)()}`;
        await db.collection("webhooks_bancarios").insertOne({
            webhook_id: webhookId,
            proveedor,
            payload,
            recibido_en: new Date(),
            procesado: false,
        });
        return webhookId;
    }
    async actualizarEstadoWebhook(webhookId, procesado, errorLog) {
        const db = (0, databases_1.getMongoDb)();
        await db.collection("webhooks_bancarios").updateOne({ webhook_id: webhookId }, {
            $set: {
                procesado,
                ...(errorLog ? { error_log: errorLog } : {}),
            },
        });
    }
    async registrarEventoBoveda(params) {
        const db = (0, databases_1.getMongoDb)();
        const eventoId = `evt_${(0, crypto_1.randomUUID)()}`;
        await db.collection("bitacora_boveda").insertOne({
            evento_id: eventoId,
            boveda_id: params.boveda_id,
            usuario_id: params.usuario_id,
            tipo_evento: params.tipo_evento,
            monto: mongodb_1.Decimal128.fromString(params.monto.toFixed(2)),
            saldo_resultante: mongodb_1.Decimal128.fromString(params.saldo_resultante.toFixed(2)),
            deuda_resultante: mongodb_1.Decimal128.fromString(params.deuda_resultante.toFixed(2)),
            ...(params.justificacion ? { justificacion: params.justificacion } : {}),
            fecha_timestamp: new Date(),
        });
        return eventoId;
    }
    async registrarExpedienteCfdi(params) {
        const db = (0, databases_1.getMongoDb)();
        await db.collection("expedientes_cfdi").insertOne({
            cfdi_id: params.cfdi_id,
            usuario_id: params.usuario_id,
            transaccion_id: params.transaccion_id,
            uuid_fiscal: params.uuid_fiscal,
            version_cfdi: "4.0",
            monto_total: mongodb_1.Decimal128.fromString(params.monto_total.toFixed(2)),
            fecha_timbrado: params.fecha_emision,
            registrado_en: new Date(),
        });
    }
    async encolarSincronizacionGrafo(evento) {
        const db = (0, databases_1.getMongoDb)();
        const taskId = `sync_${(0, crypto_1.randomUUID)()}`;
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
        const db = (0, databases_1.getMongoDb)();
        return db
            .collection("pendientes_sincronizacion_grafo")
            .find({ estado: "PENDIENTE" })
            .sort({ creado_en: 1 })
            .limit(limit)
            .toArray();
    }
    async marcarTareaGrafoSincronizada(taskId) {
        const db = (0, databases_1.getMongoDb)();
        await db.collection("pendientes_sincronizacion_grafo").updateOne({ task_id: taskId }, { $set: { estado: "SINCRONIZADO", sincronizado_en: new Date() } });
    }
    async incrementarReintentoGrafo(taskId, errorMsg) {
        const db = (0, databases_1.getMongoDb)();
        await db.collection("pendientes_sincronizacion_grafo").updateOne({ task_id: taskId }, { $inc: { reintentos: 1 }, $set: { ultimo_error: errorMsg, ultimo_intento: new Date() } });
    }
    async obtenerBitacoraUsuario(usuario_id) {
        const db = (0, databases_1.getMongoDb)();
        return db
            .collection("bitacora_boveda")
            .find({ usuario_id })
            .sort({ fecha_timestamp: -1 })
            .limit(15)
            .toArray();
    }
}
exports.DocumentAuditRepository = DocumentAuditRepository;
