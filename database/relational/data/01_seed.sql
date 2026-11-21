INSERT INTO usuario (usuario_id, nombre, email, rfc, regimen_fiscal)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Ian Morales', 'ian@kanan.dev', 'MOMI950815XXX', 'RESICO');

INSERT INTO boveda_fiscal (boveda_id, usuario_id, saldo_reservado, deuda_interna)
VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2647.40, 0.00);

INSERT INTO regla_fiscal (regla_id, usuario_id, porcentaje_iva, porcentaje_isr, activa)
VALUES ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 0.1600, 0.0250, TRUE);

INSERT INTO cuenta_bancaria (cuenta_id, usuario_id, institucion_financiera, numero_cuenta, clabe, saldo_disponible)
VALUES
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'BBVA', '1234567890', '012180012345678901', 10440.00),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a45', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Nu', '0987654321', '638180009876543212', 5000.00);

INSERT INTO cliente (cliente_id, usuario_id, nombre_razon_social, rfc_emisor, email_contacto)
VALUES
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Acme Corp', 'ACME900101AB1', 'pagos@acmecorp.mx'),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a56', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Global Tech', 'GLOB800202CD2', 'finanzas@globaltech.mx');

INSERT INTO transaccion (transaccion_id, cuenta_id, cliente_id, monto, tipo, concepto, fecha_transaccion)
VALUES
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380101', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 11600.00, 'INGRESO', 'Desarrollo API Backend', '2026-03-01T10:00:00Z'),
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380102', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a45', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a56', 5000.00, 'INGRESO', 'Consultoría Arquitectura (Sin CFDI)', '2026-03-03T14:30:00Z'),
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380103', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', NULL, 1160.00, 'EGRESO', 'Licencia Cloud Hosting', '2026-03-04T09:15:00Z');

INSERT INTO cfdi (cfdi_id, usuario_id, cliente_id, uuid_fiscal, monto_subtotal, monto_iva, monto_isr, monto_total, tipo, fecha_emision)
VALUES
  ('11eebc99-9c0b-4ef8-bb6d-6bb9bd380501', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'F1A2B3C4-1111-4000-8000-ABCDEF123456', 10000.00, 1600.00, 250.00, 11600.00, 'INGRESO', '2026-03-01T10:05:00Z'),
  ('11eebc99-9c0b-4ef8-bb6d-6bb9bd380502', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'E5F6G7H8-2222-4000-8000-123456ABCDEF', 1000.00, 160.00, 0.00, 1160.00, 'EGRESO', '2026-03-04T09:20:00Z');

INSERT INTO gasto (gasto_id, usuario_id, cfdi_id, transaccion_id, categoria, es_deducible, monto)
VALUES ('22eebc99-9c0b-4ef8-bb6d-6bb9bd380301', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380502', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380103', 'Software', TRUE, 1160.00);
