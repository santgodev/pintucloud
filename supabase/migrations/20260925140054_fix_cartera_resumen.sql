CREATE OR REPLACE FUNCTION public.get_cartera_resumen()
RETURNS TABLE(
    total_pendiente numeric,
    facturas_vencidas integer,
    facturas_al_dia integer
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    hoy date := (now() at time zone 'America/Bogota')::date;
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(
            SUM(cp.saldo_actual) FILTER (
                WHERE cp.distribuidor_id = get_my_distribuidor_id()
                  AND cp.estado IN ('PENDIENTE', 'PARCIAL')
            ),
            0
        ) AS total_pendiente,

        COUNT(*) FILTER (
            WHERE cp.distribuidor_id = get_my_distribuidor_id()
              AND cp.estado IN ('PENDIENTE', 'PARCIAL')
              AND cp.fecha_vencimiento < hoy
        )::integer AS facturas_vencidas,

        COUNT(*) FILTER (
            WHERE cp.distribuidor_id = get_my_distribuidor_id()
              AND cp.estado IN ('PENDIENTE', 'PARCIAL')
              AND cp.fecha_vencimiento >= hoy
        )::integer AS facturas_al_dia

    FROM cuentas_por_pagar cp;
END;
$$;
