-- ==========================================
-- ACTUALIZACIÓN DE ESQUEMA: GESTIÓN DE USUARIOS Y ALMACENAMIENTO DE FOTOS
-- ==========================================

-- 1. Habilitar Almacenamiento (Storage) para Productos
-- Insertar el bucket 'productos' si no existe (la inserción debe hacerse vía API o Dashboard, 
-- pero aquí definimos las políticas asumiendo que el bucket se llama 'productos')

-- Política: Cualquiera puede ver imágenes (Público)
-- Nota: En Supabase Storage, las políticas se aplican sobre la tabla storage.objects

-- Permitir acceso público de lectura al bucket 'productos'
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'productos');

-- Permitir subida a usuarios autenticados
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'productos' AND auth.role() = 'authenticated'
);

-- 2. Actualizar Tabla Clientes: Relación con Asesor
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES public.usuarios(id);

-- Actualizar Políticas de Clientes
-- El distribuidor (admin) puede ver todos los clientes de su distribuidor
-- El asesor SOLO puede ver los clientes asignados a él (usuario_id) O si es admin ve todos

DROP POLICY IF EXISTS "Gestionar con clientes" ON public.clientes;

CREATE POLICY "Admin ve todos los clientes" ON public.clientes
AS PERMISSIVE FOR ALL
USING (
  distribuidor_id = get_my_distribuidor_id() 
  AND get_my_role() = 'admin_distribuidor'
);

CREATE POLICY "Asesor ve sus clientes asignados" ON public.clientes
AS PERMISSIVE FOR ALL
USING (
  distribuidor_id = get_my_distribuidor_id()
  AND usuario_id = auth.uid()
);

-- ==========================================
-- 3. DATOS DE SEED (EJEMPLO)
-- ==========================================
-- Instrucciones:
-- 1. Ejecuta este script el SQL Editor de Supabase.
-- 2. Si fallan las políticas de storage, asegúrate de crear primero el bucket 'productos' con la opción "Public" habilitada.

-- A. Distribuidor Principal
INSERT INTO public.distribuidores (id, nombre_comercial, nit)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pinturas del Norte', '900555666-1')
ON CONFLICT DO NOTHING;

-- B. Bodega Principal
INSERT INTO public.bodegas (id, distribuidor_id, nombre, codigo)
VALUES 
  ('b102bc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Bodega Central', 'BOD-001')
ON CONFLICT DO NOTHING;

-- C. Usuarios (Simulados - Debes crear estos usuarios en Auth con estos IDs o actualizar la tabla luego)
-- Debido a que 'usuarios.id' es FK de 'auth.users', NO podemos insertar aquí directamente si el usuario no existe en Auth.
-- SOLUCIÓN: Usaremos una función auxiliar (si tuviera permisos de superadmin) o dejaremos los datos comentados para referencia.

/*
  DATOS PARA REGISTRAR EN AUTH (SIGN UP):
  1. Admin Distribuidor:
     Email: admin@pinturasnorte.com
     rol: admin_distribuidor
  
  2. Asesor 1:
     Email: asesor1@pinturasnorte.com
     rol: asesor
  
  3. Asesor 2:
     Email: asesor2@pinturasnorte.com
     rol: asesor
*/

-- D. Clientes de Ejemplo (Asumiendo que luego asignarás los usuario_id correctos)
INSERT INTO public.clientes (distribuidor_id, nombre, email, zona)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Ferretería El Martillo', 'contacto@elmartillo.com', 'Norte'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Constructora Sólida', 'compras@solida.co', 'Sur')
ON CONFLICT DO NOTHING;
