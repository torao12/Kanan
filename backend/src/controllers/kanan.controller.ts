import { Request, Response } from "express";
import { KananOrchestratorService } from "../services/kanan.service";

const service = new KananOrchestratorService();

export class KananController {
  static async provisionarIngreso(req: Request, res: Response) {
    try {
      const usuarioId = req.user?.usuario_id;
      if (!usuarioId) {
        return res.status(401).json({ error: "No autenticado" });
      }
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
    } catch (error: any) {
      return res.status(400).json({
        error: error?.message || "Error al provisionar ingreso",
      });
    }
  }

  static async rupturaCristal(req: Request, res: Response) {
    try {
      const usuarioId = req.user?.usuario_id;
      if (!usuarioId) {
        return res.status(401).json({ error: "No autenticado" });
      }
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
    } catch (error: any) {
      return res.status(400).json({
        error: error?.message || "Error al ejecutar ruptura de cristal",
      });
    }
  }

  static async obtenerHuerfanos(req: Request, res: Response) {
    try {
      const usuarioId = req.user?.usuario_id;
      if (!usuarioId) return res.status(401).json({ error: "No autenticado" });
      if (req.params.usuario_id && req.params.usuario_id !== usuarioId) {
        return res.status(403).json({ error: "Acceso denegado a datos de otro usuario" });
      }
      const data = await service.obtenerHuerfanos(usuarioId);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Error consultando Neo4j" });
    }
  }

  static async obtenerTrazabilidad(req: Request, res: Response) {
    try {
      const usuarioId = req.user?.usuario_id;
      if (!usuarioId) return res.status(401).json({ error: "No autenticado" });
      if (req.params.usuario_id && req.params.usuario_id !== usuarioId) {
        return res.status(403).json({ error: "Acceso denegado a datos de otro usuario" });
      }
      const data = await service.obtenerTrazabilidad(usuarioId);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Error consultando trazabilidad" });
    }
  }

  static async obtenerDashboard(req: Request, res: Response) {
    try {
      const usuarioId = req.user?.usuario_id;
      if (!usuarioId) return res.status(401).json({ error: "No autenticado" });
      if (req.params.usuario_id && req.params.usuario_id !== usuarioId) {
        return res.status(403).json({ error: "Acceso denegado a datos de otro usuario" });
      }
      const data = await service.obtenerDashboard(usuarioId);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Error obteniendo dashboard" });
    }
  }
}
