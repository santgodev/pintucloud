-- 1. Agregar columna JSONB para atributos (Color, Tamaño, etc.)
ALTER TABLE public.productos 
ADD COLUMN IF NOT EXISTS atributos JSONB DEFAULT '{}'::jsonb;

-- 2. Insertar PRODUCTOS DE EJEMPLO (Como solicitaste)
INSERT INTO public.productos (sku, nombre, descripcion, precio_base, categoria, imagen_url, atributos)
VALUES 
(
    'SKU-EJEMPLO-1', 
    'RODILLO EJEMPLO 1', 
    'Descripción de prueba para rodillo 1', 
    100.00, 
    'Rodillos',
    'https://placehold.co/400x400', -- Imagen genérica
    '{"color": "Rojo", "tamano": "9 pulgadas"}'::jsonb
),
(
    'SKU-EJEMPLO-2', 
    'RODILLO EJEMPLO 2', 
    'Descripción de prueba para rodillo 2', 
    200.00, 
    'Rodillos', 
    'https://placehold.co/400x400', 
    '{"color": "Verde", "tamano": "12 pulgadas"}'::jsonb
)
ON CONFLICT (sku) DO UPDATE 
SET atributos = EXCLUDED.atributos;

-- 3. Verificar
SELECT sku, nombre, atributos FROM public.productos WHERE sku LIKE 'SKU-EJEMPLO%';
