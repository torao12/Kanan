"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KananController = void 0;
const kanan_service_1 = require("../services/kanan.service");
const service = new kanan_service_1.KananOrchestratorService();
class KananController {
    static async provisionarIngreso(req, res) {
        try {
            const usuarioId = req.user?.usuario_id;
            if (!usuarioId)
                return res.status(401).json({ error: "No autenticado" });
            const { cuenta_id, cliente_id, monto, concepto, proveedor, simular_fallo_neo4j } = req.body;
            if (!cuenta_id || typeof monto !== "number" || monto <= 0 || !concepto) {
                return res.status(400).json({
                    error: "Payload inválido: cuenta_id, monto (> 0) y concepto son obligatorios",
                });
            }
            const result = await service.provisionarIngreso({
                usuario_id: usuarioId,
                cuenta_id,
                cliente_id,
                monto,
                concepto,
                proveedor,
                simular_fallo_neo4j: Boolean(simular_fallo_neo4j),
            });
            return res.status(201).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error?.message || "Error al provisionar ingreso",
            });
        }
    }
    static async rupturaCristal(req, res) {
        try {
            const usuarioId = req.user?.usuario_id;
            if (!usuarioId)
                return res.status(401).json({ error: "No autenticado" });
            const { monto, justificacion } = req.body;
            if (typeof monto !== "number" || monto <= 0 || !justificacion) {
                return res.status(400).json({
                    error: "Payload inválido: monto (> 0) y justificacion son obligatorios",
                });
            }
            const result = await service.rupturaCristal({
                usuario_id: usuarioId,
                monto,
                justificacion,
            });
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error?.message || "Error al ejecutar ruptura de cristal",
            });
        }
    }
    static async reabastecerBoveda(req, res) {
        try {
            const usuarioId = req.user?.usuario_id;
            if (!usuarioId)
                return res.status(401).json({ error: "No autenticado" });
            const { cuenta_id, monto, justificacion } = req.body;
            if (!cuenta_id || typeof monto !== "number" || monto <= 0) {
                return res.status(400).json({
                    error: "Payload inválido: cuenta_id y monto (> 0) son obligatorios",
                });
            }
            const result = await service.reabastecerBoveda({
                usuario_id: usuarioId,
                cuenta_id,
                monto,
                justificacion,
            });
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error?.message || "Error al reabastecer bóveda fiscal",
            });
        }
    }
    static async vincularCfdi(req, res) {
        try {
            const usuarioId = req.user?.usuario_id;
            if (!usuarioId)
                return res.status(401).json({ error: "No autenticado" });
            const { transaccion_id, uuid_fiscal } = req.body;
            if (!transaccion_id || !uuid_fiscal || String(uuid_fiscal).trim().length < 8) {
                return res.status(400).json({
                    error: "Payload inválido: transaccion_id y uuid_fiscal (mínimo 8 caracteres) son obligatorios",
                });
            }
            const result = await service.vincularCfdi({
                usuario_id: usuarioId,
                transaccion_id,
                uuid_fiscal,
            });
            return res.status(201).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error?.message || "Error al vincular CFDI 4.0",
            });
        }
    }
    static async reconciliarGrafo(_req, res) {
        try {
            const result = await service.procesarColaReconciliacion();
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({
                error: error?.message || "Error ejecutando reconciliación con Neo4j",
            });
        }
    }
    static async obtenerHuerfanos(req, res) {
        try {
            const usuarioId = req.user?.usuario_id;
            if (!usuarioId)
                return res.status(401).json({ error: "No autenticado" });
            if (req.params.usuario_id && req.params.usuario_id !== usuarioId) {
                return res.status(403).json({ error: "Acceso denegado a datos de otro usuario" });
            }
            const data = await service.obtenerHuerfanos(usuarioId);
            return res.status(200).json(data);
        }
        catch (error) {
            return res.status(500).json({ error: error?.message || "Error consultando Neo4j" });
        }
    }
    static async obtenerTrazabilidad(req, res) {
        try {
            const usuarioId = req.user?.usuario_id;
            if (!usuarioId)
                return res.status(401).json({ error: "No autenticado" });
            if (req.params.usuario_id && req.params.usuario_id !== usuarioId) {
                return res.status(403).json({ error: "Acceso denegado a datos de otro usuario" });
            }
            const data = await service.obtenerTrazabilidad(usuarioId);
            return res.status(200).json(data);
        }
        catch (error) {
            return res.status(500).json({ error: error?.message || "Error consultando trazabilidad" });
        }
    }
    static async obtenerDashboard(req, res) {
        try {
            const usuarioId = req.user?.usuario_id;
            if (!usuarioId)
                return res.status(401).json({ error: "No autenticado" });
            if (req.params.usuario_id && req.params.usuario_id !== usuarioId) {
                return res.status(403).json({ error: "Acceso denegado a datos de otro usuario" });
            }
            const data = await service.obtenerDashboard(usuarioId);
            return res.status(200).json(data);
        }
        catch (error) {
            return res.status(500).json({ error: error?.message || "Error obteniendo dashboard" });
        }
    }
}
exports.KananController = KananController;
