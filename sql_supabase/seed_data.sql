-- ==========================================
-- SCRIPT DE DATOS INICIALES (SEED)
-- Ejecutar en Supabase SQL Editor
-- ==========================================

DO $$
DECLARE
    v_distribuidor_id UUID;
    v_bodega_id UUID;
    v_user_id UUID;
    v_products jsonb;
    v_product record;
    v_new_product_id UUID;
BEGIN
    -- 1. Crear Distribuidor (Idempotente)
    SELECT id INTO v_distribuidor_id FROM public.distribuidores WHERE nit = '900.123.456-7';
    
    IF v_distribuidor_id IS NULL THEN
        INSERT INTO public.distribuidores (nombre_comercial, nit, estado)
        VALUES ('Ferretería El Maestro', '900.123.456-7', true)
        RETURNING id INTO v_distribuidor_id;
    END IF;

    -- 2. Crear Bodega Principal (Idempotente)
    SELECT id INTO v_bodega_id FROM public.bodegas WHERE distribuidor_id = v_distribuidor_id AND codigo = 'BOD-001';

    IF v_bodega_id IS NULL THEN
        INSERT INTO public.bodegas (distribuidor_id, nombre, codigo, direccion, activo)
        VALUES (v_distribuidor_id, 'Bodega Central', 'BOD-001', 'Calle 80 # 12-34, Bogotá', true)
        RETURNING id INTO v_bodega_id;
    END IF;

    -- 3. Crear Usuario (Vincular con auth.users si existe, o preparar el terreno)
    -- NOTA: Primero debes crear el usuario 'santgodev@gmail.com' en Authentication > Users
    -- Buscamos si existe el usuario en auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'santgodev@gmail.com';

    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.usuarios (id, distribuidor_id, rol, bodega_asignada_id, nombre_completo, email)
        VALUES (v_user_id, v_distribuidor_id, 'admin_distribuidor', NULL, 'Santiago Dev', 'santgodev@gmail.com')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 4. Migrar Productos (Del Frontend al Backend)
    v_products := '[
        {
            "sku": "ROD-001", "name": "Rodillo Titanio Pro", "category": "rodillos",
            "price": 35000, "imageUrl": "/rodillos/roller-1.jpeg",
            "description": "Máxima cobertura con tecnología de microfibra. Diseñado para resistencia profesional."
        },
        {
            "sku": "BRO-001", "name": "Brocha de Precisión", "category": "brochas",
            "price": 18500, "imageUrl": "/brochas/brush-1.jpeg",
            "description": "Cerdas angulares para cortes perfectos y trabajos de moldura."
        },
        {
            "sku": "ACC-001", "name": "Bandeja Resistente", "category": "accesorios",
            "price": 12900, "imageUrl": "/rodillos/roller-3.jpeg",
            "description": "Bandeja de pozo profundo resistente a impactos."
        },
        {
            "sku": "ROD-002", "name": "Rodillo Master Finish 9\"", "category": "rodillos",
            "price": 24000, "imageUrl": "/rodillos/roller-4.jpeg",
            "description": "El estándar de la industria para acabados suaves."
        },
        {
            "sku": "PRO-001", "name": "Cinta CleanEdge", "category": "proteccion",
            "price": 8500, "imageUrl": "/rodillos/roller-5.jpeg",
            "description": "Líneas nítidas cada vez. No deja residuos."
        },
        {
            "sku": "BRO-002", "name": "Brocha Angular Maestra", "category": "brochas",
            "price": 22000, "imageUrl": "/brochas/brush-2.jpeg",
            "description": "Diseño angular para esquinas difíciles."
        },
        {
            "sku": "BRO-003", "name": "Kit Brochas Decoración", "category": "brochas",
            "price": 45000, "imageUrl": "/brochas/brush-3.jpeg",
            "description": "Set completo para acabados finos y texturas especiales."
        },
        {
            "sku": "BRO-004", "name": "Brocha Cerda Natural", "category": "brochas",
            "price": 15000, "imageUrl": "/brochas/brush-4.jpeg",
            "description": "Clásica brocha de cerda natural para barnices y aceites."
        },
        {
            "sku": "ROD-003", "name": "Rodillo Anti-Gota", "category": "rodillos",
            "price": 28000, "imageUrl": "/rodillos/roller-2.jpeg",
            "description": "Tecnología avanzada para evitar salpicaduras."
        },
        {
            "sku": "ROD-004", "name": "Rodillo Microfibra XL 12\"", "category": "rodillos",
            "price": 42000, "imageUrl": "/rodillos/roller-5.jpeg",
            "description": "Mayor superficie de cubrimiento para grandes proyectos."
        }
    ]'::jsonb;

    FOR v_product IN SELECT * FROM jsonb_to_recordset(v_products) AS x(sku text, name text, category text, price numeric, imageUrl text, description text)
    LOOP
        -- Insertar Producto (Idempotente)
        SELECT id INTO v_new_product_id FROM public.productos WHERE sku = v_product.sku;
        
        IF v_new_product_id IS NULL THEN
            INSERT INTO public.productos (sku, nombre, descripcion, imagen_url, precio_base, unidad_medida)
            VALUES (v_product.sku, v_product.name, v_product.description, v_product.imageUrl, v_product.price, 'UN')
            RETURNING id INTO v_new_product_id;
        END IF;

        -- Añadir Categoria (se maneja fuera del loop si es necesario actualizar)
    END LOOP;

    -- Añadir Stock de Ejemplo (Idempotente)
    INSERT INTO public.inventario_bodega (bodega_id, producto_id, cantidad)
    SELECT v_bodega_id, id, 100 FROM public.productos p
    WHERE NOT EXISTS (SELECT 1 FROM public.inventario_bodega i WHERE i.bodega_id = v_bodega_id AND i.producto_id = p.id);

    -- 5. Crear Clientes (Seed)
    IF NOT EXISTS (SELECT 1 FROM public.clientes WHERE distribuidor_id = v_distribuidor_id LIMIT 1) THEN
        INSERT INTO public.clientes (distribuidor_id, nombre, direccion, zona, ultima_compra)
        VALUES 
        (v_distribuidor_id, 'Ferretería Central', 'Cra 15 #45-12, Bogotá', 'Zona Norte', NOW() - INTERVAL '2 days'),
        (v_distribuidor_id, 'Depósito El Constructor', 'Av Caracas #20-10, Bogotá', 'Zona Sur', NOW() - INTERVAL '1 week'),
        (v_distribuidor_id, 'Materiales & Acabados', 'Clle 80 #68-40, Bogotá', 'Zona Occidente', NOW() - INTERVAL '1 day');
    END IF;

    -- 6. Crear una Venta de Ejemplo (Seed)
    DECLARE
        v_venta_id UUID;
        v_cliente_id UUID;
        v_producto1_id UUID;
    BEGIN
        SELECT id INTO v_cliente_id FROM public.clientes WHERE nombre = 'Ferretería Central' LIMIT 1;
        SELECT id INTO v_producto1_id FROM public.productos WHERE sku = 'ROD-001' LIMIT 1;

        IF v_cliente_id IS NOT NULL AND v_producto1_id IS NOT NULL THEN
            INSERT INTO public.ventas (distribuidor_id, cliente_id, usuario_id, total, estado, fecha)
            VALUES (v_distribuidor_id, v_cliente_id, v_user_id, 350000, 'completado', NOW())
            RETURNING id INTO v_venta_id;

            INSERT INTO public.detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
            VALUES (v_venta_id, v_producto1_id, 10, 35000, 350000);
        END IF;
    END;

END $$;

-- CORRECCIÓN FINAL: Añadir columna categoria a productos si olvidamos ponerla en el esquema inicial, ya que el frontend la usa.
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS categoria TEXT;

-- Actualizar categorías basadas en SKUs conocidos (Script de corrección)
UPDATE public.productos SET categoria = 'rodillos' WHERE sku LIKE 'ROD-%';
UPDATE public.productos SET categoria = 'brochas' WHERE sku LIKE 'BRO-%';
UPDATE public.productos SET categoria = 'accesorios' WHERE sku LIKE 'ACC-%';
UPDATE public.productos SET categoria = 'proteccion' WHERE sku LIKE 'PRO-%';
