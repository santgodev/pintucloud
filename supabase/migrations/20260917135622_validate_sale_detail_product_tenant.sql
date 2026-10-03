CREATE OR REPLACE FUNCTION "public"."actualizar_detalles_venta"("p_venta_id" "uuid", "p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    item RECORD;
BEGIN
    -- 1. Eliminar los detalles existentes
    DELETE FROM public.detalle_ventas WHERE venta_id = p_venta_id;

    -- 2. Insertar los nuevos detalles desde el JSONB
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        producto_id UUID,
        cantidad NUMERIC,
        precio_unitario NUMERIC,
        subtotal NUMERIC
    ) LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM public.productos p
            JOIN public.ventas v ON v.id = p_venta_id
            WHERE p.id = item.producto_id
              AND p.distribuidor_id = v.distribuidor_id
        ) THEN
            RAISE EXCEPTION 'Producto no pertenece al distribuidor de la venta';
        END IF;

        INSERT INTO public.detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES (p_venta_id, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal);
    END LOOP;
END;
$$;
