CREATE OR REPLACE FUNCTION "public"."anular_compra"("p_compra_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_estado text;
    v_distribuidor uuid;
    v_detalle RECORD;
    v_stock_actual numeric;
    v_bodega uuid;
BEGIN
    -- 🔐 ROLE VALIDATION
    IF get_my_role() <> 'admin_distribuidor' THEN
        RAISE EXCEPTION 'Solo el administrador puede anular compras.';
    END IF;

    SELECT estado, distribuidor_id, bodega_id
    INTO v_estado, v_distribuidor, v_bodega
    FROM compras
    WHERE id = p_compra_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'compra_no_existe';
    END IF;

    IF v_distribuidor <> get_my_distribuidor_id() THEN
        RAISE EXCEPTION 'no_autorizado';
    END IF;

    IF v_estado <> 'CONFIRMADA' THEN
        RAISE EXCEPTION 'compra_no_confirmada';
    END IF;

    -- Validar que no haya pagos activos sin reversar
    IF EXISTS (
        SELECT 1
        FROM pagos_proveedores p1
        WHERE p1.compra_id = p_compra_id
          AND p1.tipo_movimiento = 'PAGO'
          AND NOT EXISTS (
              SELECT 1
              FROM pagos_proveedores p2
              WHERE p2.tipo_movimiento = 'REVERSO'
                AND p2.pago_referencia_id = p1.id
          )
    ) THEN
        RAISE EXCEPTION 'compra_tiene_pagos_activos';
    END IF;

    FOR v_detalle IN
        SELECT producto_id, cantidad
        FROM compras_detalle
        WHERE compra_id = p_compra_id
    LOOP
        SELECT cantidad
        INTO v_stock_actual
        FROM inventario_bodega
        WHERE producto_id = v_detalle.producto_id
          AND bodega_id = v_bodega
        FOR UPDATE;

        IF v_stock_actual < v_detalle.cantidad THEN
            RAISE EXCEPTION 'stock_utilizado_en_ventas';
        END IF;
    END LOOP;

    FOR v_detalle IN
        SELECT producto_id, cantidad
        FROM compras_detalle
        WHERE compra_id = p_compra_id
    LOOP
        PERFORM registrar_movimiento(
            v_detalle.producto_id,
            v_bodega,
            'ANULACION_COMPRA',
            -v_detalle.cantidad,
            p_compra_id
        );
    END LOOP;

    UPDATE compras
    SET estado = 'ANULADA',
        fecha_anulacion = now(),
        updated_at = now()
    WHERE id = p_compra_id;

    UPDATE cuentas_por_pagar
    SET
        estado = 'ANULADA',
        saldo_actual = 0
    WHERE compra_id = p_compra_id;

END;
$$;
