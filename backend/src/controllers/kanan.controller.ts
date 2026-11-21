import { Request, Response } from "express";
import { KananOrchestratorService } from "../services/kanan.service";

const service = new KananOrchestratorService();

export class KananController {
  static async provisionarIngreso(req: Request, res: Response) {
    try {
      const { cuenta_id, cliente_id, monto, concepto, proveedor, simular_fallo_neo4j } = req.body;
      if (!cuenta_id || typeof monto !== "number" || monto <= 0 || !concepto) {
        return res.status(400).json({
          error: "Payload inválido: cuenta_id, monto (> 0) y concepto son obligatorios",
        });
      }
      const result = await service.provisionarIngreso({
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
      const { usuario_id, monto, justificacion } = req.body;
      if (!usuario_id || typeof monto !== "number" || monto <= 0 || !justificacion) {
        return res.status(400).json({
          error: "Payload inválido: usuario_id, monto (> 0) y justificacion son obligatorios",
        });
      }
      const result = await service.rupturaCristal({
        usuario_id,
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
      const usuario_id = String(req.params.usuario_id);
      const data = await service.obtenerHuerfanos(usuario_id);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Error consultando Neo4j" });
    }
  }

  static async obtenerTrazabilidad(req: Request, res: Response) {
    try {
      const usuario_id = String(req.params.usuario_id);
      const data = await service.obtenerTrazabilidad(usuario_id);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Error consultando trazabilidad" });
    }
  }

  static async obtenerDashboard(req: Request, res: Response) {
    try {
      const usuario_id = String(req.params.usuario_id);
      const data = await service.obtenerDashboard(usuario_id);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Error obteniendo dashboard" });
    }
  }
}
