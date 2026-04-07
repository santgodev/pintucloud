-- ==========================================
-- 03_LOGICA_Y_PROCEDIMIENTOS (RPC)
-- ==========================================

-- 1. FUNCIONES GENERALES
CREATE OR REPLACE FUNCTION admin_cambiar_password(p_usuario_id uuid, p_nueva_password text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_admin_distribuidor_id uuid;
    v_target_distribuidor_id uuid;
BEGIN
    IF get_my_role() <> 'admin_distribuidor' THEN
        RAISE EXCEPTION 'Solo el administrador puede cambiar contraseñas.';
    END IF;

    v_admin_distribuidor_id := get_my_distribuidor_id();

    SELECT distribuidor_id INTO v_target_distribuidor_id
    FROM public.usuarios WHERE id = p_usuario_id;

    IF v_target_distribuidor_id IS NULL OR v_target_distribuidor_id <> v_admin_distribuidor_id THEN
        RAISE EXCEPTION 'No tiene permisos para cambiar la contraseña de este usuario.';
    END IF;

    UPDATE auth.users
    SET encrypted_password = crypt(p_nueva_password, gen_salt('bf'))
    WHERE id = p_usuario_id;
END;
$function$;

CREATE OR REPLACE FUNCTION ajustar_inventario(p_bodega_id uuid, p_producto_id uuid, p_nueva_cantidad numeric, p_motivo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_distribuidor uuid;
    v_stock_actual numeric;
BEGIN
    IF get_my_role() <> 'admin_distribuidor' THEN
        RAISE EXCEPTION 'Solo el administrador puede ajustar inventario.';
    END IF;

    SELECT distribuidor_id INTO v_distribuidor
    FROM bodegas WHERE id = p_bodega_id;

    IF v_distribuidor <> get_my_distribuidor_id() THEN
        RAISE EXCEPTION 'No tiene permisos sobre esta bodega.';
    END IF;

    SELECT cantidad INTO v_stock_actual FROM inventario_bodega
    WHERE bodega_id = p_bodega_id AND producto_id = p_producto_id;

    INSERT INTO movimientos_inventario (producto_id, bodega_id, tipo_movimiento, cantidad, usuario_id)
    VALUES (p_producto_id, p_bodega_id, 'AJUSTE: ' || p_motivo, p_nueva_cantidad - COALESCE(v_stock_actual, 0), auth.uid());

    INSERT INTO inventario_bodega (bodega_id, producto_id, cantidad)
    VALUES (p_bodega_id, p_producto_id, p_nueva_cantidad)
    ON CONFLICT (bodega_id, producto_id) DO UPDATE SET cantidad = p_nueva_cantidad;
END;
$function$;

-- 2. PROCEDIMIENTOS DE COMPRA
CREATE OR REPLACE FUNCTION anular_compra(p_compra_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_distribuidor uuid;
BEGIN
    IF get_my_role() <> 'admin_distribuidor' THEN
        RAISE EXCEPTION 'Solo el administrador puede anular compras.';
    END IF;

    SELECT distribuidor_id INTO v_distribuidor
    FROM compras WHERE id = p_compra_id;

    IF v_distribuidor <> get_my_distribuidor_id() THEN
        RAISE EXCEPTION 'No tiene permisos para anular esta compra.';
    END IF;

    UPDATE compras SET estado = 'ANULADA', fecha_anulacion = now() WHERE id = p_compra_id;
END;
$function$;

CREATE OR REPLACE FUNCTION registrar_pago_proveedor(p_compra_id uuid, p_monto numeric, p_metodo_pago text, p_observacion text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_cuenta RECORD;
BEGIN
    SELECT * INTO v_cuenta FROM cuentas_por_pagar
    WHERE compra_id = p_compra_id AND distribuidor_id = get_my_distribuidor_id()
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta no encontrada.'; END IF;

    IF p_monto > v_cuenta.saldo_actual + 0.01 THEN
        RAISE EXCEPTION 'El pago excede el saldo pendiente.';
    END IF;

    INSERT INTO pagos_proveedores (compra_id, proveedor_id, distribuidor_id, usuario_id, monto, metodo_pago)
    VALUES (v_cuenta.compra_id, v_cuenta.proveedor_id, v_cuenta.distribuidor_id, auth.uid(), p_monto, p_metodo_pago);

    UPDATE cuentas_por_pagar
    SET saldo_actual = GREATEST(0, saldo_actual - p_monto),
        estado = CASE WHEN (saldo_actual - p_monto) <= 0.01 THEN 'PAGADA' ELSE 'PARCIAL' END
    WHERE id = v_cuenta.id;
END;
$function$;

-- 3. TRIGGERS
CREATE OR REPLACE FUNCTION trigger_auditoria_perfil()
 RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO auditoria_usuarios (usuario_id, admin_id, accion, detalles)
        VALUES (NEW.id, auth.uid(), 'ACTUALIZACION_PERFIL', row_to_json(NEW));
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO auditoria_usuarios (usuario_id, admin_id, accion, detalles)
        VALUES (NEW.id, auth.uid(), 'CREACION_USUARIO', row_to_json(NEW));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auditoria_usuarios ON public.usuarios;
CREATE TRIGGER tr_auditoria_usuarios
AFTER INSERT OR UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION trigger_auditoria_perfil();
