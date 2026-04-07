-- ==========================================
-- 02_SEGURIDAD_Y_PERMISOS (RLS)
-- ==========================================

-- 1. HABILITAR RLS EN TODAS LAS TABLAS
ALTER TABLE public.distribuidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bodegas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_bodega ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonos_cartera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_por_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- 2. FUNCIONES DE AYUDA (SEGURIDAD)
CREATE OR REPLACE FUNCTION get_my_distribuidor_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT distribuidor_id FROM public.usuarios WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS rol_usuario LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_assigned_bodega()
RETURNS UUID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT bodega_asignada_id FROM public.usuarios WHERE id = auth.uid();
$$;

-- 3. POLÍTICAS POR TABLA

-- A. DISTRIBUIDORES
CREATE POLICY "Ver propio distribuidor" ON public.distribuidores FOR SELECT USING (id = get_my_distribuidor_id());

-- B. BODEGAS
CREATE POLICY "Admin gestiona bodegas" ON public.bodegas USING (distribuidor_id = get_my_distribuidor_id() AND get_my_role() = 'admin_distribuidor');
CREATE POLICY "Asesor ve su bodega" ON public.bodegas FOR SELECT USING (id = get_my_assigned_bodega() AND get_my_role() = 'asesor');

-- C. USUARIOS
CREATE POLICY "Admin gestiona usuarios" ON public.usuarios USING (distribuidor_id = get_my_distribuidor_id() AND get_my_role() = 'admin_distribuidor');
CREATE POLICY "Propio perfil" ON public.usuarios FOR SELECT USING (id = auth.uid());

-- D. PRODUCTOS
CREATE POLICY "Acceso por distribuidor" ON public.productos USING (distribuidor_id = get_my_distribuidor_id());
CREATE POLICY "Admin modifica productos" ON public.productos FOR ALL USING (get_my_role() = 'admin_distribuidor');

-- E. CLIENTES
CREATE POLICY "Acceso total por distribuidor" ON public.clientes USING (distribuidor_id = get_my_distribuidor_id());

-- F. INVENTARIO
CREATE POLICY "Acceso a inventario por bodega" ON public.inventario_bodega 
USING (
    bodega_id IN (SELECT id FROM public.bodegas WHERE distribuidor_id = get_my_distribuidor_id())
    AND (get_my_role() = 'admin_distribuidor' OR bodega_id = get_my_assigned_bodega())
);

-- G. VENTAS
CREATE POLICY "Ventas por distribuidor" ON public.ventas USING (distribuidor_id = get_my_distribuidor_id());
CREATE POLICY "Detalle ventas por distribuidor" ON public.detalle_ventas 
USING (venta_id IN (SELECT id FROM public.ventas WHERE distribuidor_id = get_my_distribuidor_id()));

-- H. COMPRAS Y PROVEEDORES
CREATE POLICY "Admin gestiona proveedores" ON public.proveedores USING (distribuidor_id = get_my_distribuidor_id() AND get_my_role() = 'admin_distribuidor');
CREATE POLICY "Admin gestiona compras" ON public.compras USING (distribuidor_id = get_my_distribuidor_id() AND get_my_role() = 'admin_distribuidor');
CREATE POLICY "Detalle compras" ON public.compras_detalle USING (compra_id IN (SELECT id FROM public.compras WHERE distribuidor_id = get_my_distribuidor_id()));

-- I. FINANZAS
CREATE POLICY "Gestion cartera" ON public.abonos_cartera USING (distribuidor_id = get_my_distribuidor_id());
CREATE POLICY "Cuentas por pagar" ON public.cuentas_por_pagar USING (distribuidor_id = get_my_distribuidor_id() AND get_my_role() = 'admin_distribuidor');
CREATE POLICY "Pagos proveedores" ON public.pagos_proveedores USING (distribuidor_id = get_my_distribuidor_id() AND get_my_role() = 'admin_distribuidor');

-- J. AUDITORIA
CREATE POLICY "Admin ve auditoria" ON public.auditoria_usuarios FOR SELECT USING (get_my_role() = 'admin_distribuidor');
