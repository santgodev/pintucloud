-- EJECUTE ESTE SCRIPT EN EL EDITOR SQL DE SUPABASE PARA ACTUALIZAR LA FUNCIÓN
-- Esta función respeta el parámetro 'p_fecha' para no romper el cliente, pero PostgreSQL forzará la zona horaria de Colombia en el INSERT.

CREATE OR REPLACE FUNCTION public.crear_venta_borrador(
    p_cliente_id uuid,
    p_metodo_pago text,
    p_condicion_pago text,
    p_dias_credito integer,
    p_fecha date,
    p_bodega_id uuid,
    p_tipo_documento integer,
    p_descuento_porcentaje numeric
) RETURNS uuid AS $$
DECLARE
    v_venta_id uuid;
    v_usuario_id uuid;
    v_distribuidor_id uuid;
BEGIN
    -- Obtener el usuario autenticado
    v_usuario_id := auth.uid();
    
    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- Obtener el distribuidor_id del usuario
    SELECT distribuidor_id INTO v_distribuidor_id
    FROM public.usuarios
    WHERE id = v_usuario_id;
    
    IF v_distribuidor_id IS NULL THEN
        RAISE EXCEPTION 'El usuario no tiene un distribuidor asignado';
    END IF;

    -- Insertar la cabecera de la venta en estado BORRADOR
    INSERT INTO public.ventas (
        distribuidor_id,
        cliente_id,
        usuario_id,
        bodega_id,
        fecha,  -- <<< IGNORE p_fecha AND INJECT COLOMBIAN TIME
        estado,
        condicion_pago,
        dias_credito,
        metodo_pago,
        tipo_documento,
        descuento_porcentaje,
        total
    ) VALUES (
        v_distribuidor_id,
        p_cliente_id,
        v_usuario_id,
        p_bodega_id,
        (now() AT TIME ZONE 'America/Bogota')::date, -- << FECHA GENERADA VIA BASE DE DATOS COMO FUE REQUERIDO
        'BORRADOR',
        p_condicion_pago,
        p_dias_credito,
        p_metodo_pago,
        p_tipo_documento,
        p_descuento_porcentaje,
        0 -- El total inicia en 0 (se sumará en los detalles y gatillos si hay alguno o via confirmación)
    )
    RETURNING id INTO v_venta_id;

    RETURN v_venta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
