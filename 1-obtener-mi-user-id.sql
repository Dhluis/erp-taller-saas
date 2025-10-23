-- ═══════════════════════════════════════════════════════════════
-- 📝 PASO 1: OBTENER TU USER ID
-- ═══════════════════════════════════════════════════════════════

-- Ver todos los usuarios registrados
SELECT 
  id as user_id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════
-- 📋 INSTRUCCIONES:
-- ═══════════════════════════════════════════════════════════════
-- 1. Copia TODO este archivo
-- 2. Ve a Supabase Dashboard → SQL Editor
-- 3. Pega el contenido
-- 4. Click en "Run" (o Ctrl+Enter)
-- 5. En los resultados, busca TU EMAIL
-- 6. COPIA el "user_id" de tu fila (se ve algo así):
--    301eb55a-f6f9-449f-ab04-8dcf8fc081a6
-- 7. Guárdalo en un bloc de notas temporalmente
-- ═══════════════════════════════════════════════════════════════




