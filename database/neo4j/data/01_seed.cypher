MERGE (u:Usuario {usuario_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", rfc: "MOMI950815XXX", nombre: "Ian Morales"})
MERGE (b:BovedaFiscal {boveda_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22", saldo_reservado: 2647.40})
MERGE (u)-[:TIENE_BOVEDA]->(b)

MERGE (r:ReglaFiscal {regla_id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33", porcentaje_iva: 0.16, porcentaje_isr: 0.025})
MERGE (u)-[:CONFIGURA]->(r)

MERGE (cb1:CuentaBancaria {cuenta_id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44", institucion: "BBVA", numero_cuenta: "1234567890"})
MERGE (cb2:CuentaBancaria {cuenta_id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a45", institucion: "Nu", numero_cuenta: "0987654321"})
MERGE (u)-[:ES_DUEÑO_DE]->(cb1)
MERGE (u)-[:ES_DUEÑO_DE]->(cb2)

MERGE (cli1:Cliente {cliente_id: "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55", rfc: "ACME900101AB1", nombre: "Acme Corp"})
MERGE (cli2:Cliente {cliente_id: "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a56", rfc: "GLOB800202CD2", nombre: "Global Tech"})

MERGE (t1:Transaccion {transaccion_id: "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380101", monto: 11600.00, tipo: "INGRESO", fecha: "2026-03-01"})
MERGE (f1:CFDI {cfdi_id: "11eebc99-9c0b-4ef8-bb6d-6bb9bd380501", uuid_fiscal: "F1A2B3C4-1111-4000-8000-ABCDEF123456", monto_total: 11600.00, fecha: "2026-03-01"})
MERGE (cli1)-[:EMITE]->(f1)
MERGE (cli1)-[:ORIGINA_PAGO {nivel_certeza: "ALTO"}]->(t1)
MERGE (t1)-[:RECIBIDA_EN]->(cb1)
MERGE (t1)-[:COMPROBADA_POR {monto_aplicado: 11600.00}]->(f1)
MERGE (t1)-[:APLICA_REGLA {monto_iva_retenido: 1600.00, monto_isr_retenido: 250.00}]->(r)
MERGE (t1)-[:FONDEA {monto_retencion_total: 1850.00}]->(b)

MERGE (t2:Transaccion {transaccion_id: "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380102", monto: 5000.00, tipo: "INGRESO", fecha: "2026-03-03"})
MERGE (cli2)-[:ORIGINA_PAGO {nivel_certeza: "MEDIO"}]->(t2)
MERGE (t2)-[:RECIBIDA_EN]->(cb2)
MERGE (t2)-[:APLICA_REGLA {monto_iva_retenido: 689.65, monto_isr_retenido: 107.75}]->(r)
MERGE (t2)-[:FONDEA {monto_retencion_total: 797.40}]->(b)

MERGE (g1:Gasto {gasto_id: "22eebc99-9c0b-4ef8-bb6d-6bb9bd380301", categoria: "Software", monto: 1160.00})
MERGE (t3:Transaccion {transaccion_id: "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380103", monto: 1160.00, tipo: "EGRESO", fecha: "2026-03-04"})
MERGE (f2:CFDI {cfdi_id: "11eebc99-9c0b-4ef8-bb6d-6bb9bd380502", uuid_fiscal: "E5F6G7H8-2222-4000-8000-123456ABCDEF", monto_total: 1160.00, fecha: "2026-03-04"})
MERGE (g1)-[:REALIZADO_CON]->(t3)
MERGE (t3)-[:RECIBIDA_EN]->(cb1)
MERGE (g1)-[:COMPROBADO_POR]->(f2);
