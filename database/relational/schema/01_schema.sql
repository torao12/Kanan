CREATE TYPE tipo_regimen AS ENUM ('RESICO', 'ACTIVIDAD_EMPRESARIAL', 'SERVICIOS_PROFESIONALES');
CREATE TYPE tipo_transaccion AS ENUM ('INGRESO', 'EGRESO', 'RETIRO_EMERGENCIA', 'REABASTECIMIENTO');
CREATE TYPE tipo_cfdi AS ENUM ('INGRESO', 'EGRESO');

CREATE TABLE usuario (
    usuario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rfc VARCHAR(13) NOT NULL UNIQUE,
    regimen_fiscal tipo_regimen NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_rfc_format CHECK (rfc ~* '^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$')
);

CREATE TABLE boveda_fiscal (
    boveda_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL UNIQUE REFERENCES usuario(usuario_id) ON DELETE CASCADE,
    saldo_reservado NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    deuda_interna NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    meta_ahorro NUMERIC(12,2) DEFAULT 0.00,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_saldo_reservado_positive CHECK (saldo_reservado >= 0),
    CONSTRAINT chk_deuda_interna_positive CHECK (deuda_interna >= 0)
);

CREATE TABLE regla_fiscal (
    regla_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuario(usuario_id) ON DELETE CASCADE,
    porcentaje_iva NUMERIC(5,4) NOT NULL DEFAULT 0.1600,
    porcentaje_isr NUMERIC(5,4) NOT NULL DEFAULT 0.0250,
    activa BOOLEAN DEFAULT TRUE,
    CONSTRAINT chk_porcentajes_validos CHECK (porcentaje_iva >= 0 AND porcentaje_isr >= 0)
);

CREATE TABLE cuenta_bancaria (
    cuenta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuario(usuario_id) ON DELETE CASCADE,
    institucion_financiera VARCHAR(80) NOT NULL,
    numero_cuenta VARCHAR(20) NOT NULL,
    clabe VARCHAR(18) UNIQUE,
    saldo_disponible NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT chk_saldo_cuenta_positive CHECK (saldo_disponible >= 0)
);

CREATE TABLE cliente (
    cliente_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuario(usuario_id) ON DELETE CASCADE,
    nombre_razon_social VARCHAR(150) NOT NULL,
    rfc_emisor VARCHAR(13) NOT NULL,
    email_contacto VARCHAR(150)
);

CREATE TABLE transaccion (
    transaccion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_id UUID NOT NULL REFERENCES cuenta_bancaria(cuenta_id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES cliente(cliente_id) ON DELETE SET NULL,
    monto NUMERIC(12,2) NOT NULL,
    tipo tipo_transaccion NOT NULL,
    concepto TEXT NOT NULL,
    fecha_transaccion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_monto_transaccion CHECK (monto > 0)
);

CREATE TABLE cfdi (
    cfdi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuario(usuario_id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES cliente(cliente_id) ON DELETE SET NULL,
    uuid_fiscal VARCHAR(36) NOT NULL UNIQUE,
    monto_subtotal NUMERIC(12,2) NOT NULL,
    monto_iva NUMERIC(12,2) NOT NULL,
    monto_isr NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    monto_total NUMERIC(12,2) NOT NULL,
    tipo tipo_cfdi NOT NULL,
    fecha_emision TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT chk_cfdi_montos CHECK (monto_subtotal >= 0 AND monto_total >= 0)
);

CREATE TABLE gasto (
    gasto_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuario(usuario_id) ON DELETE CASCADE,
    cfdi_id UUID UNIQUE REFERENCES cfdi(cfdi_id) ON DELETE SET NULL,
    transaccion_id UUID UNIQUE REFERENCES transaccion(transaccion_id) ON DELETE SET NULL,
    categoria VARCHAR(50) NOT NULL,
    es_deducible BOOLEAN DEFAULT TRUE,
    monto NUMERIC(12,2) NOT NULL
);
