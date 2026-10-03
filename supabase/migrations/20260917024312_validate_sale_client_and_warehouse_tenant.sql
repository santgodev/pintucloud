CREATE OR REPLACE FUNCTION public.crear_venta_borrador(p_cliente_id uuid, p_metodo_pago text, p_condicion_pago text, p_dias_credito integer, p_fecha date, p_bodega_id uuid, p_tipo_documento integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_usuario uuid;
    v_distribuidor uuid;
    v_venta_id uuid;
BEGIN
    v_usuario := auth.uid();

    IF v_usuario IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    v_distribuidor := get_my_distribuidor_id();

    IF v_distribuidor IS NULL THEN
        RAISE EXCEPTION 'Usuario sin distribuidor asignado';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.clientes c
        WHERE c.id = p_cliente_id
          AND c.distribuidor_id = v_distribuidor
    ) THEN
        RAISE EXCEPTION 'Cliente no pertenece al distribuidor del usuario';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.bodegas b
        WHERE b.id = p_bodega_id
          AND b.distribuidor_id = v_distribuidor
    ) THEN
        RAISE EXCEPTION 'Bodega no pertenece al distribuidor del usuario';
    END IF;

    IF p_tipo_documento NOT IN (1,2) THEN
        RAISE EXCEPTION 'Tipo de documento inválido';
    END IF;

    INSERT INTO public.ventas (
        cliente_id,
        metodo_pago,
        condicion_pago,
        dias_credito,
        fecha,
        bodega_id,
        estado,
        total,
        usuario_id,
        distribuidor_id,
        tipo_documento,
        created_at,
        updated_at
    )
    VALUES (
        p_cliente_id,
        CASE
            WHEN p_condicion_pago = 'CREDITO' THEN NULL
            ELSE p_metodo_pago
        END,
        p_condicion_pago,
        CASE
            WHEN p_condicion_pago = 'CREDITO' THEN p_dias_credito
            ELSE NULL
        END,
        p_fecha,
        p_bodega_id,
        'BORRADOR',
        0,
        v_usuario,
        v_distribuidor,
        p_tipo_documento,
        now(),
        now()
    )
    RETURNING id INTO v_venta_id;

    RETURN v_venta_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.crear_venta_borrador(p_cliente_id uuid, p_metodo_pago text, p_condicion_pago text, p_dias_credito integer, p_fecha date, p_bodega_id uuid, p_tipo_documento integer, p_descuento_porcentaje numeric DEFAULT 0)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_usuario uuid;
    v_distribuidor uuid;
    v_venta_id uuid;
BEGIN
    v_usuario := auth.uid();

    IF v_usuario IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    v_distribuidor := get_my_distribuidor_id();

    IF v_distribuidor IS NULL THEN
        RAISE EXCEPTION 'Usuario sin distribuidor asignado';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.clientes c
        WHERE c.id = p_cliente_id
          AND c.distribuidor_id = v_distribuidor
    ) THEN
        RAISE EXCEPTION 'Cliente no pertenece al distribuidor del usuario';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.bodegas b
        WHERE b.id = p_bodega_id
          AND b.distribuidor_id = v_distribuidor
    ) THEN
        RAISE EXCEPTION 'Bodega no pertenece al distribuidor del usuario';
    END IF;

    IF p_tipo_documento NOT IN (1,2) THEN
        RAISE EXCEPTION 'Tipo de documento inválido';
    END IF;

    IF p_descuento_porcentaje NOT IN (0,3,5,10) THEN
        RAISE EXCEPTION 'Descuento no permitido. Solo 3%%, 5%% o 10%%.';
    END IF;

    INSERT INTO public.ventas (
        cliente_id,
        metodo_pago,
        condicion_pago,
        dias_credito,
        fecha,
        bodega_id,
        estado,
        total,
        usuario_id,
        distribuidor_id,
        tipo_documento,
        descuento_porcentaje,
        created_at,
        updated_at
    )
    VALUES (
        p_cliente_id,
        CASE
            WHEN p_condicion_pago = 'CREDITO' THEN NULL
            ELSE p_metodo_pago
        END,
        p_condicion_pago,
        CASE
            WHEN p_condicion_pago = 'CREDITO' THEN p_dias_credito
            ELSE NULL
        END,
        (now() AT TIME ZONE 'America/Bogota')::date,
        p_bodega_id,
        'BORRADOR',
        0,
        v_usuario,
        v_distribuidor,
        p_tipo_documento,
        p_descuento_porcentaje,
        now(),
        now()
    )
    RETURNING id INTO v_venta_id;

    RETURN v_venta_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.crear_venta_borrador(p_cliente_id uuid, p_metodo_pago text, p_condicion_pago text, p_dias_credito integer, p_fecha date, p_bodega_id uuid, p_tipo_documento integer, p_descuento_porcentaje numeric DEFAULT 0, p_observaciones text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_usuario uuid;
    v_distribuidor uuid;
    v_venta_id uuid;
BEGIN
    v_usuario := auth.uid();

    IF v_usuario IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    v_distribuidor := get_my_distribuidor_id();

    IF v_distribuidor IS NULL THEN
        RAISE EXCEPTION 'Usuario sin distribuidor asignado';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.clientes c
        WHERE c.id = p_cliente_id
          AND c.distribuidor_id = v_distribuidor
    ) THEN
        RAISE EXCEPTION 'Cliente no pertenece al distribuidor del usuario';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.bodegas b
        WHERE b.id = p_bodega_id
          AND b.distribuidor_id = v_distribuidor
    ) THEN
        RAISE EXCEPTION 'Bodega no pertenece al distribuidor del usuario';
    END IF;

    IF p_tipo_documento NOT IN (1,2) THEN
        RAISE EXCEPTION 'Tipo de documento inválido';
    END IF;

    IF p_descuento_porcentaje NOT IN (0,3,5,10) THEN
        RAISE EXCEPTION 'Descuento no permitido. Solo 3%%, 5%% o 10%%.';
    END IF;

    INSERT INTO public.ventas (
        cliente_id,
        metodo_pago,
        condicion_pago,
        dias_credito,
        fecha,
        bodega_id,
        estado,
        total,
        usuario_id,
        distribuidor_id,
        tipo_documento,
        descuento_porcentaje,
        observaciones,
        created_at,
        updated_at
    )
    VALUES (
        p_cliente_id,
        CASE
            WHEN p_condicion_pago = 'CREDITO' THEN NULL
            ELSE p_metodo_pago
        END,
        p_condicion_pago,
        CASE
            WHEN p_condicion_pago = 'CREDITO' THEN p_dias_credito
            ELSE NULL
        END,
        (now() AT TIME ZONE 'America/Bogota')::date,
        p_bodega_id,
        'BORRADOR',
        0,
        v_usuario,
        v_distribuidor,
        p_tipo_documento,
        p_descuento_porcentaje,
        p_observaciones,
        now(),
        now()
    )
    RETURNING id INTO v_venta_id;

    RETURN v_venta_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.crear_venta_borrador(p_cliente_id uuid, p_metodo_pago text, p_condicion_pago text, p_dias_credito integer, p_fecha date, p_bodega_id uuid, p_tipo_documento integer, p_descuento_porcentaje numeric DEFAULT 0, p_observaciones text DEFAULT NULL::text, p_entrega_transportadora boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_usuario uuid;
    v_distribuidor uuid;
    v_venta_id uuid;
BEGIN
    v_usuario := auth.uid();
    IF v_usuario IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    v_distribuidor := get_my_distribuidor_id();
    IF v_distribuidor IS NULL THEN
        RAISE EXCEPTION 'Usuario sin distribuidor asignado';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.clientes c
        WHERE c.id = p_cliente_id
          AND c.distribuidor_id = v_distribuidor
    ) THEN
        RAISE EXCEPTION 'Cliente no pertenece al distribuidor del usuario';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.bodegas b
        WHERE b.id = p_bodega_id
          AND b.distribuidor_id = v_distribuidor
    ) THEN
        RAISE EXCEPTION 'Bodega no pertenece al distribuidor del usuario';
    END IF;

    IF p_tipo_documento NOT IN (1,2) THEN
        RAISE EXCEPTION 'Tipo de documento invalido';
    END IF;

    IF p_descuento_porcentaje NOT IN (0,3,5,10) THEN
        RAISE EXCEPTION 'Descuento no permitido. Solo 3, 5 o 10 porciento.';
    END IF;

    INSERT INTO public.ventas (
        cliente_id,
        metodo_pago,
        condicion_pago,
        dias_credito,
        fecha,
        bodega_id,
        estado,
        total,
        usuario_id,
        distribuidor_id,
        tipo_documento,
        descuento_porcentaje,
        observaciones,
        entrega_transportadora,
        created_at,
        updated_at
    )
    VALUES (
        p_cliente_id,
        CASE
            WHEN p_condicion_pago = 'CREDITO' THEN NULL
            ELSE p_metodo_pago
        END,
        p_condicion_pago,
        CASE
            WHEN p_condicion_pago = 'CREDITO' THEN p_dias_credito
            ELSE NULL
        END,
        (now() AT TIME ZONE 'America/Bogota')::date,
        p_bodega_id,
        'BORRADOR',
        0,
        v_usuario,
        v_distribuidor,
        p_tipo_documento,
        p_descuento_porcentaje,
        p_observaciones,
        p_entrega_transportadora,
        now(),
        now()
    )
    RETURNING id INTO v_venta_id;

    RETURN v_venta_id;
END;
$function$;
