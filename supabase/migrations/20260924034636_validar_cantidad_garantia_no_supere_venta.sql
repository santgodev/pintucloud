CREATE OR REPLACE FUNCTION "public"."registrar_devolucion_garantia"(
    "p_venta_id" "uuid",
    "p_producto_id" "uuid",
    "p_bodega_id" "uuid",
    "p_cantidad" numeric,
    "p_motivo" "text",
    "p_usuario_id" "uuid"
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_cantidad_vendida numeric;
BEGIN
    SELECT COALESCE(SUM(cantidad), 0)
    INTO v_cantidad_vendida
    FROM public.detalle_ventas
    WHERE venta_id = p_venta_id
      AND producto_id = p_producto_id
      AND COALESCE(es_obsequio, false) = false;

    IF p_cantidad > v_cantidad_vendida THEN
        RAISE EXCEPTION 'La cantidad de la garantía no puede superar la cantidad comprada.';
    END IF;

    INSERT INTO public.devoluciones_garantia (
        venta_id,
        producto_id,
        bodega_id,
        cantidad,
        motivo,
        usuario_id
    ) VALUES (
        p_venta_id,
        p_producto_id,
        p_bodega_id,
        p_cantidad,
        p_motivo,
        p_usuario_id
    );

    PERFORM public.registrar_movimiento(
        p_producto_id,
        p_bodega_id,
        'SALIDA_GARANTIA',
        -p_cantidad,
        p_venta_id,
        'Cambio por garantía (Avería): ' || p_motivo
    );
END;
$$;
