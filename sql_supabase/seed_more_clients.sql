-- ====================================================================
-- SEED DE CLIENTES ADICIONALES (10)
-- ====================================================================

DO $$
DECLARE
    v_distribuidor_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    v_asesor1_id UUID;
    v_asesor2_id UUID;
BEGIN
    -- 1. Recuperar IDs
    SELECT id INTO v_asesor1_id FROM auth.users WHERE email = 'asesor1@pinturasnorte.com';
    SELECT id INTO v_asesor2_id FROM auth.users WHERE email = 'asesor2@pinturasnorte.com';

    IF v_asesor1_id IS NULL THEN RAISE NOTICE 'Asesor 1 no encontrado'; END IF;
    IF v_asesor2_id IS NULL THEN RAISE NOTICE 'Asesor 2 no encontrado'; END IF;

    -- 2. Insertar Clientes para Asesor 1
    IF v_asesor1_id IS NOT NULL THEN
        INSERT INTO public.clientes (distribuidor_id, usuario_id, nombre, email, direccion, zona, telefono) VALUES
        (v_distribuidor_id, v_asesor1_id, 'Pinturas y Acabados Jaramillo', 'jaramillo@cliente.com', 'Calle 10 # 45-20', 'Norte', '3001234567'),
        (v_distribuidor_id, v_asesor1_id, 'Constructora Los Andes', 'andes@cliente.com', 'Av. Bolivar # 12-34', 'Norte', '3109876543'),
        (v_distribuidor_id, v_asesor1_id, 'Ferretería La Tuerca', 'tuerca@cliente.com', 'Cra 5 # 8-90', 'Norte', '3205678901'),
        (v_distribuidor_id, v_asesor1_id, 'Decoraciones del Valle', 'valle@cliente.com', 'Calle 15 # 30-15', 'Centro', '3156789012'),
        (v_distribuidor_id, v_asesor1_id, 'Mantenimiento Total SAS', 'mantenimiento@cliente.com', 'Av. 19 # 22-11', 'Norte', '3012345678');
    END IF;

    -- 3. Insertar Clientes para Asesor 2
    IF v_asesor2_id IS NOT NULL THEN
        INSERT INTO public.clientes (distribuidor_id, usuario_id, nombre, email, direccion, zona, telefono) VALUES
        (v_distribuidor_id, v_asesor2_id, 'Inversiones El Roble', 'roble@cliente.com', 'Calle 50 # 14-20', 'Sur', '3112223344'),
        (v_distribuidor_id, v_asesor2_id, 'Depósito El Constructor', 'constructor@cliente.com', 'Cra 25 # 55-60', 'Sur', '3123334455'),
        (v_distribuidor_id, v_asesor2_id, 'Arq. Julian Gomez', 'jgomez@cliente.com', 'Calle 60 # 10-05', 'Sur', '3134445566'),
        (v_distribuidor_id, v_asesor2_id, 'Pinturas El Maestro', 'maestro@cliente.com', 'Av. Centenario # 5-80', 'Sur', '3145556677'),
        (v_distribuidor_id, v_asesor2_id, 'Soluciones Industriales', 'soluciones@cliente.com', 'Zona Industrial Lote 4', 'Occidente', '3156667788');
    END IF;

END $$;
