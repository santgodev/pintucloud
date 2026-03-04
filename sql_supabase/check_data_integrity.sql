-- =================================================================
-- SCRIPT DE VERIFICACIÓN DE INTEGRIDAD DE DATOS
-- Ejecuta esto en el SQL Editor de Supabase
-- =================================================================

-- PASO 1: Verificar Usuarios (Auth vs Public)
SELECT 
    'PASO 1: Verificación de Usuario' as check_type,
    au.id as auth_id, 
    au.email as auth_email, 
    pu.id as public_id, 
    pu.nombre_completo,
    pu.distribuidor_id,
    CASE 
        WHEN au.id = pu.id THEN '✅ ID Coincide' 
        ELSE '❌ ID No Coincide' 
    END as validacion_id,
    CASE 
        WHEN pu.distribuidor_id IS NOT NULL THEN '✅ Distribuidor Asignado' 
        ELSE '❌ Distribuidor es NULL' 
    END as validacion_distribuidor
FROM auth.users au
LEFT JOIN public.usuarios pu ON au.id = pu.id
-- Si quieres filtrar por un email específico, descomenta la siguiente línea:
-- WHERE au.email = 'santgodev@gmail.com';

-- Separador visual
UNION ALL 
SELECT '--------------------------------', NULL, NULL, NULL, NULL, NULL, NULL, NULL;

-- PASO 2: Verificar Coherencia de Ventas
SELECT 
    'PASO 2: Verificación de Ventas' as check_type,
    v.id as venta_id, 
    NULL as auth_email,
    v.usuario_id as vendedor_id,
    u.nombre_completo as vendedor_nombre,
    v.distribuidor_id as venta_dist_id,
    CASE 
        WHEN v.distribuidor_id = u.distribuidor_id THEN '✅ Coincide (Venta del mismo distribuidor del usuario)' 
        ELSE '❌ ALERTA: Venta asignada a distribuidor diferente al del usuario' 
    END as validacion_integridad,
    NULL as extra
FROM public.ventas v
JOIN public.usuarios u ON v.usuario_id = u.id;
