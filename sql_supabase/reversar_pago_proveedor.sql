-- ==========================================
-- RPC: reversar_pago_proveedor
-- ==========================================
-- Reversa un pago realizado, actualizando el saldo de la cuenta por pagar.
-- Reutiliza el patrón de reversar_pago_cartera.

CREATE OR REPLACE FUNCTION public.reversar_pago_proveedor(
    p_pago_id uuid,
    p_observacion text DEFAULT 'Reverso de pago'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pago RECORD;
    v_distribuidor_id uuid;
    v_usuario_id uuid;
BEGIN
    -- 1. Obtener datos del pago original
    SELECT * INTO v_pago
    FROM public.pagos_proveedores
    WHERE id = p_pago_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pago no existe';
    END IF;

    IF v_pago.tipo_movimiento = 'REVERSO' THEN
        RAISE EXCEPTION 'No se puede reversar un movimiento que ya es un reverso';
    END IF;

    -- 2. Validar que no haya sido reversado ya (opcional si hay lógica de marcas)
    -- Por simplicidad, el patrón suele permitir insertar el contra-movimiento.

    -- 3. Obtener contexto
    v_usuario_id := auth.uid();
    
    -- 4. Insertar el registro de reverso
    INSERT INTO public.pagos_proveedores (
        compra_id,
        monto,
        metodo_pago,
        fecha_pago,
        observacion,
        tipo_movimiento,
        usuario_id
    )
    VALUES (
        v_pago.compra_id,
        v_pago.monto,
        v_pago.metodo_pago,
        CURRENT_DATE,
        p_observacion || ' (Original: ' || v_pago.id || ')',
        'REVERSO',
        v_usuario_id
    );

    -- 5. Actualizar saldo en cuentas_por_pagar
    -- El monto se SUMA al saldo porque estamos anulando un pago (que lo restó)
    UPDATE public.cuentas_por_pagar
    SET saldo = saldo + v_pago.monto,
        updated_at = now()
    WHERE compra_id = v_pago.compra_id;

    -- 6. Recalcular estado de la cuenta por pagar
    -- Si el nuevo saldo es > 0, puede ser PENDIENTE o PARCIAL
    -- (Esta lógica suele estar en un trigger en cuentas_por_pagar, 
    -- pero para ser explícitos lo hacemos aquí si no hay trigger)
    UPDATE public.cuentas_por_pagar
    SET estado = CASE 
        WHEN saldo >= total THEN 'PENDIENTE'
        ELSE 'PARCIAL'
    END
    WHERE compra_id = v_pago.compra_id;

END;
$$;

-- 🔐 Permisos
REVOKE ALL ON FUNCTION public.reversar_pago_proveedor(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reversar_pago_proveedor(uuid, text) TO authenticated;
