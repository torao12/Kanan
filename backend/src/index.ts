import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { initDatabases } from "./config/databases";
import { KananController } from "./controllers/kanan.controller";

const app = express();
const PORT = Number(process.env.BACKEND_PORT || 8000);

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

app.post("/api/v1/provisionar-ingreso", KananController.provisionarIngreso);
app.post("/api/v1/ruptura-cristal", KananController.rupturaCristal);
app.get("/api/v1/huerfanos/:usuario_id", KananController.obtenerHuerfanos);
app.get("/api/v1/trazabilidad/:usuario_id", KananController.obtenerTrazabilidad);
app.get("/api/v1/dashboard/:usuario_id", KananController.obtenerDashboard);

initDatabases()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[Kanan API] Conectada a PostgreSQL, MongoDB y Neo4j en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[Kanan API] Error conectando a bases de datos:", err);
    process.exit(1);
  });
