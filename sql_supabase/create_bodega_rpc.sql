-- =============================================
-- RPC: crear_bodega
-- Descripción: Crea una nueva bodega para el distribuidor del usuario autenticado.
-- Solo puede ser ejecutada por usuarios con rol 'admin_distribuidor'.
-- =============================================

CREATE OR REPLACE FUNCTION crear_bodega(
    p_nombre    TEXT,
    p_codigo    TEXT,
    p_direccion TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_distribuidor_id UUID;
    v_rol             rol_usuario;
    v_nueva_bodega_id UUID;
BEGIN
    -- 1. Obtener contexto del usuario autenticado
    SELECT distribuidor_id, rol
    INTO v_distribuidor_id, v_rol
    FROM public.usuarios
    WHERE id = auth.uid();

    -- 2. Validar que el usuario es admin
    IF v_rol IS DISTINCT FROM 'admin_distribuidor' THEN
        RAISE EXCEPTION 'Solo los administradores pueden crear bodegas.';
    END IF;

    -- 3. Validar que no exista una bodega con el mismo código en el mismo distribuidor
    IF EXISTS (
        SELECT 1 FROM public.bodegas
        WHERE distribuidor_id = v_distribuidor_id AND codigo = p_codigo
    ) THEN
        RAISE EXCEPTION 'Ya existe una bodega con el código "%" en tu organización.', p_codigo;
    END IF;

    -- 4. Insertar la nueva bodega
    INSERT INTO public.bodegas (distribuidor_id, nombre, codigo, direccion, activo)
    VALUES (v_distribuidor_id, p_nombre, p_codigo, p_direccion, true)
    RETURNING id INTO v_nueva_bodega_id;

    RETURN v_nueva_bodega_id;
END;
$$;
