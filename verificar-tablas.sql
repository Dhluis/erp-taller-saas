-- Script para verificar si las tablas críticas existen
-- Ejecutar este script en el SQL Editor de Supabase

-- Verificar tablas críticas
SELECT 
    'inventory_movements' as tabla,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'inventory_movements' 
        AND table_schema = 'public'
    ) THEN 'EXISTE' ELSE 'NO EXISTE' END as estado;

SELECT 
    'purchase_orders' as tabla,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'purchase_orders' 
        AND table_schema = 'public'
    ) THEN 'EXISTE' ELSE 'NO EXISTE' END as estado;

SELECT 
    'payments' as tabla,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'payments' 
        AND table_schema = 'public'
    ) THEN 'EXISTE' ELSE 'NO EXISTE' END as estado;

-- Verificar columnas críticas de inventory_movements
SELECT 
    'inventory_movements.movement_type' as columna,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'movement_type'
        AND table_schema = 'public'
    ) THEN 'EXISTE' ELSE 'NO EXISTE' END as estado;

SELECT 
    'inventory_movements.reference_type' as columna,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'reference_type'
        AND table_schema = 'public'
    ) THEN 'EXISTE' ELSE 'NO EXISTE' END as estado;

-- Verificar columnas críticas de purchase_orders
SELECT 
    'purchase_orders.order_date' as columna,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'order_date'
        AND table_schema = 'public'
    ) THEN 'EXISTE' ELSE 'NO EXISTE' END as estado;

SELECT 
    'purchase_orders.subtotal' as columna,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'subtotal'
        AND table_schema = 'public'
    ) THEN 'EXISTE' ELSE 'NO EXISTE' END as estado;

SELECT 
    'purchase_orders.tax_amount' as columna,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'tax_amount'
        AND table_schema = 'public'
    ) THEN 'EXISTE' ELSE 'NO EXISTE' END as estado;

SELECT 
    'purchase_orders.total' as columna,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'total'
        AND table_schema = 'public'
    ) THEN 'EXISTE' ELSE 'NO EXISTE' END as estado;

-- Verificar columnas críticas de payments
SELECT 
    'payments.payment_date' as columna,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'payment_date'
        AND table_schema = 'public'
    ) THEN 'EXISTE' ELSE 'NO EXISTE' END as estado;

SELECT 
    'payments.amount' as columna,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'amount'
        AND table_schema = 'public'
    ) THEN 'EXISTE' ELSE 'NO EXISTE' END as estado;



