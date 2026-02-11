# Arquitectura SaaS Multi-tenant: Sistema de Gestión de Inventarios

## 1. Visión General del Sistema
Diseño de arquitectura para una plataforma SaaS B2B de gestión de inventarios y ventas en campo. El sistema implementa un modelo **Multi-tenant con Aislamiento Lógico** basado en **Supabase (PostgreSQL)**.

El núcleo de la seguridad reside en **Row Level Security (RLS)**, garantizando que los datos de cada *Distribuidor* (Inquilino) sean completamente inaccesibles para otros.

---

## 2. Modelo de Dominio

### Entidades Principales
1.  **Distribuidor (Tenant)**: La organización cliente que contrata el servicio. Es la raíz de la jerarquía de datos.
2.  **Usuario**: Actor autenticado. Pertenece estrictamente a un único Distribuidor.
    *   **Roles**:
        *   `admin_distribuidor`: Acceso total a los recursos del distribuidor (múltiples bodegas, usuarios, reportes).
        *   `asesor`: Acceso restringido. Solo puede operar sobre el inventario de su **Bodega Asignada**.
3.  **Bodega (Warehouse)**: Punto de almacenamiento físico. Un distribuidor tiene `N` bodegas.
4.  **Producto**: Definición global o catálogo maestro.
5.  **Inventario**: Tabla pivote que relaciona `Bodega` <-> `Producto` con una cantidad (`existencias`).

### Diagrama de Relaciones Lógicas
`Distribuidor` 1 <--- N `Usuario`
`Distribuidor` 1 <--- N `Bodega`
`Usuario` (Asesor) --- 1 `Bodega` (Asignación)
`Bodega` 1 <--- N `Inventario`
`Producto` 1 <--- N `Inventario`

---

## 3. Arquitectura de Base de Datos (Supabase / PostgreSQL)

### Convenciones
*   **Idioma**: Todo el esquema (tablas, columnas, funciones) en **Español**.
*   **IDs**: UUID v4 para todas las claves primarias.
*   **Seguridad**: RLS habilitado en TODAS las tablas públicas.

### Esquema SQL (DDL)

```sql
-- ENUMS
CREATE TYPE rol_usuario AS ENUM ('admin_distribuidor', 'asesor');

-- 1. DISTRIBUIDORES (TENANTS)
CREATE TABLE public.distribuidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_comercial TEXT NOT NULL,
    nit TEXT UNIQUE NOT NULL,
    estado BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BODEGAS
CREATE TABLE public.bodegas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribuidor_id UUID NOT NULL REFERENCES public.distribuidores(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    codigo TEXT NOT NULL,
    direccion TEXT,
    ubicacion GEOGRAPHY(POINT), -- Soporte geoespacial para mapas
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PERFILES DE USUARIO (Extensión de auth.users)
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- Vinculado a Supabase Auth
    distribuidor_id UUID NOT NULL REFERENCES public.distribuidores(id),
    rol rol_usuario NOT NULL DEFAULT 'asesor',
    bodega_asignada_id UUID REFERENCES public.bodegas(id), -- Solo para rol 'asesor'
    nombre_completo TEXT NOT NULL,
    email TEXT NOT NULL, -- Copia por conveniencia de lectura
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: Un asesor DEBE tener bodega asignada
    CONSTRAINT check_asesor_bodega CHECK (
        (rol = 'asesor' AND bodega_asignada_id IS NOT NULL) OR 
        (rol = 'admin_distribuidor')
    )
);

-- 4. PRODUCTOS (Catálogo Global del Distribuidor o Sistema)
-- Asumimos catálogo global del sistema, pero filtrable si es necesario.
-- Si cada distribuidor crea sus productos, añadir distribuidor_id.
CREATE TABLE public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    imagen_url TEXT,
    precio_base NUMERIC(12,2) NOT NULL DEFAULT 0,
    unidad_medida TEXT DEFAULT 'UN',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INVENTARIO (Tabla Transaccional)
CREATE TABLE public.inventario_bodega (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bodega_id UUID NOT NULL REFERENCES public.bodegas(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id),
    cantidad NUMERIC(12,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(bodega_id, producto_id) -- Un registro por producto por bodega
);

-- Índices de Rendimiento
CREATE INDEX idx_bodegas_distribuidor ON public.bodegas(distribuidor_id);
CREATE INDEX idx_usuarios_distribuidor ON public.usuarios(distribuidor_id);
CREATE INDEX idx_inventario_bodega ON public.inventario_bodega(bodega_id);
CREATE INDEX idx_inventario_producto ON public.inventario_bodega(producto_id);

-- Habilitar RLS
ALTER TABLE public.distribuidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bodegas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY; -- Lectura pública o auth
ALTER TABLE public.inventario_bodega ENABLE ROW LEVEL SECURITY;
```

---

## 4. Estrategia de Seguridad (RLS Policies)

El sistema utiliza funciones de ayuda (Helpers) para optimizar las políticas y evitar joins repetitivos.

### Funciones Helper (Security Definer)

```sql
-- Obtener ID del distribuidor del usuario actual
CREATE OR REPLACE FUNCTION get_my_distribuidor_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER AS $$
  SELECT distribuidor_id FROM public.usuarios WHERE id = auth.uid();
$$;

-- Obtener Rol del usuario actual
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS rol_usuario LANGUAGE sql SECURITY DEFINER AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid();
$$;

-- Obtener Bodega Asignada del usuario actual (si es asesor)
CREATE OR REPLACE FUNCTION get_my_assigned_bodega()
RETURNS UUID LANGUAGE sql SECURITY DEFINER AS $$
  SELECT bodega_asignada_id FROM public.usuarios WHERE id = auth.uid();
$$;
```

### Políticas RLS (Políticas de Aislamiento)

#### 1. Tabla `distribuidores`
*   **Lectura**: Un usuario solo puede ver su propio distribuidor.
    ```sql
    CREATE POLICY "Ver propio distribuidor" ON public.distribuidores
    FOR SELECT USING (id = get_my_distribuidor_id());
    ```

#### 2. Tabla `bodegas`
*   **Admin Distribuidor**: Puede ver/editar TODAS las bodegas de su distribuidor.
*   **Asesor**: Solo puede ver su bodega asignada.
    ```sql
    CREATE POLICY "Admin gestiona bodegas" ON public.bodegas
    USING (
      distribuidor_id = get_my_distribuidor_id() 
      AND get_my_role() = 'admin_distribuidor'
    );

    CREATE POLICY "Asesor ve su bodega" ON public.bodegas
    FOR SELECT USING (
      id = get_my_assigned_bodega()
      AND get_my_role() = 'asesor'
    );
    ```

#### 3. Tabla `inventario_bodega` (CRÍTICO)
*   Define qué stock puede ver/vender el usuario.
    ```sql
    CREATE POLICY "Acceso a inventario" ON public.inventario_bodega
    USING (
      -- El inventario pertenece a una bodega...
      bodega_id IN (
        SELECT id FROM public.bodegas 
        WHERE 
          -- ...que pertenece a mi distribuidor (Si soy Admin)
          (distribuidor_id = get_my_distribuidor_id() AND get_my_role() = 'admin_distribuidor')
          OR 
          -- ...o que es mi bodega asignada (Si soy Asesor)
          (id = get_my_assigned_bodega() AND get_my_role() = 'asesor')
      )
    );
    ```

#### 4. Tabla `usuarios`
*   **Admin**: Ve todos los usuarios de su tenant.
*   **Todos**: Ven su propio perfil.
    ```sql
    CREATE POLICY "Aislamiento de Usuarios" ON public.usuarios
    USING (
      distribuidor_id = get_my_distribuidor_id()
    );
    ```

---

## 5. Integración con Frontend (Angular)

Se aprovechará la estructura modular existente. No es necesario reescribir la UI, solo conectar los servicios.

### Adaptación de Modelos (`src/app/models/`)
Actualizar las interfaces para coincidir con la BD:

```typescript
export type UserRole = 'admin_distribuidor' | 'asesor';

export interface User {
    id: string; // UUID
    distribuidorId: string;
    role: UserRole;
    bodegaAsignadaId?: string; // Null si es admin
    fullName: string;
    email: string;
}

export interface InventoryItem {
    id: string;
    bodegaId: string;
    description: string; // Join con productos
    quantity: number;
}
```

### Servicios Clave (`src/app/core/services/`)
1.  **`SupabaseService`**: Wrapper singleton para el cliente `supabase-js`.
2.  **`AuthService`**: Gestiona login, sesión y carga el perfil de `public.usuarios` tras la autenticación.
3.  **`InventoryService`**:
    *   Método `getInventory()`: Automáticamente filtrado por la base de datos gracias a RLS. El frontend no necesita enviar filtros de seguridad complejos, solo `supabase.from('inventario_bodega').select(...)`.

### Escalabilidad Futura
*   **Particionamiento**: Si la tabla `inventario_bodega` crece a millones de filas, particionar por `distribuidor_id` (requiere denormalizar columna en inventario).
*   **Roles Custom**: Migrar columna `rol` a tabla `roles` y `permisos` si se requiere granularidad (ej: "Supervisor de Zona").
*   **Offline Mode**: Supabase tiene buen soporte para sincronización, clave para ventas en campo (PWA).

---

**Nota del Arquitecto**: Este diseño prioriza la seguridad por defecto. Un error en el frontend nunca expondrá datos de otro tenant porque la base de datos rechazaría la consulta a nivel de fila.
