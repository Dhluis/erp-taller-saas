-- =====================================================
-- MIGRACIÓN 032: Actualizar límite de usuarios a 2 en plan free
-- Fecha: 2026-02-07
-- Descripción: Cambia el límite de usuarios de 1 a 2 en el plan free
-- =====================================================

-- Actualizar el límite en plan_limits
UPDATE plan_limits
SET limit_value = 2,
    description = 'Máximo de usuarios en plan gratis'
WHERE plan_tier = 'free' 
  AND feature_key = 'max_users';

-- Verificar el cambio
DO $$
DECLARE
  v_limit_value INTEGER;
BEGIN
  SELECT limit_value INTO v_limit_value
  FROM plan_limits
  WHERE plan_tier = 'free' 
    AND feature_key = 'max_users';
  
  IF v_limit_value = 2 THEN
    RAISE NOTICE '✅ Límite de usuarios actualizado correctamente a 2';
  ELSE
    RAISE WARNING '⚠️ El límite no se actualizó correctamente. Valor actual: %', v_limit_value;
  END IF;
END $$;
