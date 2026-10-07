-- 1. Actualizar confirmar_venta
CREATE OR REPLACE FUNCTION "public"."confirmar_venta"("p_venta_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$

DECLARE
    v_venta RECORD;
    v_detalle RECORD;
    v_distribuidor uuid;
    v_total numeric := 0;
    v_item_count int;
    v_stock_actual numeric;
    v_nuevo_numero bigint;
    v_fecha_vencimiento date;
    v_descuento_valor numeric := 0;
    v_maneja_inventario boolean;

BEGIN

    v_distribuidor := get_my_distribuidor_id();

    SELECT * INTO v_venta
    FROM ventas
    WHERE id = p_venta_id
      AND distribuidor_id = v_distribuidor
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venta no existe o no tiene permisos.';
    END IF;

    IF v_venta.estado <> 'BORRADOR' THEN
        RAISE EXCEPTION 'Solo se pueden confirmar ventas en BORRADOR.';
    END IF;

    -- 🔎 verificar tipo de bodega
    SELECT maneja_inventario
    INTO v_maneja_inventario
    FROM bodegas
    WHERE id = v_venta.bodega_id;

    -- 🔐 VALIDACIÓN DE MEDIOS DE PAGO

    IF v_venta.condicion_pago = 'CONTADO' THEN
        IF v_venta.metodo_pago NOT IN ('EFECTIVO', 'TRANSFERENCIA') THEN
            RAISE EXCEPTION 'Método de pago inválido para ventas de contado.';
        END IF;
    END IF;

    IF v_venta.condicion_pago = 'CREDITO' THEN
        IF v_venta.metodo_pago IS NOT NULL THEN
            RAISE EXCEPTION 'Ventas a crédito no deben tener método de pago.';
        END IF;
    END IF;

    -- VALIDAR ITEMS
    SELECT COUNT(*) INTO v_item_count
    FROM detalle_ventas
    WHERE venta_id = p_venta_id;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'No se puede confirmar una venta sin productos.';
    END IF;

    -------------------------------------------------
    -- VALIDAR STOCK SOLO SI LA BODEGA MANEJA INVENTARIO
    -------------------------------------------------

    IF v_maneja_inventario THEN

        FOR v_detalle IN
            SELECT producto_id, cantidad
            FROM detalle_ventas
            WHERE venta_id = p_venta_id
        LOOP

            SELECT cantidad INTO v_stock_actual
            FROM inventario_bodega
            WHERE producto_id = v_detalle.producto_id
              AND bodega_id = v_venta.bodega_id
            FOR UPDATE;

            IF v_stock_actual IS NULL THEN
                RAISE EXCEPTION 'Producto sin inventario.';
            END IF;

            IF v_stock_actual < v_detalle.cantidad THEN
                RAISE EXCEPTION 'stock_insuficiente';
            END IF;

        END LOOP;

    END IF;

    -------------------------------------------------
    -- CALCULAR TOTAL (SIN AFECTAR INVENTARIO)
    -------------------------------------------------

    FOR v_detalle IN
        SELECT producto_id, cantidad, precio_unitario
        FROM detalle_ventas
        WHERE venta_id = p_venta_id
    LOOP

        v_total := v_total + (v_detalle.cantidad * v_detalle.precio_unitario);

    END LOOP;

    -- NUEVA VALIDACIÓN DE DESCUENTO
    IF v_venta.descuento_porcentaje < 0 OR v_venta.descuento_porcentaje > 100 THEN
        RAISE EXCEPTION 'Descuento no permitido. Debe ser entre 0 y 100.';
    END IF;

    v_descuento_valor := v_total * (v_venta.descuento_porcentaje / 100);
    v_total := v_total - v_descuento_valor;

    -- NUMERACIÓN
    IF v_venta.numero_factura IS NULL THEN

        INSERT INTO secuencias_ventas(distribuidor_id)
        VALUES (v_distribuidor)
        ON CONFLICT (distribuidor_id) DO NOTHING;

        UPDATE secuencias_ventas
        SET ultimo_numero = ultimo_numero + 1
        WHERE distribuidor_id = v_distribuidor
        RETURNING ultimo_numero INTO v_nuevo_numero;

    ELSE
        v_nuevo_numero := v_venta.numero_factura;
    END IF;

    -- ❌ YA NO SE CALCULA VENCIMIENTO AQUÍ
    v_fecha_vencimiento := NULL;

    -- ❌ YA NO SE CREA CARTERA AQUÍ

    UPDATE ventas
    SET estado = 'CONFIRMADA',
        total = v_total,
        descuento_valor = v_descuento_valor,
        numero_factura = v_nuevo_numero,
        fecha_vencimiento = v_fecha_vencimiento,
        updated_at = now()
    WHERE id = p_venta_id;

END;
$$;


-- 2. Actualizar crear_venta_borrador (Sobrecarga 1)
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

    IF get_my_role() = 'asesor' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.usuarios_bodegas ub
            WHERE ub.usuario_id = auth.uid()
              AND ub.bodega_id = p_bodega_id
        ) THEN
            RAISE EXCEPTION 'Bodega no habilitada para el asesor';
        END IF;
    END IF;

    IF p_tipo_documento NOT IN (1,2) THEN
        RAISE EXCEPTION 'Tipo de documento inválido';
    END IF;

    -- NUEVA VALIDACIÓN DE DESCUENTO
    IF p_descuento_porcentaje < 0 OR p_descuento_porcentaje > 100 THEN
        RAISE EXCEPTION 'Descuento no permitido. Debe ser entre 0 y 100.';
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


-- 3. Actualizar crear_venta_borrador (Sobrecarga 2)
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

    IF get_my_role() = 'asesor' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.usuarios_bodegas ub
            WHERE ub.usuario_id = auth.uid()
              AND ub.bodega_id = p_bodega_id
        ) THEN
            RAISE EXCEPTION 'Bodega no habilitada para el asesor';
        END IF;
    END IF;

    IF p_tipo_documento NOT IN (1,2) THEN
        RAISE EXCEPTION 'Tipo de documento inválido';
    END IF;

    -- NUEVA VALIDACIÓN DE DESCUENTO
    IF p_descuento_porcentaje < 0 OR p_descuento_porcentaje > 100 THEN
        RAISE EXCEPTION 'Descuento no permitido. Debe ser entre 0 y 100.';
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


-- 4. Actualizar crear_venta_borrador (Sobrecarga 3)
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

    IF get_my_role() = 'asesor' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.usuarios_bodegas ub
            WHERE ub.usuario_id = auth.uid()
              AND ub.bodega_id = p_bodega_id
        ) THEN
            RAISE EXCEPTION 'Bodega no habilitada para el asesor';
        END IF;
    END IF;

    IF p_tipo_documento NOT IN (1,2) THEN
        RAISE EXCEPTION 'Tipo de documento invalido';
    END IF;

    -- NUEVA VALIDACIÓN DE DESCUENTO
    IF p_descuento_porcentaje < 0 OR p_descuento_porcentaje > 100 THEN
        RAISE EXCEPTION 'Descuento no permitido. Debe ser entre 0 y 100.';
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
