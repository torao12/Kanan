db = db.getSiblingDB("kanan_docs");

db.webhooks_bancarios.insertMany([
  {
    webhook_id: "wh-101",
    proveedor: "BBVA_OPEN_BANKING",
    payload: {
      transaccion_id: "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380101",
      cuenta_id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
      monto: 11600.00,
      referencia: "SPEI-ACME-001"
    },
    recibido_en: new Date("2026-03-01T10:00:00Z"),
    procesado: true
  },
  {
    webhook_id: "wh-102",
    proveedor: "NU_BANK_WEBHOOK",
    payload: {
      transaccion_id: "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380102",
      cuenta_id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a45",
      monto: 5000.00,
      referencia: "SPEI-GLOBAL-002"
    },
    recibido_en: new Date("2026-03-03T14:30:00Z"),
    procesado: true
  }
]);

db.expedientes_cfdi.insertMany([
  {
    uuid_fiscal: "F1A2B3C4-1111-4000-8000-ABCDEF123456",
    rfc_emisor: "MOMI950815XXX",
    rfc_receptor: "ACME900101AB1",
    xml_raw: "<cfdi:Comprobante Version='4.0' Total='11600.00' SubTotal='10000.00' />",
    conceptos: [
      { clave_prod_serv: "81111500", cantidad: 1, descripcion: "Desarrollo API Backend", importe: 10000.00 }
    ],
    impuestos_detallados: { iva_trasladado: 1600.00, isr_retenido: 250.00 }
  },
  {
    uuid_fiscal: "E5F6G7H8-2222-4000-8000-123456ABCDEF",
    rfc_emisor: "CLOUD990101XX1",
    rfc_receptor: "MOMI950815XXX",
    xml_raw: "<cfdi:Comprobante Version='4.0' Total='1160.00' SubTotal='1000.00' />",
    conceptos: [
      { clave_prod_serv: "43231500", cantidad: 1, descripcion: "Licencia Cloud Hosting", importe: 1000.00 }
    ],
    impuestos_detallados: { iva_acreditable: 160.00 }
  }
]);

db.bitacora_boveda.insertMany([
  {
    evento_id: "evt-001",
    boveda_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    usuario_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    tipo_evento: "PROVISION_AUTOMATICA",
    monto: 1850.00,
    saldo_resultante: 1850.00,
    deuda_resultante: 0.00,
    fecha_timestamp: new Date("2026-03-01T10:00:05Z")
  },
  {
    evento_id: "evt-002",
    boveda_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    usuario_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    tipo_evento: "PROVISION_AUTOMATICA",
    monto: 797.40,
    saldo_resultante: 2647.40,
    deuda_resultante: 0.00,
    fecha_timestamp: new Date("2026-03-03T14:30:05Z")
  }
]);
