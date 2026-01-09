# Fix: Error RLS en work_orders INSERT

## 🔴 Problema

Error al crear órdenes de trabajo:
```
new row violates row-level security policy for table "work_orders"
```

Los datos que se insertan son correctos:
```json
{
  "organization_id": "b3962fe4-d238-42bc-9455-4ed84a38c6b4",
  "workshop_id": null,
  "customer_id": "39759ba4-b3b6-42af-8a64-cc0e376e9eec",
  "vehicle_id": "e99dbece-573d-40f9-85f6-cc46dd6d581e"
}
```

## ✅ Solución

### Paso 1: Ejecutar Script SQL en Supabase

1. Abre **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (menú lateral izquierdo)
4. Crea una nueva query
5. Copia y pega el contenido de `scripts/fix-work-orders-rls-insert-policy.sql`
6. Haz clic en **Run** (o presiona `Ctrl+Enter`)

### Paso 2: Verificar que las políticas se crearon

Ejecuta esta query en Supabase SQL Editor:

```sql
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'work_orders'
ORDER BY policyname, cmd;
```

Deberías ver 4 políticas:
- `work_orders_insert_policy` (INSERT)
- `work_orders_select_policy` (SELECT)
- `work_orders_update_policy` (UPDATE)
- `work_orders_delete_policy` (DELETE)

### Paso 3: Probar creación de orden

1. Intenta crear una orden de trabajo desde el frontend
2. Si falla, revisa los logs de Vercel para ver los datos exactos que se insertan
3. Verifica que el `organization_id` en los logs coincide con tu `organization_id` en la tabla `users`

## 📋 Política RLS INSERT (SQL Exacto)

```sql
CREATE POLICY "work_orders_insert_policy" ON public.work_orders
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
    AND organization_id IS NOT NULL
  )
);
```

## 🔍 Diagnóstico

Si el error persiste después de ejecutar el script:

1. **Verificar que el usuario tiene organization_id:**
   ```sql
   SELECT id, auth_user_id, organization_id 
   FROM users 
   WHERE auth_user_id = auth.uid();
   ```

2. **Verificar que la organización existe:**
   ```sql
   SELECT id, name 
   FROM organizations 
   WHERE id = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4';
   ```

3. **Ver logs de Vercel:**
   - Busca logs que empiezan con `[POST /api/work-orders] 📦 DATOS PARA INSERTAR:`
   - Verifica que `organization_id` en los logs coincide con tu `organization_id` en la tabla `users`

## 📝 Notas

- La política **NO valida** `workshop_id` - puede ser `NULL`
- La política **SOLO valida** que `organization_id` coincida con la del usuario autenticado
- La política usa `TO authenticated` para asegurar que solo usuarios autenticados pueden insertar

