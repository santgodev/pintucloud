-- ==========================================
-- SISTEMA DE GESTIÓN DE INVENTARIOS SAAS
-- Script de Configuración de Base de Datos
-- ==========================================

-- 1. CONFIGURACIÓN INICIAL
-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Habilitar extensión para Geoespacial (PostGIS)
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Crear Enum para roles
-- Crear Enum para roles (Idempotente)
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('admin_distribuidor', 'asesor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- 2. CREACIÓN DE TABLAS (DDL)
-- ==========================================

-- Tabla: Distribuidores (Tenants)
CREATE TABLE IF NOT EXISTS public.distribuidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_comercial TEXT NOT NULL,
    nit TEXT UNIQUE NOT NULL,
    estado BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: Bodegas
CREATE TABLE IF NOT EXISTS public.bodegas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribuidor_id UUID NOT NULL REFERENCES public.distribuidores(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    codigo TEXT NOT NULL,
    direccion TEXT,
    ubicacion GEOGRAPHY(POINT),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: Usuarios (Perfil extrendido de auth.users)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    distribuidor_id UUID NOT NULL REFERENCES public.distribuidores(id),
    rol rol_usuario NOT NULL DEFAULT 'asesor',
    bodega_asignada_id UUID REFERENCES public.bodegas(id),
    nombre_completo TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_asesor_bodega CHECK (
        (rol = 'asesor' AND bodega_asignada_id IS NOT NULL) OR 
        (rol = 'admin_distribuidor')
    )
);

-- Tabla: Productos (Catálogo)
CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    imagen_url TEXT,
    precio_base NUMERIC(12,2) NOT NULL DEFAULT 0,
    unidad_medida TEXT DEFAULT 'UN',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: Clientes (Cartera)
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribuidor_id UUID NOT NULL REFERENCES public.distribuidores(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    email TEXT,
    zona TEXT, -- 'Norte', 'Sur', etc.
    ultima_compra TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: Inventario (Relación Bodega-Producto)
CREATE TABLE IF NOT EXISTS public.inventario_bodega (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bodega_id UUID NOT NULL REFERENCES public.bodegas(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id),
    cantidad NUMERIC(12,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(bodega_id, producto_id)
);

-- Tabla: Ventas (Cabecera)
CREATE TABLE IF NOT EXISTS public.ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribuidor_id UUID NOT NULL REFERENCES public.distribuidores(id),
    cliente_id UUID REFERENCES public.clientes(id),
    usuario_id UUID REFERENCES public.usuarios(id), -- Vendedor
    fecha TIMESTAMPTZ DEFAULT NOW(),
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado TEXT DEFAULT 'completado', -- 'pendiente', 'completado', 'cancelado'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: Detalle Ventas
CREATE TABLE IF NOT EXISTS public.detalle_ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id),
    cantidad NUMERIC(12,2) NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ==========================================
-- 3. ÍNDICES DE RENDIMIENTO
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_bodegas_distribuidor ON public.bodegas(distribuidor_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_distribuidor ON public.usuarios(distribuidor_id);
CREATE INDEX IF NOT EXISTS idx_inventario_bodega ON public.inventario_bodega(bodega_id);
CREATE INDEX IF NOT EXISTS idx_inventario_producto ON public.inventario_bodega(producto_id);

-- ==========================================
-- 4. SEGURIDAD (ROW LEVEL SECURITY)
-- ==========================================

-- Habilitar RLS (Idempotente)
ALTER TABLE public.distribuidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bodegas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_bodega ENABLE ROW LEVEL SECURITY;

-- Funciones Helper (Security Definer) para optimizar políticas
CREATE OR REPLACE FUNCTION get_my_distribuidor_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER AS $$
  SELECT distribuidor_id FROM public.usuarios WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS rol_usuario LANGUAGE sql SECURITY DEFINER AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_assigned_bodega()
RETURNS UUID LANGUAGE sql SECURITY DEFINER AS $$
  SELECT bodega_asignada_id FROM public.usuarios WHERE id = auth.uid();
$$;

-- POLÍTICAS

-- A. Distribuidores
DROP POLICY IF EXISTS "Ver propio distribuidor" ON public.distribuidores;
CREATE POLICY "Ver propio distribuidor" ON public.distribuidores
FOR SELECT USING (id = get_my_distribuidor_id());

-- B. Bodegas
DROP POLICY IF EXISTS "Admin gestiona bodegas" ON public.bodegas;
CREATE POLICY "Admin gestiona bodegas" ON public.bodegas
USING (
  distribuidor_id = get_my_distribuidor_id() 
  AND get_my_role() = 'admin_distribuidor'
);

DROP POLICY IF EXISTS "Asesor ve su bodega" ON public.bodegas;
CREATE POLICY "Asesor ve su bodega" ON public.bodegas
FOR SELECT USING (
  id = get_my_assigned_bodega()
  AND get_my_role() = 'asesor'
);

-- C. Usuarios
DROP POLICY IF EXISTS "Aislamiento de Usuarios" ON public.usuarios;
CREATE POLICY "Aislamiento de Usuarios" ON public.usuarios
USING (
  distribuidor_id = get_my_distribuidor_id()
);

DROP POLICY IF EXISTS "Usuario ve su propio perfil" ON public.usuarios;
CREATE POLICY "Usuario ve su propio perfil" ON public.usuarios
USING (
  id = auth.uid()
);

-- D. Productos
DROP POLICY IF EXISTS "Ver productos autenticado" ON public.productos;
CREATE POLICY "Ver productos autenticado" ON public.productos
FOR SELECT TO authenticated USING (true);

-- F. Clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestionar con clientes" ON public.clientes;
CREATE POLICY "Gestionar con clientes" ON public.clientes
USING (
  distribuidor_id = get_my_distribuidor_id()
);

-- E. Inventario (CRÍTICO)
DROP POLICY IF EXISTS "Acceso a inventario" ON public.inventario_bodega;
CREATE POLICY "Acceso a inventario" ON public.inventario_bodega
USING (
  bodega_id IN (
    SELECT id FROM public.bodegas 
    WHERE 
      (distribuidor_id = get_my_distribuidor_id() AND get_my_role() = 'admin_distribuidor')
      OR 
      (id = get_my_assigned_bodega() AND get_my_role() = 'asesor')
  )
);

-- G. Ventas
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestionar ventas propias" ON public.ventas;
CREATE POLICY "Gestionar ventas propias" ON public.ventas
USING (distribuidor_id = get_my_distribuidor_id());

-- H. Detalle Ventas
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestionar detalle ventas" ON public.detalle_ventas;
CREATE POLICY "Gestionar detalle ventas" ON public.detalle_ventas
USING (
  venta_id IN (
    SELECT id FROM public.ventas 
    WHERE distribuidor_id = get_my_distribuidor_id()
  )
);

-- ==========================================
-- 5. DATOS DE EJEMPLO (SEED) - OPCIONAL
-- ==========================================
/*
-- Insertar un Distribuidor
INSERT INTO public.distribuidores (nombre_comercial, nit)
VALUES ('Distribuidora Ejemplo SAS', '900123456-1');

-- Nota: Para crear el usuario 'admin', primero debe registrarse en Auht
-- y luego insertar manualmente en la tabla 'usuarios' con el UUID generado.
*/

-- ==========================================
-- 6. FUNCIONES DE LÓGICA DE NEGOCIO (RPC)
-- ==========================================

-- Función para registrar una venta completa y actualizar inventario
CREATE OR REPLACE FUNCTION registrar_venta(
    p_cliente_id UUID,
    p_items JSONB, -- Array de objetos: [{ "producto_id": "uuid", "cantidad": 5, "precio_unitario": 1000 }]
    p_total NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_venta_id UUID;
    v_distribuidor_id UUID;
    v_usuario_id UUID;
    v_bodega_id UUID;
    v_item JSONB;
    v_producto_id UUID;
    v_cantidad NUMERIC;
    v_precio NUMERIC;
    v_subtotal NUMERIC;
    v_current_stock NUMERIC;
BEGIN
    -- Obtener contexto del usuario actual
    v_usuario_id := auth.uid();
    SELECT distribuidor_id, bodega_asignada_id INTO v_distribuidor_id, v_bodega_id
    FROM public.usuarios WHERE id = v_usuario_id;

    -- Si es admin y no tiene bodega asignada, usar una por defecto o lanzar error
    -- Para simplificar, asumimos que si es admin, opera sobre la bodega principal del distribuidor (primera que encuentre)
    IF v_bodega_id IS NULL THEN
        SELECT id INTO v_bodega_id FROM public.bodegas WHERE distribuidor_id = v_distribuidor_id LIMIT 1;
    END IF;

    IF v_bodega_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró una bodega para procesar la venta.';
    END IF;

    -- 1. Crear Cabecera de Venta
    INSERT INTO public.ventas (distribuidor_id, cliente_id, usuario_id, total, estado)
    VALUES (v_distribuidor_id, p_cliente_id, v_usuario_id, p_total, 'completado')
    RETURNING id INTO v_venta_id;

    -- 2. Procesar Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_producto_id := (v_item->>'producto_id')::UUID;
        v_cantidad := (v_item->>'cantidad')::NUMERIC;
        v_precio := (v_item->>'precio_unitario')::NUMERIC;
        v_subtotal := v_cantidad * v_precio;

        -- Verificar Stock y Actualizar
        SELECT cantidad INTO v_current_stock 
        FROM public.inventario_bodega 
        WHERE bodega_id = v_bodega_id AND producto_id = v_producto_id
        FOR UPDATE; -- Bloquear fila para evitar condiciones de carrera

        IF v_current_stock IS NULL OR v_current_stock < v_cantidad THEN
             RAISE EXCEPTION 'Stock insuficiente para el producto %', v_producto_id;
        END IF;

        UPDATE public.inventario_bodega
        SET cantidad = cantidad - v_cantidad,
            updated_at = NOW()
        WHERE bodega_id = v_bodega_id AND producto_id = v_producto_id;

        -- Crear Detalle de Venta
        INSERT INTO public.detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES (v_venta_id, v_producto_id, v_cantidad, v_precio, v_subtotal);

    END LOOP;

    RETURN v_venta_id;
END;
$$;
