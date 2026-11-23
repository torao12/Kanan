import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthPayload {
  usuario_id: string;
  email: string;
  nombre: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "kanan-dev-secret-change-in-prod";

export function signAuthToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Token de autenticación requerido (Authorization: Bearer <token>)",
    });
  }

  const token = authHeader.slice(7).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    if (!decoded?.usuario_id) {
      return res.status(401).json({ error: "Token inválido" });
    }
    req.user = {
      usuario_id: decoded.usuario_id,
      email: decoded.email,
      nombre: decoded.nombre,
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}
