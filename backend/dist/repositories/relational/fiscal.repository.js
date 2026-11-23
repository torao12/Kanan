"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationalFiscalRepository = void 0;
const databases_1 = require("../../config/databases");
class RelationalFiscalRepository {
    async provisionarIngreso(params) {
        const client = await databases_1.pgPool.connect();
        try {
            await client.query("BEGIN");
            const cuentaRes = await client.query(`SELECT cuenta_id, usuario_id
         FROM cuenta_bancaria
         WHERE cuenta_id = $1 AND usuario_id = $2
         FOR UPDATE`, [params.cuenta_id, params.usuario_id]);
            if (cuentaRes.rowCount === 0) {
                throw new Error("Cuenta bancaria no encontrada o no pertenece al usuario autenticado");
            }
            const usuarioId = cuentaRes.rows[0].usuario_id;
            const reglaRes = await client.query(`SELECT regla_id, porcentaje_iva, porcentaje_isr
         FROM regla_fiscal
         WHERE usuario_id = $1 AND activa = TRUE
         LIMIT 1`, [usuarioId]);
            const reglaId = reglaRes.rows[0]?.regla_id || "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
            const pctIva = Number(reglaRes.rows[0]?.porcentaje_iva ?? 0.16);
            const pctIsr = Number(reglaRes.rows[0]?.porcentaje_isr ?? 0.025);
            const subtotal = Number((params.monto / (1 + pctIva)).toFixed(2));
            const ivaRetenido = Number((params.monto - subtotal).toFixed(2));
            const isrRetenido = Number((subtotal * pctIsr).toFixed(2));
            const totalRetenido = Number((ivaRetenido + isrRetenido).toFixed(2));
            const montoNeto = Number((params.monto - totalRetenido).toFixed(2));
            const txRes = await client.query(`INSERT INTO transaccion (cuenta_id, cliente_id, monto, tipo, concepto)
         VALUES ($1, $2, $3, 'INGRESO', $4)
         RETURNING transaccion_id, fecha_transaccion`, [params.cuenta_id, params.cliente_id || null, params.monto, params.concepto]);
            const transaccionId = txRes.rows[0].transaccion_id;
            const fecha = new Date(txRes.rows[0].fecha_transaccion)
                .toISOString()
                .slice(0, 10);
            await client.query(`UPDATE cuenta_bancaria
         SET saldo_disponible = saldo_disponible + $1
         WHERE cuenta_id = $2`, [montoNeto, params.cuenta_id]);
            const bovedaRes = await client.query(`UPDATE boveda_fiscal
         SET saldo_reservado = saldo_reservado + $1,
             actualizado_en = CURRENT_TIMESTAMP
         WHERE usuario_id = $2
         RETURNING boveda_id, saldo_reservado, deuda_interna`, [totalRetenido, usuarioId]);
            if (bovedaRes.rowCount === 0) {
                throw new Error("Bóveda fiscal no encontrada para el usuario");
            }
            await client.query("COMMIT");
            return {
                transaccion_id: transaccionId,
                usuario_id: usuarioId,
                boveda_id: bovedaRes.rows[0].boveda_id,
                regla_id: reglaId,
                monto_bruto: params.monto,
                iva_retenido: ivaRetenido,
                isr_retenido: isrRetenido,
                total_retenido: totalRetenido,
                monto_neto_disponible: montoNeto,
                saldo_reservado_boveda: Number(bovedaRes.rows[0].saldo_reservado),
                deuda_interna_boveda: Number(bovedaRes.rows[0].deuda_interna),
                fecha,
            };
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    async ejecutarRupturaCristal(params) {
        const client = await databases_1.pgPool.connect();
        try {
            await client.query("BEGIN");
            const bovedaRes = await client.query(`UPDATE boveda_fiscal
         SET saldo_reservado = saldo_reservado - $1,
             deuda_interna = deuda_interna + $1,
             actualizado_en = CURRENT_TIMESTAMP
         WHERE usuario_id = $2
         RETURNING boveda_id, saldo_reservado, deuda_interna`, [params.monto, params.usuario_id]);
            if (bovedaRes.rowCount === 0) {
                throw new Error("Bóveda fiscal no encontrada");
            }
            const cuentaRes = await client.query(`SELECT cuenta_id FROM cuenta_bancaria WHERE usuario_id = $1 LIMIT 1`, [params.usuario_id]);
            if (cuentaRes.rowCount && cuentaRes.rowCount > 0) {
                await client.query(`INSERT INTO transaccion (cuenta_id, monto, tipo, concepto)
           VALUES ($1, $2, 'RETIRO_EMERGENCIA', $3)`, [
                    cuentaRes.rows[0].cuenta_id,
                    params.monto,
                    `Ruptura de Cristal: ${params.justificacion}`,
                ]);
            }
            await client.query("COMMIT");
            return {
                boveda_id: bovedaRes.rows[0].boveda_id,
                usuario_id: params.usuario_id,
                monto_retirado: params.monto,
                saldo_restante: Number(bovedaRes.rows[0].saldo_reservado),
                deuda_generada: Number(bovedaRes.rows[0].deuda_interna),
            };
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    async reabastecerBoveda(params) {
        const client = await databases_1.pgPool.connect();
        try {
            await client.query("BEGIN");
            const cuentaRes = await client.query(`UPDATE cuenta_bancaria
         SET saldo_disponible = saldo_disponible - $1
         WHERE cuenta_id = $2 AND usuario_id = $3
         RETURNING cuenta_id, saldo_disponible`, [params.monto, params.cuenta_id, params.usuario_id]);
            if (cuentaRes.rowCount === 0) {
                throw new Error("Cuenta bancaria no encontrada o saldo insuficiente");
            }
            const bovedaRes = await client.query(`UPDATE boveda_fiscal
         SET saldo_reservado = saldo_reservado + $1,
             deuda_interna = GREATEST(0, deuda_interna - $1),
             actualizado_en = CURRENT_TIMESTAMP
         WHERE usuario_id = $2
         RETURNING boveda_id, saldo_reservado, deuda_interna`, [params.monto, params.usuario_id]);
            if (bovedaRes.rowCount === 0) {
                throw new Error("Bóveda fiscal no encontrada");
            }
            await client.query(`INSERT INTO transaccion (cuenta_id, monto, tipo, concepto)
         VALUES ($1, $2, 'REABASTECIMIENTO', $3)`, [
                params.cuenta_id,
                params.monto,
                params.justificacion || "Reabastecimiento de deuda interna en bóveda fiscal",
            ]);
            await client.query("COMMIT");
            return {
                boveda_id: bovedaRes.rows[0].boveda_id,
                usuario_id: params.usuario_id,
                monto_abonado: params.monto,
                saldo_reservado: Number(bovedaRes.rows[0].saldo_reservado),
                deuda_restante: Number(bovedaRes.rows[0].deuda_interna),
                saldo_cuenta_restante: Number(cuentaRes.rows[0].saldo_disponible),
            };
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    async vincularCfdiTransaccion(params) {
        const client = await databases_1.pgPool.connect();
        try {
            await client.query("BEGIN");
            const txRes = await client.query(`SELECT t.transaccion_id, t.cliente_id, t.monto, t.tipo
         FROM transaccion t
         JOIN cuenta_bancaria c ON c.cuenta_id = t.cuenta_id
         WHERE t.transaccion_id = $1 AND c.usuario_id = $2
         FOR UPDATE`, [params.transaccion_id, params.usuario_id]);
            if (txRes.rowCount === 0) {
                throw new Error("Transacción no encontrada para el usuario autenticado");
            }
            const tx = txRes.rows[0];
            if (tx.tipo !== "INGRESO") {
                throw new Error("Solo se pueden vincular comprobantes de ingreso a depósitos");
            }
            const montoTotal = Number(tx.monto);
            const subtotal = Number((montoTotal / 1.16).toFixed(2));
            const montoIva = Number((montoTotal - subtotal).toFixed(2));
            const montoIsr = Number((subtotal * 0.025).toFixed(2));
            const fechaEmision = new Date().toISOString();
            const cfdiRes = await client.query(`INSERT INTO cfdi (
           usuario_id, cliente_id, uuid_fiscal, monto_subtotal, monto_iva, monto_isr, monto_total, tipo, fecha_emision
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'INGRESO', $8)
         RETURNING cfdi_id`, [
                params.usuario_id,
                tx.cliente_id || null,
                params.uuid_fiscal.trim().toUpperCase(),
                subtotal,
                montoIva,
                montoIsr,
                montoTotal,
                fechaEmision,
            ]);
            await client.query("COMMIT");
            return {
                cfdi_id: cfdiRes.rows[0].cfdi_id,
                transaccion_id: params.transaccion_id,
                usuario_id: params.usuario_id,
                uuid_fiscal: params.uuid_fiscal.trim().toUpperCase(),
                monto_subtotal: subtotal,
                monto_iva: montoIva,
                monto_isr: montoIsr,
                monto_total: montoTotal,
                fecha_emision: fechaEmision,
            };
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    async obtenerResumenUsuario(usuario_id) {
        const userRes = await databases_1.pgPool.query(`SELECT usuario_id, nombre, email, rfc, regimen_fiscal FROM usuario WHERE usuario_id = $1`, [usuario_id]);
        const bovedaRes = await databases_1.pgPool.query(`SELECT boveda_id, saldo_reservado, deuda_interna, (saldo_reservado - deuda_interna) AS balance_neto_boveda
       FROM boveda_fiscal WHERE usuario_id = $1`, [usuario_id]);
        const cuentasRes = await databases_1.pgPool.query(`SELECT cuenta_id, institucion_financiera, numero_cuenta, clabe, saldo_disponible
       FROM cuenta_bancaria WHERE usuario_id = $1`, [usuario_id]);
        const clientesRes = await databases_1.pgPool.query(`SELECT cliente_id, nombre_razon_social, rfc_emisor
       FROM cliente WHERE usuario_id = $1 ORDER BY nombre_razon_social ASC`, [usuario_id]);
        const txRes = await databases_1.pgPool.query(`SELECT t.transaccion_id, t.monto, t.tipo, t.concepto, t.fecha_transaccion, c.institucion_financiera
       FROM transaccion t
       JOIN cuenta_bancaria c ON c.cuenta_id = t.cuenta_id
       WHERE c.usuario_id = $1
       ORDER BY t.fecha_transaccion DESC
       LIMIT 15`, [usuario_id]);
        return {
            usuario: userRes.rows[0] || null,
            boveda: bovedaRes.rows[0] || null,
            cuentas: cuentasRes.rows,
            clientes: clientesRes.rows,
            transacciones_recientes: txRes.rows,
        };
    }
}
exports.RelationalFiscalRepository = RelationalFiscalRepository;
