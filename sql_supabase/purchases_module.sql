-- ==========================================
-- MÓDULO PURCHASES — SQL DEFINITIVO
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- 1️⃣ Tabla: proveedores
CREATE TABLE IF NOT EXISTS public.proveedores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    distribuidor_id uuid NOT NULL,
    nombre text NOT NULL,
    nit text,
    telefono text,
    email text,
    direccion text,
    ciudad text,
    contacto_principal text,
    estado text NOT NULL DEFAULT 'ACTIVO',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2️⃣ Tabla: compras
CREATE TABLE IF NOT EXISTS public.compras (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    distribuidor_id uuid NOT NULL,
    proveedor_id uuid NOT NULL REFERENCES public.proveedores(id),
    numero_factura text,
    fecha date NOT NULL DEFAULT CURRENT_DATE,
    total numeric(14,2) NOT NULL DEFAULT 0,
    estado text NOT NULL DEFAULT 'BORRADOR',
    observacion text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3️⃣ Tabla: compras_detalle
-- NOTA: bodega_id vive en el detalle (no en la cabecera)
CREATE TABLE IF NOT EXISTS public.compras_detalle (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id uuid NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
    producto_id uuid NOT NULL REFERENCES public.productos(id),
    bodega_id uuid NOT NULL REFERENCES public.bodegas(id),
    cantidad numeric(14,2) NOT NULL CHECK (cantidad > 0),
    precio_unitario numeric(14,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal numeric(14,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 🔐 ACTIVAR RLS
-- ==========================================
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_detalle ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 🔐 POLICIES — proveedores
-- ==========================================
DROP POLICY IF EXISTS "Proveedores por distribuidor" ON public.proveedores;
CREATE POLICY "Proveedores por distribuidor"
ON public.proveedores FOR SELECT
USING (distribuidor_id = get_my_distribuidor_id());

DROP POLICY IF EXISTS "Insertar proveedores propios" ON public.proveedores;
CREATE POLICY "Insertar proveedores propios"
ON public.proveedores FOR INSERT
WITH CHECK (distribuidor_id = get_my_distribuidor_id());

DROP POLICY IF EXISTS "Actualizar proveedores propios" ON public.proveedores;
CREATE POLICY "Actualizar proveedores propios"
ON public.proveedores FOR UPDATE
USING (distribuidor_id = get_my_distribuidor_id())
WITH CHECK (distribuidor_id = get_my_distribuidor_id());

-- ==========================================
-- 🔐 POLICIES — compras
-- ==========================================
DROP POLICY IF EXISTS "Compras por distribuidor" ON public.compras;
CREATE POLICY "Compras por distribuidor"
ON public.compras FOR SELECT
USING (distribuidor_id = get_my_distribuidor_id());

DROP POLICY IF EXISTS "Insertar compras propias" ON public.compras;
CREATE POLICY "Insertar compras propias"
ON public.compras FOR INSERT
WITH CHECK (distribuidor_id = get_my_distribuidor_id());

DROP POLICY IF EXISTS "Actualizar compras propias" ON public.compras;
CREATE POLICY "Actualizar compras propias"
ON public.compras FOR UPDATE
USING (distribuidor_id = get_my_distribuidor_id())
WITH CHECK (distribuidor_id = get_my_distribuidor_id());

-- ==========================================
-- 🔐 POLICIES — compras_detalle
-- ==========================================
DROP POLICY IF EXISTS "Detalle compra por distribuidor" ON public.compras_detalle;
CREATE POLICY "Detalle compra por distribuidor"
ON public.compras_detalle FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.compras c
        WHERE c.id = compra_id
        AND c.distribuidor_id = get_my_distribuidor_id()
    )
);

DROP POLICY IF EXISTS "Insertar detalle compra propio" ON public.compras_detalle;
CREATE POLICY "Insertar detalle compra propio"
ON public.compras_detalle FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.compras c
        WHERE c.id = compra_id
        AND c.distribuidor_id = get_my_distribuidor_id()
    )
);

-- ==========================================
-- 🧠 RPC: confirmar_compra
-- ==========================================
CREATE OR REPLACE FUNCTION public.confirmar_compra(p_compra_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_distribuidor_id uuid;
    v_estado text;
    v_total numeric := 0;
    v_detalle RECORD;
BEGIN
    SELECT distribuidor_id, estado
    INTO v_distribuidor_id, v_estado
    FROM public.compras
    WHERE id = p_compra_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Compra no existe';
    END IF;

    IF v_distribuidor_id <> get_my_distribuidor_id() THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    IF v_estado <> 'BORRADOR' THEN
        RAISE EXCEPTION 'Solo se pueden confirmar compras en BORRADOR';
    END IF;

    FOR v_detalle IN
        SELECT * FROM public.compras_detalle
        WHERE compra_id = p_compra_id
    LOOP
        v_total := v_total + v_detalle.subtotal;

        PERFORM public.registrar_movimiento(
            v_detalle.producto_id,
            v_detalle.bodega_id,
            'COMPRA',
            v_detalle.cantidad,
            p_compra_id
        );
    END LOOP;

    UPDATE public.compras
    SET total = v_total,
        estado = 'CONFIRMADA',
        updated_at = now()
    WHERE id = p_compra_id;
END;
$$;

-- 🔐 Permisos RPC
REVOKE ALL ON FUNCTION public.confirmar_compra(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_compra(uuid) TO authenticated;
