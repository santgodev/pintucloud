-- ====================================================================
-- ACTUALIZACIÓN: AGREGAR CIUDAD A CLIENTES
-- ====================================================================

-- 1. Agregar Columna Ciudad
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'ciudad') THEN
        ALTER TABLE public.clientes ADD COLUMN ciudad TEXT DEFAULT 'Barranquilla';
    END IF;
END $$;

-- 2. Actualizar Clientes Existentes (Seed aleatorio de ciudades)

-- Asignar Santa Marta a algunos
UPDATE public.clientes 
SET ciudad = 'Santa Marta' 
WHERE nombre LIKE '%Restaurante%' 
   OR nombre LIKE '%Ferretería%' 
   OR email LIKE '%jaramillo%'
   OR zona = 'Norte';

-- Asignar Medellín a otros
UPDATE public.clientes 
SET ciudad = 'Medellín' 
WHERE nombre LIKE '%Constructora%'
   OR email LIKE '%andes%'
   OR zona = 'Sur';

-- Asignar Barranquilla al resto (O a específicos)
UPDATE public.clientes 
SET ciudad = 'Barranquilla' 
WHERE ciudad IS NULL OR ciudad = 'Barranquilla'; -- Redundante pero explícito para el script seed si ya había default

-- 3. Asegurar que las consultas futuras incluyan la ciudad
-- (Este paso es conceptual, se debe actualizar el código de la app)
