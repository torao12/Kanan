import { neo4jDriver } from "../../config/databases";

export class GraphLineageRepository {
  async registrarProvisionEnGrafo(params: {
    transaccion_id: string;
    cuenta_id: string;
    boveda_id: string;
    regla_id: string;
    cliente_id?: string | null;
    monto: number;
    iva_retenido: number;
    isr_retenido: number;
    total_retenido: number;
    saldo_reservado_boveda: number;
    fecha: string;
  }): Promise<void> {
    const session = neo4jDriver.session();
    try {
      await session.run(
        `
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
        `,
        {
          ...params,
          cliente_id: params.cliente_id || null,
        }
      );
    } finally {
      await session.close();
    }
  }

  async obtenerDepositosHuerfanos(usuario_id: string) {
    const session = neo4jDriver.session();
    try {
      const result = await session.run(
        `
        MATCH (u:Usuario {usuario_id: $usuario_id})-[:ES_DUEÑO_DE]->(cb:CuentaBancaria)<-[:RECIBIDA_EN]-(t:Transaccion)
        WHERE t.tipo = 'INGRESO' AND NOT (t)-[:COMPROBADA_POR]->(:CFDI)
        RETURN t.transaccion_id AS transaccion_id,
               t.monto AS monto,
               t.fecha AS fecha,
               cb.institucion AS banco
        ORDER BY t.fecha DESC
        `,
        { usuario_id }
      );
      return result.records.map((rec) => ({
        transaccion_id: rec.get("transaccion_id"),
        monto: Number(rec.get("monto")),
        fecha: rec.get("fecha"),
        banco: rec.get("banco"),
      }));
    } finally {
      await session.close();
    }
  }

  async obtenerTrazabilidad(usuario_id: string) {
    const session = neo4jDriver.session();
    try {
      const result = await session.run(
        `
        MATCH (u:Usuario {usuario_id: $usuario_id})
        OPTIONAL MATCH (u)-[r1:TIENE_BOVEDA|CONFIGURA|ES_DUEÑO_DE]->(n1)
        OPTIONAL MATCH (n1)<-[r2:RECIBIDA_EN|FONDEA|APLICA_REGLA]-(t:Transaccion)
        OPTIONAL MATCH (t)-[r3:COMPROBADA_POR]->(f:CFDI)
        OPTIONAL MATCH (cli:Cliente)-[r4:EMITE|ORIGINA_PAGO]->(target)
        WHERE target = t OR target = f
        RETURN u, r1, n1, r2, t, r3, f, cli, r4
        `,
        { usuario_id }
      );

      const nodesMap = new Map<string, { id: string; label: string; properties: Record<string, unknown> }>();
      const edgesMap = new Map<string, { id: string; source: string; target: string; type: string; properties: Record<string, unknown> }>();

      const addNode = (node: any) => {
        if (!node) return;
        const id = node.elementId;
        if (!nodesMap.has(id)) {
          nodesMap.set(id, {
            id,
            label: node.labels[0] || "Node",
            properties: node.properties,
          });
        }
      };

      const addEdge = (rel: any) => {
        if (!rel) return;
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
    } finally {
      await session.close();
    }
  }
}
