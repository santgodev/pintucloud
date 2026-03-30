-- ==============================================================================
-- SCRIPT DE ACTUALIZACIÓN: AÑADIR CAMPO 'OBSERVACIONES' A VENTAS
-- ==============================================================================

-- 1. Añadir el campo a la tabla ventas
ALTER TABLE public.ventas 
ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- 2. Actualizar la función crear_venta_borrador para recibir p_observaciones
CREATE OR REPLACE FUNCTION public.crear_venta_borrador(
    p_cliente_id uuid,
    p_metodo_pago text,
    p_condicion_pago text,
    p_dias_credito integer,
    p_fecha date,
    p_bodega_id uuid,
    p_tipo_documento integer,
    p_descuento_porcentaje numeric,
    p_observaciones text DEFAULT NULL
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
        fecha,  
        estado,
        condicion_pago,
        dias_credito,
        metodo_pago,
        tipo_documento,
        descuento_porcentaje,
        observaciones,
        total
    ) VALUES (
        v_distribuidor_id,
        p_cliente_id,
        v_usuario_id,
        p_bodega_id,
        (now() AT TIME ZONE 'America/Bogota')::date,
        'BORRADOR',
        p_condicion_pago,
        p_dias_credito,
        p_metodo_pago,
        p_tipo_documento,
        p_descuento_porcentaje,
        p_observaciones,
        0
    )
    RETURNING id INTO v_venta_id;

    RETURN v_venta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
