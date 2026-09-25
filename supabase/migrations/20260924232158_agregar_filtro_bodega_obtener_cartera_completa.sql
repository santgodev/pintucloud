-- Migración: agregar soporte de filtro por bodega en obtener_cartera_completa
-- Se elimina la firma de 5 parámetros y se reemplaza con una de 6 (p_bodega_id DEFAULT NULL).
-- Con un único overload no hay ambigüedad. Todas las llamadas existentes de 5 parámetros
-- seguirán resolviendo porque p_bodega_id tiene DEFAULT NULL.

-- Eliminar firma anterior de 5 parámetros si existe
DROP FUNCTION IF EXISTS public.obtener_cartera_completa(text, text, date, date, uuid);

CREATE OR REPLACE FUNCTION "public"."obtener_cartera_completa"(
    "p_search"      "text" DEFAULT ''::text,
    "p_estado"      "text" DEFAULT ''::text,
    "p_fecha_desde" "date" DEFAULT NULL::date,
    "p_fecha_hasta" "date" DEFAULT NULL::date,
    "p_asesor_id"   "uuid" DEFAULT NULL::uuid,
    "p_bodega_id"   "uuid" DEFAULT NULL::uuid
)
RETURNS TABLE(
    "venta_id"               "uuid",
    "numero_factura"         bigint,
    "fecha"                  "date",
    "cliente"                "text",
    "total_factura"          numeric,
    "saldo_pendiente"        numeric,
    "fecha_vencimiento"      "date",
    "estado"                 "text",
    "vendedor"               "text",
    "observaciones"          "text",
    "tipo_documento"         integer,
    "entrega_transportadora" boolean,
    "nombre_bodega"          "text"
)
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
    v_distribuidor_id UUID;
BEGIN
    -- Obtenemos el distribuidor del usuario que llama
    v_distribuidor_id := get_my_distribuidor_id();

    RETURN QUERY
    SELECT
        c.venta_id,
        v.numero_factura,
        v.fecha,
        cl.razon_social AS cliente,
        v.total AS total_factura,
        c.saldo_actual AS saldo_pendiente,
        c.fecha_vencimiento,
        c.estado::TEXT,
        u.nombre_completo AS vendedor,
        v.observaciones,
        v.tipo_documento,
        v.entrega_transportadora,
        b.nombre AS nombre_bodega
    FROM cuentas_por_cobrar c
    JOIN ventas v ON c.venta_id = v.id
    JOIN clientes cl ON c.cliente_id = cl.id
    JOIN bodegas b ON v.bodega_id = b.id
    LEFT JOIN usuarios u ON v.usuario_id = u.id
    WHERE c.distribuidor_id = v_distribuidor_id
      AND c.estado <> 'ANULADA'
      AND (p_estado = '' OR c.estado::TEXT = p_estado)
      AND (p_asesor_id IS NULL OR v.usuario_id = p_asesor_id)
      AND (p_fecha_desde IS NULL OR v.fecha >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR v.fecha <= p_fecha_hasta)
      AND (p_search = '' OR cl.razon_social ILIKE '%' || p_search || '%' OR v.numero_factura::TEXT ILIKE '%' || p_search || '%')
      AND (p_bodega_id IS NULL OR v.bodega_id = p_bodega_id)
    ORDER BY c.fecha_vencimiento ASC;
END;
$$;
