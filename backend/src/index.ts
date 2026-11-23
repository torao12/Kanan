import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { initDatabases } from "./config/databases";
import { KananController } from "./controllers/kanan.controller";
import { AuthController } from "./controllers/auth.controller";
import { requireAuth } from "./middleware/auth.middleware";
import { KananOrchestratorService } from "./services/kanan.service";

const app = express();
const PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 8000);
const orchestrator = new KananOrchestratorService();

app.use(cors());
app.use(express.json());

app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: "JSON malformado en el cuerpo de la solicitud",
      detalle: err.message,
    });
  }
  next(err);
});

app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    databases: ["postgresql", "mongodb", "neo4j"],
  });
});

app.post("/api/v1/auth/register", AuthController.register);
app.post("/api/v1/auth/login", AuthController.login);

app.post("/api/v1/provisionar-ingreso", requireAuth, KananController.provisionarIngreso);
app.post("/api/v1/ruptura-cristal", requireAuth, KananController.rupturaCristal);
app.post("/api/v1/reabastecer-boveda", requireAuth, KananController.reabastecerBoveda);
app.post("/api/v1/vincular-cfdi", requireAuth, KananController.vincularCfdi);
app.post("/api/v1/reconciliar-grafo", requireAuth, KananController.reconciliarGrafo);

app.get("/api/v1/huerfanos", requireAuth, KananController.obtenerHuerfanos);
app.get("/api/v1/huerfanos/:usuario_id", requireAuth, KananController.obtenerHuerfanos);
app.get("/api/v1/trazabilidad", requireAuth, KananController.obtenerTrazabilidad);
app.get("/api/v1/trazabilidad/:usuario_id", requireAuth, KananController.obtenerTrazabilidad);
app.get("/api/v1/dashboard", requireAuth, KananController.obtenerDashboard);
app.get("/api/v1/dashboard/:usuario_id", requireAuth, KananController.obtenerDashboard);

initDatabases()
  .then(() => {
    setInterval(() => {
      orchestrator.procesarColaReconciliacion().catch(() => {});
    }, 30_000);

    app.listen(PORT, () => {
      console.log(`[Kanan API] Conectada a PostgreSQL, MongoDB y Neo4j en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[Kanan API] Error conectando a bases de datos:", err);
    process.exit(1);
  });
