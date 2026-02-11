-- ====================================================================
-- ASIGNACIÓN DE ROLES Y PERFILES A USUARIOS CREADOS
-- ====================================================================
-- INSTRUCCIONES:
-- Ejecuta este script SOLO después de haber creado los usuarios en Supabase Auth
-- (Authentication -> Users -> Invite/Add User)
-- ====================================================================

-- 1. IDs predefinidos del Seed anterior
-- Distribuidor: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
-- Bodega: 'b102bc99-9c0b-4ef8-bb6d-6bb9bd380b22'

DO $$
DECLARE
    v_distribuidor_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    v_bodega_id UUID := 'b102bc99-9c0b-4ef8-bb6d-6bb9bd380b22';
    
    -- Variables para almacenar los IDs de Auth recuperados por email
    v_admin_id UUID;
    v_asesor1_id UUID;
    v_asesor2_id UUID;
BEGIN
    -- ----------------------------------------------------
    -- 2. RECUPERAR LOS UIDs DE AUTH POR EMAIL
    -- ----------------------------------------------------
    
    -- A. Admin
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@pinturasnorte.com';
    
    -- B. Asesor 1
    SELECT id INTO v_asesor1_id FROM auth.users WHERE email = 'asesor1@pinturasnorte.com';
    
    -- C. Asesor 2
    SELECT id INTO v_asesor2_id FROM auth.users WHERE email = 'asesor2@pinturasnorte.com';

    -- Validación básica
    IF v_admin_id IS NULL THEN RAISE NOTICE 'Usuario Admin no encontrado. Asegúrate de crearlo en Auth.'; END IF;
    IF v_asesor1_id IS NULL THEN RAISE NOTICE 'Asesor 1 no encontrado.'; END IF;
    IF v_asesor2_id IS NULL THEN RAISE NOTICE 'Asesor 2 no encontrado.'; END IF;

    -- ----------------------------------------------------
    -- 3. INSERTAR PERFILES EN TABLA PUBLICA 'USUARIOS'
    -- ----------------------------------------------------

    -- A. Admin Distribuidor
    IF v_admin_id IS NOT NULL THEN
        INSERT INTO public.usuarios (id, distribuidor_id, rol, nombre_completo, email)
        VALUES (
            v_admin_id, 
            v_distribuidor_id, 
            'admin_distribuidor', 
            'Administrador Distribuidor', 
            'admin@pinturasnorte.com'
        )
        ON CONFLICT (id) DO UPDATE 
        SET rol = 'admin_distribuidor';
    END IF;

    -- B. Asesor 1 (Con bodega asignada)
    IF v_asesor1_id IS NOT NULL THEN
        INSERT INTO public.usuarios (id, distribuidor_id, rol, bodega_asignada_id, nombre_completo, email)
        VALUES (
            v_asesor1_id, 
            v_distribuidor_id, 
            'asesor', 
            v_bodega_id, 
            'Asesor Ventas 1', 
            'asesor1@pinturasnorte.com'
        )
        ON CONFLICT (id) DO UPDATE 
        SET rol = 'asesor', bodega_asignada_id = v_bodega_id;
        
        -- Asignar clientes de prueba a este asesor (Opcional)
        UPDATE public.clientes 
        SET usuario_id = v_asesor1_id 
        WHERE email = 'contacto@elmartillo.com';
    END IF;

    -- C. Asesor 2 (Con bodega asignada)
    IF v_asesor2_id IS NOT NULL THEN
        INSERT INTO public.usuarios (id, distribuidor_id, rol, bodega_asignada_id, nombre_completo, email)
        VALUES (
            v_asesor2_id, 
            v_distribuidor_id, 
            'asesor', 
            v_bodega_id, 
            'Asesor Ventas 2', 
            'asesor2@pinturasnorte.com'
        )
        ON CONFLICT (id) DO UPDATE 
        SET rol = 'asesor', bodega_asignada_id = v_bodega_id;
        
        -- Asignar clientes de prueba a este asesor (Opcional)
        UPDATE public.clientes 
        SET usuario_id = v_asesor2_id 
        WHERE email = 'compras@solida.co';
    END IF;

END $$;

