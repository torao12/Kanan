"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAuthToken = signAuthToken;
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "kanan-dev-secret-change-in-prod";
function signAuthToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Token de autenticación requerido (Authorization: Bearer <token>)",
        });
    }
    const token = authHeader.slice(7).trim();
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!decoded?.usuario_id) {
            return res.status(401).json({ error: "Token inválido" });
        }
        req.user = {
            usuario_id: decoded.usuario_id,
            email: decoded.email,
            nombre: decoded.nombre,
        };
        return next();
    }
    catch {
        return res.status(401).json({ error: "Token inválido o expirado" });
    }
}
