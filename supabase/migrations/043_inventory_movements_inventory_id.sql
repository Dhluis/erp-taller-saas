-- ============================================================
-- Migration 043: inventory_id en inventory_movements
-- Para módulo de Paquetes de Servicio que usa tabla inventory
-- product_id puede referenciar products; inventory_id referencia inventory
-- ============================================================

-- 1. Agregar columna inventory_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventory_movements'
      AND column_name = 'inventory_id'
  ) THEN
    ALTER TABLE public.inventory_movements
    ADD COLUMN inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Permitir product_id NULL para inserts que usan solo inventory_id (módulo paquetes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventory_movements'
      AND column_name = 'product_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.inventory_movements
    ALTER COLUMN product_id DROP NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'product_id DROP NOT NULL: %', SQLERRM;
END $$;
