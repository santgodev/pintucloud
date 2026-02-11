-- ==========================================
-- SEED DE PRODUCTOS Y HERRAMIENTAS (RODILLOS Y BROCHAS)
-- DEPURA Y DEJA SOLO 4 Y 4 (TRATANDO RESTRICCIONES DE VENTAS)
-- ==========================================

DO $$
DECLARE
    -- IDs de Bodegas
    v_bodega_central_id UUID;
    v_bodega_norte_id UUID; 
    v_distribuidor_id UUID;

    -- Productos IDs
    v_rodillo1 UUID; v_rodillo2 UUID; v_rodillo3 UUID; v_rodillo4 UUID;
    v_brocha1 UUID; v_brocha2 UUID; v_brocha3 UUID; v_brocha4 UUID;
BEGIN
    -- 0. Obtener Distribuidor
    SELECT id INTO v_distribuidor_id FROM public.distribuidores LIMIT 1;

    -- 1. LIMPIEZA DE TRANSACCIONES PREVIAS (Para evitar errores de FK)
    -- Borramos detalles de venta de los productos que no queremos
    DELETE FROM public.detalle_ventas 
    WHERE producto_id IN (
        SELECT id FROM public.productos 
        WHERE sku NOT IN (
            'ROD-ECO-001', 'ROD-PRO-002', 'ROD-TEX-003', 'ROD-EXT-004',
            'BRO-1PLG-001', 'BRO-2PLG-002', 'BRO-3PLG-003', 'BRO-4PLG-004'
        )
    );

    -- Opcional: Borrar ventas que se quedaron sin detalles
    DELETE FROM public.ventas WHERE id NOT IN (SELECT DISTINCT venta_id FROM public.detalle_ventas);

    -- 2. LIMPIEZA DE INVENTARIO Y PRODUCTOS
    DELETE FROM public.inventario_bodega 
    WHERE producto_id IN (
        SELECT id FROM public.productos 
        WHERE sku NOT IN (
            'ROD-ECO-001', 'ROD-PRO-002', 'ROD-TEX-003', 'ROD-EXT-004',
            'BRO-1PLG-001', 'BRO-2PLG-002', 'BRO-3PLG-003', 'BRO-4PLG-004'
        )
    );

    DELETE FROM public.productos 
    WHERE sku NOT IN (
        'ROD-ECO-001', 'ROD-PRO-002', 'ROD-TEX-003', 'ROD-EXT-004',
        'BRO-1PLG-001', 'BRO-2PLG-002', 'BRO-3PLG-003', 'BRO-4PLG-004'
    );

    -- 3. Asegurar Bodegas
    SELECT id INTO v_bodega_central_id FROM public.bodegas WHERE codigo = 'BOD-001' LIMIT 1;
    
    INSERT INTO public.bodegas (id, distribuidor_id, nombre, codigo)
    VALUES ('c203bc99-9c0b-4ef8-bb6d-6bb9bd380c33', v_distribuidor_id, 'Bodega Norte', 'BOD-NORTE')
    ON CONFLICT (id) DO NOTHING;
    
    IF v_bodega_central_id IS NULL THEN
        v_bodega_central_id := 'b102bc99-9c0b-4ef8-bb6d-6bb9bd380b22';
    END IF;
    SELECT id INTO v_bodega_norte_id FROM public.bodegas WHERE nombre = 'Bodega Norte' LIMIT 1;

    -- 4. Insertar/Actualizar Productos (4 Rodillos)
    INSERT INTO public.productos (sku, nombre, descripcion, precio_base, categoria, imagen_url)
    VALUES 
        ('ROD-ECO-001', 'Rodillo Económico Felpa Corta', 'Ideal para superficies lisas, uso general.', 12000, 'Rodillos', ''),
        ('ROD-PRO-002', 'Rodillo Profesional Anti-Gota', 'Microfibra de alta densidad, acabado superior.', 25000, 'Rodillos', ''),
        ('ROD-TEX-003', 'Rodillo Texturizado', 'Para crear acabados con relieve y texturas.', 35000, 'Rodillos', ''),
        ('ROD-EXT-004', 'Rodillo Extensible 3m', 'Con mango telescópico para alturas.', 45000, 'Rodillos', '')
    ON CONFLICT (sku) DO UPDATE SET 
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        precio_base = EXCLUDED.precio_base,
        categoria = EXCLUDED.categoria,
        imagen_url = EXCLUDED.imagen_url;

    -- 5. Insertar/Actualizar Productos (4 Brochas)
    INSERT INTO public.productos (sku, nombre, descripcion, precio_base, categoria, imagen_url)
    VALUES 
        ('BRO-1PLG-001', 'Brocha Cerda Natural 1"', 'Para detalles y recortes.', 5000, 'Brochas', ''),
        ('BRO-2PLG-002', 'Brocha Cerda Natural 2"', 'Uso general en marcos y puertas.', 8500, 'Brochas', ''),
        ('BRO-3PLG-003', 'Brocha Sintética 3"', 'Para barnices y lacas, acabado fino.', 15000, 'Brochas', ''),
        ('BRO-4PLG-004', 'Brocha Profesional 4"', 'Gran cobertura para muros y fachadas.', 22000, 'Brochas', '')
    ON CONFLICT (sku) DO UPDATE SET 
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        precio_base = EXCLUDED.precio_base,
        categoria = EXCLUDED.categoria,
        imagen_url = EXCLUDED.imagen_url;

    -- Recuperar IDs
    SELECT id INTO v_rodillo1 FROM public.productos WHERE sku = 'ROD-ECO-001';
    SELECT id INTO v_rodillo2 FROM public.productos WHERE sku = 'ROD-PRO-002';
    SELECT id INTO v_rodillo3 FROM public.productos WHERE sku = 'ROD-TEX-003';
    SELECT id INTO v_rodillo4 FROM public.productos WHERE sku = 'ROD-EXT-004';
    
    SELECT id INTO v_brocha1 FROM public.productos WHERE sku = 'BRO-1PLG-001';
    SELECT id INTO v_brocha2 FROM public.productos WHERE sku = 'BRO-2PLG-002';
    SELECT id INTO v_brocha3 FROM public.productos WHERE sku = 'BRO-3PLG-003';
    SELECT id INTO v_brocha4 FROM public.productos WHERE sku = 'BRO-4PLG-004';

    -- 6. Asignar Stock Inicial (LIMPIO)
    DELETE FROM public.inventario_bodega WHERE producto_id IN (v_rodillo1, v_rodillo2, v_rodillo3, v_rodillo4, v_brocha1, v_brocha2, v_brocha3, v_brocha4);

    -- Bodega Central
    INSERT INTO public.inventario_bodega (bodega_id, producto_id, cantidad) VALUES
    (v_bodega_central_id, v_rodillo1, 120), (v_bodega_central_id, v_rodillo2, 85),
    (v_bodega_central_id, v_rodillo3, 40), (v_bodega_central_id, v_rodillo4, 25),
    (v_bodega_central_id, v_brocha1, 150), (v_bodega_central_id, v_brocha2, 100),
    (v_bodega_central_id, v_brocha3, 60), (v_bodega_central_id, v_brocha4, 45);

    -- Bodega Norte
    INSERT INTO public.inventario_bodega (bodega_id, producto_id, cantidad) VALUES
    (v_bodega_norte_id, v_rodillo2, 20),
    (v_bodega_norte_id, v_brocha4, 30);

END $$;
