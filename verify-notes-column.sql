-- Verificar que la columna notes existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
  AND column_name = 'notes';

-- Si NO existe, créala:
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS notes jsonb DEFAULT '[]'::jsonb;

-- Verificar que alguna orden tenga el campo:
SELECT id, status, notes 
FROM work_orders 
LIMIT 5;

-- Verificar políticas de RLS en work_orders
SELECT * FROM pg_policies 
WHERE tablename = 'work_orders';

-- Si RLS está bloqueando, crear política permisiva (solo para desarrollo):
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" 
ON work_orders 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Verificar si RLS está activado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'work_orders';







