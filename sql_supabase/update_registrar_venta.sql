-- =============================================
-- Script: update_registrar_venta.sql
-- Descripción: Actualiza la función registrar_venta para soportar método de pago (Contado/Crédito)
-- =============================================

-- 1. Asegurar que la tabla ventas tenga la columna metodo_pago
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ventas' AND column_name = 'metodo_pago') THEN
        ALTER TABLE public.ventas ADD COLUMN metodo_pago TEXT DEFAULT 'contado';
    END IF;
END $$;

-- 2. Actualizar la función RPC
CREATE OR REPLACE FUNCTION registrar_venta(
    p_cliente_id UUID,
    p_items JSONB, -- Array de objetos: [{ "producto_id": "uuid", "cantidad": 5, "precio_unitario": 1000 }]
    p_total NUMERIC,
    p_metodo_pago TEXT DEFAULT 'contado' -- Nuevo parámetro: 'contado' o 'credito'
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
    
    -- Validar que el usuario existe y obtener su distribuidor/bodega
    SELECT distribuidor_id, bodega_asignada_id INTO v_distribuidor_id, v_bodega_id
    FROM public.usuarios WHERE id = v_usuario_id;

    IF v_distribuidor_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autorizado o sin distribuidor asignado.';
    END IF;

    -- Si es admin y no tiene bodega asignada, usar una por defecto
    IF v_bodega_id IS NULL THEN
        SELECT id INTO v_bodega_id FROM public.bodegas WHERE distribuidor_id = v_distribuidor_id LIMIT 1;
    END IF;

    IF v_bodega_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró una bodega para procesar la venta.';
    END IF;

    -- 1. Crear Cabecera de Venta
    INSERT INTO public.ventas (
        distribuidor_id, 
        cliente_id, 
        usuario_id, 
        total, 
        estado, 
        metodo_pago,
        fecha
    )
    VALUES (
        v_distribuidor_id, 
        p_cliente_id, 
        v_usuario_id, 
        p_total, 
        'completado', 
        p_metodo_pago,
        NOW()
    )
    RETURNING id INTO v_venta_id;

    -- 2. Procesar Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_producto_id := (v_item->>'producto_id')::UUID;
        v_cantidad := (v_item->>'cantidad')::NUMERIC;
        v_precio := (v_item->>'precio_unitario')::NUMERIC;
        v_subtotal := v_cantidad * v_precio;

        -- Validar datos del item
        IF v_cantidad <= 0 THEN
             RAISE EXCEPTION 'La cantidad debe ser mayor a 0 para el producto %', v_producto_id;
        END IF;

        -- Verificar Stock y Bloquear Fila (FOR UPDATE)
        SELECT cantidad INTO v_current_stock 
        FROM public.inventario_bodega 
        WHERE bodega_id = v_bodega_id AND producto_id = v_producto_id
        FOR UPDATE; 

        IF v_current_stock IS NULL OR v_current_stock < v_cantidad THEN
             RAISE EXCEPTION 'Stock insuficiente (Actual: %, Solicitado: %) para el producto %', COALESCE(v_current_stock, 0), v_cantidad, v_producto_id;
        END IF;

        -- Actualizar Inventario
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
