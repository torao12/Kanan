"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphLineageRepository = void 0;
const databases_1 = require("../../config/databases");
class GraphLineageRepository {
    async registrarProvisionEnGrafo(params) {
        const session = databases_1.neo4jDriver.session();
        try {
            await session.run(`
        MATCH (cb:CuentaBancaria {cuenta_id: $cuenta_id})
        MATCH (b:BovedaFiscal {boveda_id: $boveda_id})
        MATCH (r:ReglaFiscal {regla_id: $regla_id})
        MERGE (t:Transaccion {transaccion_id: $transaccion_id})
        SET t.monto = $monto, t.tipo = 'INGRESO', t.fecha = $fecha
        MERGE (t)-[:RECIBIDA_EN]->(cb)
        MERGE (t)-[ar:APLICA_REGLA]->(r)
        SET ar.monto_iva_retenido = $iva_retenido, ar.monto_isr_retenido = $isr_retenido
        MERGE (t)-[fn:FONDEA]->(b)
        SET fn.monto_retencion_total = $total_retenido
        SET b.saldo_reservado = $saldo_reservado_boveda
        WITH t
        OPTIONAL MATCH (cli:Cliente {cliente_id: $cliente_id})
        FOREACH (_ IN CASE WHEN cli IS NOT NULL THEN [1] ELSE [] END |
          MERGE (cli)-[:ORIGINA_PAGO {nivel_certeza: 'ALTO'}]->(t)
        )
        `, {
                ...params,
                cliente_id: params.cliente_id || null,
            });
        }
        finally {
            await session.close();
        }
    }
    async vincularCfdiEnGrafo(params) {
        const session = databases_1.neo4jDriver.session();
        try {
            await session.run(`
        MATCH (t:Transaccion {transaccion_id: $transaccion_id})
        MERGE (f:CFDI {cfdi_id: $cfdi_id})
        SET f.uuid_fiscal = $uuid_fiscal,
            f.monto_total = $monto_total,
            f.fecha_emision = $fecha_emision,
            f.tipo = 'INGRESO'
        MERGE (t)-[:COMPROBADA_POR {vinculado_en: $fecha_emision}]->(f)
        `, params);
        }
        finally {
            await session.close();
        }
    }
    async obtenerDepositosHuerfanos(usuario_id) {
        const session = databases_1.neo4jDriver.session();
        try {
            const result = await session.run(`
        MATCH (u:Usuario {usuario_id: $usuario_id})-[:ES_DUEÑO_DE]->(cb:CuentaBancaria)<-[:RECIBIDA_EN]-(t:Transaccion)
        WHERE t.tipo = 'INGRESO' AND NOT (t)-[:COMPROBADA_POR]->(:CFDI)
        RETURN t.transaccion_id AS transaccion_id,
               t.monto AS monto,
               t.fecha AS fecha,
               cb.institucion AS banco
        ORDER BY t.fecha DESC
        `, { usuario_id });
            return result.records.map((rec) => ({
                transaccion_id: rec.get("transaccion_id"),
                monto: Number(rec.get("monto")),
                fecha: rec.get("fecha"),
                banco: rec.get("banco"),
            }));
        }
        finally {
            await session.close();
        }
    }
    async obtenerTrazabilidad(usuario_id) {
        const session = databases_1.neo4jDriver.session();
        try {
            const result = await session.run(`
        MATCH (u:Usuario {usuario_id: $usuario_id})
        OPTIONAL MATCH (u)-[r1:TIENE_BOVEDA|CONFIGURA|ES_DUEÑO_DE]->(n1)
        OPTIONAL MATCH (n1)<-[r2:RECIBIDA_EN|FONDEA|APLICA_REGLA]-(t:Transaccion)
        OPTIONAL MATCH (t)-[r3:COMPROBADA_POR]->(f:CFDI)
        OPTIONAL MATCH (cli:Cliente)-[r4:EMITE|ORIGINA_PAGO]->(target)
        WHERE target = t OR target = f
        RETURN u, r1, n1, r2, t, r3, f, cli, r4
        `, { usuario_id });
            const nodesMap = new Map();
            const edgesMap = new Map();
            const addNode = (node) => {
                if (!node)
                    return;
                const id = node.elementId;
                if (!nodesMap.has(id)) {
                    nodesMap.set(id, {
                        id,
                        label: node.labels[0] || "Node",
                        properties: node.properties,
                    });
                }
            };
            const addEdge = (rel) => {
                if (!rel)
                    return;
                const id = rel.elementId;
                if (!edgesMap.has(id)) {
                    edgesMap.set(id, {
                        id,
                        source: rel.startNodeElementId,
                        target: rel.endNodeElementId,
                        type: rel.type,
                        properties: rel.properties,
                    });
                }
            };
            for (const record of result.records) {
                addNode(record.get("u"));
                addNode(record.get("n1"));
                addNode(record.get("t"));
                addNode(record.get("f"));
                addNode(record.get("cli"));
                addEdge(record.get("r1"));
                addEdge(record.get("r2"));
                addEdge(record.get("r3"));
                addEdge(record.get("r4"));
            }
            return {
                nodes: Array.from(nodesMap.values()),
                edges: Array.from(edgesMap.values()),
            };
        }
        finally {
            await session.close();
        }
    }
}
exports.GraphLineageRepository = GraphLineageRepository;
