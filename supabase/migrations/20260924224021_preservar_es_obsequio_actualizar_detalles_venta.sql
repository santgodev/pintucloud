CREATE OR REPLACE FUNCTION "public"."actualizar_detalles_venta"("p_venta_id" "uuid", "p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    item RECORD;
    v_distribuidor_id UUID;
BEGIN
    -- 1. Obtener el distribuidor de la venta
    SELECT v.distribuidor_id INTO v_distribuidor_id
    FROM public.ventas v
    WHERE v.id = p_venta_id;

    -- 2. Si no existe
    IF v_distribuidor_id IS NULL THEN
        RAISE EXCEPTION 'Venta no encontrada o no accesible';
    END IF;

    -- 3. Eliminar los detalles existentes
    DELETE FROM public.detalle_ventas
    WHERE venta_id = p_venta_id;

    -- 4. Insertar los nuevos detalles desde el JSONB
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        producto_id UUID,
        cantidad NUMERIC,
        precio_unitario NUMERIC,
        subtotal NUMERIC,
        es_obsequio BOOLEAN
    ) LOOP
        -- Mantener validación del producto: el producto debe pertenecer al mismo distribuidor de la venta
        IF NOT EXISTS (
            SELECT 1
            FROM public.productos p
            WHERE p.id = item.producto_id
              AND p.distribuidor_id = v_distribuidor_id
        ) THEN
            RAISE EXCEPTION 'Producto no pertenece al distribuidor de la venta';
        END IF;

        -- 5, 6 y 7. Insertar incluyendo es_obsequio
        INSERT INTO public.detalle_ventas (
            venta_id,
            producto_id,
            cantidad,
            precio_unitario,
            subtotal,
            es_obsequio
        )
        VALUES (
            p_venta_id,
            item.producto_id,
            item.cantidad,
            item.precio_unitario,
            item.subtotal,
            COALESCE(item.es_obsequio, false)
        );
    END LOOP;
END;
$$;
