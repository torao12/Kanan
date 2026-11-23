import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pgPool } from "../config/databases";
import { signAuthToken } from "../middleware/auth.middleware";

export class AuthController {
  static async register(req: Request, res: Response) {
    const client = await pgPool.connect();
    try {
      const {
        nombre,
        email,
        password,
        rfc,
        regimen_fiscal = "RESICO",
        institucion_financiera = "BBVA",
        numero_cuenta = "0000000001",
      } = req.body;

      if (!nombre || !email || !password || !rfc) {
        return res.status(400).json({
          error: "nombre, email, password y rfc son obligatorios",
        });
      }

      if (String(password).length < 6) {
        return res.status(400).json({
          error: "La contraseña debe tener al menos 6 caracteres",
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const normalizedRfc = String(rfc).trim().toUpperCase();
      const passwordHash = await bcrypt.hash(String(password), 10);

      await client.query("BEGIN");

      const existsRes = await client.query(
        `SELECT usuario_id FROM usuario WHERE email = $1 OR rfc = $2`,
        [normalizedEmail, normalizedRfc]
      );
      if ((existsRes.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Ya existe un usuario registrado con ese correo o RFC",
        });
      }

      const userRes = await client.query(
        `INSERT INTO usuario (nombre, email, password_hash, rfc, regimen_fiscal)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING usuario_id, nombre, email, rfc, regimen_fiscal`,
        [String(nombre).trim(), normalizedEmail, passwordHash, normalizedRfc, regimen_fiscal]
      );
      const user = userRes.rows[0];

      await client.query(
        `INSERT INTO boveda_fiscal (usuario_id, saldo_reservado, deuda_interna)
         VALUES ($1, 0.00, 0.00)`,
        [user.usuario_id]
      );

      await client.query(
        `INSERT INTO regla_fiscal (usuario_id, porcentaje_iva, porcentaje_isr, activa)
         VALUES ($1, 0.1600, 0.0250, TRUE)`,
        [user.usuario_id]
      );

      await client.query(
        `INSERT INTO cuenta_bancaria (usuario_id, institucion_financiera, numero_cuenta, saldo_disponible)
         VALUES ($1, $2, $3, 0.00)`,
        [user.usuario_id, institucion_financiera, numero_cuenta]
      );

      await client.query("COMMIT");

      const token = signAuthToken({
        usuario_id: user.usuario_id,
        email: user.email,
        nombre: user.nombre,
      });

      return res.status(201).json({ token, usuario: user });
    } catch (error: any) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: error?.message || "Error al registrar usuario",
      });
    } finally {
      client.release();
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          error: "email y password son obligatorios",
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const userRes = await pgPool.query(
        `SELECT usuario_id, nombre, email, password_hash, rfc, regimen_fiscal
         FROM usuario
         WHERE email = $1`,
        [normalizedEmail]
      );

      if (userRes.rowCount === 0) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      const row = userRes.rows[0];
      const valid = await bcrypt.compare(String(password), String(row.password_hash || ""));
      if (!valid) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      const usuario = {
        usuario_id: row.usuario_id,
        nombre: row.nombre,
        email: row.email,
        rfc: row.rfc,
        regimen_fiscal: row.regimen_fiscal,
      };

      const token = signAuthToken({
        usuario_id: usuario.usuario_id,
        email: usuario.email,
        nombre: usuario.nombre,
      });

      return res.status(200).json({ token, usuario });
    } catch (error: any) {
      return res.status(500).json({
        error: error?.message || "Error al iniciar sesión",
      });
    }
  }
}
