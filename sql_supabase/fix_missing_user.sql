-- =================================================================
-- SCRIPT DE CORRECCIÓN PARA EL USUARIO FALTANTE
-- Ejecuta esto en el SQL Editor de Supabase
-- =================================================================

DO $$
DECLARE
    -- Estos son los IDs que salieron en tu reporte
    v_target_user_id UUID := '9d440394-dc7f-4b3e-968d-96a2e2890bee'; -- El ID de santgodev@gmail.com
    v_distribuidor_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; -- El ID del distribuidor existente
    v_email_usuario TEXT := 'santgodev@gmail.com';
    v_nombre_usuario TEXT := 'Santiago Dev';
BEGIN
    -- 1. Intentar insertar el registro en public.usuarios si no existe
    INSERT INTO public.usuarios (id, distribuidor_id, rol, nombre_completo, email)
    VALUES (v_target_user_id, v_distribuidor_id, 'admin_distribuidor', v_nombre_usuario, v_email_usuario)
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Usuario % configurado correctamente.', v_email_usuario;
END $$;
