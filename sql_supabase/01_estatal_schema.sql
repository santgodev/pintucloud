-- ==========================================
-- 01_ESTRUCTURA_Y_ESQUEMA (DDL)
-- ==========================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('admin_distribuidor', 'asesor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLAS NÚCLEO
CREATE TABLE IF NOT EXISTS public.distribuidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_comercial TEXT NOT NULL,
    nit TEXT UNIQUE NOT NULL,
    estado BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bodegas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribuidor_id UUID NOT NULL REFERENCES public.distribuidores(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    codigo TEXT NOT NULL,
    direccion TEXT,
    ubicacion GEOGRAPHY(POINT),
    activo BOOLEAN DEFAULT true,
    maneja_inventario BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    distribuidor_id UUID NOT NULL REFERENCES public.distribuidores(id),
    rol rol_usuario NOT NULL DEFAULT 'asesor',
    bodega_asignada_id UUID REFERENCES public.bodegas(id),
    nombre_completo TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_asesor_bodega CHECK (
        (rol = 'asesor' AND bodega_asignada_id IS NOT NULL) OR (rol = 'admin_distribuidor')
    )
);

CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribuidor_id UUID NOT NULL REFERENCES public.distribuidores(id),
    sku TEXT NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    imagen_url TEXT,
    precio_base NUMERIC(12,2) NOT NULL DEFAULT 0,
    unidad_medida TEXT DEFAULT 'UN',
    featured BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(distribuidor_id, sku)
);

CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribuidor_id UUID NOT NULL REFERENCES public.distribuidores(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    nit_cc TEXT,
    direccion TEXT,
    telefono TEXT,
    email TEXT,
    zona TEXT,
    ciudad TEXT,
    ultima_compra TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventario_bodega (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bodega_id UUID NOT NULL REFERENCES public.bodegas(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    cantidad NUMERIC(12,2) NOT NULL DEFAULT 0,
    minimo_stock NUMERIC(12,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bodega_id, producto_id)
);

-- 4. VENTAS Y CARTERA
CREATE TABLE IF NOT EXISTS public.ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribuidor_id UUID NOT NULL REFERENCES public.distribuidores(id),
    cliente_id UUID REFERENCES public.clientes(id),
    usuario_id UUID REFERENCES public.usuarios(id),
    bodega_id UUID REFERENCES public.bodegas(id),
    fecha TIMESTAMPTZ DEFAULT NOW(),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    impuestos NUMERIC(12,2) NOT NULL DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    metodo_pago TEXT NOT NULL DEFAULT 'EFECTIVO',
    estado TEXT DEFAULT 'BORRADOR', -- BORRADOR, COMPLETADA, ANULADA
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.detalle_ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id),
    cantidad NUMERIC(12,2) NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
    descuento NUMERIC(12,2) DEFAULT 0,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.abonos_cartera (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id),
    distribuidor_id UUID NOT NULL REFERENCES public.distribuidores(id),
    monto NUMERIC(12,2) NOT NULL,
    metodo_pago TEXT NOT NULL,
    fecha_pago TIMESTAMPTZ DEFAULT NOW(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COMPRAS Y PROVEEDORES
CREATE TABLE IF NOT EXISTS public.proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribuidor_id UUID NOT NULL REFERENCES public.distribuidores(id),
    nombre TEXT NOT NULL,
    nit TEXT,
    contacto TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribuidor_id UUID NOT NULL REFERENCES public.distribuidores(id),
    proveedor_id UUID REFERENCES public.proveedores(id),
    bodega_id UUID REFERENCES public.bodegas(id),
    numero_factura TEXT,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado TEXT DEFAULT 'BORRADOR', -- BORRADOR, CONFIRMADA, ANULADA
    fecha_anulacion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.compras_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id),
    cantidad NUMERIC(12,2) NOT NULL,
    precio_costo NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cuentas_por_pagar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
    proveedor_id UUID NOT NULL REFERENCES public.proveedores(id),
    distribuidor_id UUID NOT NULL REFERENCES public.distribuidores(id),
    monto_total NUMERIC(12,2) NOT NULL,
    saldo_actual NUMERIC(12,2) NOT NULL,
    estado TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, PARCIAL, PAGADA
    fecha_limite DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pagos_proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID NOT NULL REFERENCES public.compras(id),
    proveedor_id UUID NOT NULL REFERENCES public.proveedores(id),
    distribuidor_id UUID NOT NULL REFERENCES public.distribuidores(id),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
    monto NUMERIC(12,2) NOT NULL,
    metodo_pago TEXT NOT NULL,
    fecha_pago DATE DEFAULT CURRENT_DATE,
    observacion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AUDITORÍA Y OTROS
CREATE TABLE IF NOT EXISTS public.auditoria_usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id),
    admin_id UUID REFERENCES public.usuarios(id),
    accion TEXT NOT NULL,
    detalles JSONB,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES public.productos(id),
    bodega_id UUID NOT NULL REFERENCES public.bodegas(id),
    tipo_movimiento TEXT NOT NULL, -- VENTA, COMPRA, AJUSTE, TRASLADO, ANULACION
    cantidad NUMERIC(12,2) NOT NULL,
    referencia_id UUID, -- ID de Venta o Compra
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_ventas_distribuidor ON public.ventas(distribuidor_id);
CREATE INDEX IF NOT EXISTS idx_compras_distribuidor ON public.compras(distribuidor_id);
CREATE INDEX IF NOT EXISTS idx_inventario_bodega ON public.inventario_bodega(bodega_id);
CREATE INDEX IF NOT EXISTS idx_productos_distribuidor ON public.productos(distribuidor_id);
