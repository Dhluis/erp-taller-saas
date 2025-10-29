-- Ver TODAS las políticas activas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('customers', 'vehicles', 'work_orders', 'employees', 'users')
ORDER BY tablename, policyname;
