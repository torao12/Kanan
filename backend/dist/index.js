"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const databases_1 = require("./config/databases");
const kanan_controller_1 = require("./controllers/kanan.controller");
const auth_controller_1 = require("./controllers/auth.controller");
const auth_middleware_1 = require("./middleware/auth.middleware");
const kanan_service_1 = require("./services/kanan.service");
const app = (0, express_1.default)();
const PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 8000);
const orchestrator = new kanan_service_1.KananOrchestratorService();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((err, _req, res, next) => {
    if (err instanceof SyntaxError && "body" in err) {
        return res.status(400).json({
            error: "JSON malformado en el cuerpo de la solicitud",
            detalle: err.message,
        });
    }
    next(err);
});
app.get("/api/v1/health", (_req, res) => {
    res.json({
        status: "ok",
        databases: ["postgresql", "mongodb", "neo4j"],
    });
});
app.post("/api/v1/auth/register", auth_controller_1.AuthController.register);
app.post("/api/v1/auth/login", auth_controller_1.AuthController.login);
app.post("/api/v1/provisionar-ingreso", auth_middleware_1.requireAuth, kanan_controller_1.KananController.provisionarIngreso);
app.post("/api/v1/ruptura-cristal", auth_middleware_1.requireAuth, kanan_controller_1.KananController.rupturaCristal);
app.post("/api/v1/reabastecer-boveda", auth_middleware_1.requireAuth, kanan_controller_1.KananController.reabastecerBoveda);
app.post("/api/v1/vincular-cfdi", auth_middleware_1.requireAuth, kanan_controller_1.KananController.vincularCfdi);
app.post("/api/v1/reconciliar-grafo", auth_middleware_1.requireAuth, kanan_controller_1.KananController.reconciliarGrafo);
app.get("/api/v1/huerfanos", auth_middleware_1.requireAuth, kanan_controller_1.KananController.obtenerHuerfanos);
app.get("/api/v1/huerfanos/:usuario_id", auth_middleware_1.requireAuth, kanan_controller_1.KananController.obtenerHuerfanos);
app.get("/api/v1/trazabilidad", auth_middleware_1.requireAuth, kanan_controller_1.KananController.obtenerTrazabilidad);
app.get("/api/v1/trazabilidad/:usuario_id", auth_middleware_1.requireAuth, kanan_controller_1.KananController.obtenerTrazabilidad);
app.get("/api/v1/dashboard", auth_middleware_1.requireAuth, kanan_controller_1.KananController.obtenerDashboard);
app.get("/api/v1/dashboard/:usuario_id", auth_middleware_1.requireAuth, kanan_controller_1.KananController.obtenerDashboard);
(0, databases_1.initDatabases)()
    .then(() => {
    setInterval(() => {
        orchestrator.procesarColaReconciliacion().catch(() => { });
    }, 30_000);
    app.listen(PORT, () => {
        console.log(`[Kanan API] Conectada a PostgreSQL, MongoDB y Neo4j en http://localhost:${PORT}`);
    });
})
    .catch((err) => {
    console.error("[Kanan API] Error conectando a bases de datos:", err);
    process.exit(1);
});
