# Solución de Errores de Inventario y Órdenes de Compra

## Problema Identificado

Los errores que estás viendo se deben a que las tablas en la base de datos tienen estructuras diferentes a las que espera el código TypeScript.

### Errores específicos:
- `Error fetching inventory movements: {}`
- `Error fetching movement stats: {}`
- `Error fetching purchase orders: {}`

## Causa del Problema

### 1. Tabla `inventory_movements` (migración 007):
- Columna `type` en lugar de `movement_type`
- Columna `movement_date` en lugar de `created_at`
- Faltan columnas: `reference_type`, `reference_id`, `user_id`

### 2. Tabla `purchase_orders` (migración 003):
- Columna `total_amount` en lugar de `subtotal`, `tax_amount`, `total`
- No tiene `order_date`
- Estructura de columnas incompleta

## Solución

### Paso 1: Ejecutar las migraciones de corrección

1. Ve al **SQL Editor** de Supabase
2. Ejecuta el contenido del archivo `supabase/migrations/008_fix_inventory_movements_schema.sql`
3. Ejecuta el contenido del archivo `supabase/migrations/009_fix_purchase_orders_schema.sql`

### Paso 2: Verificar la corrección

1. Instala las dependencias si no las tienes:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Configura las variables de entorno en un archivo `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
   ```

3. Ejecuta el script de prueba:
   ```bash
   node test-inventory-movements.js
   ```

### Paso 3: Limpiar archivos temporales

Después de verificar que todo funciona, puedes eliminar:
- `test-inventory-movements.js`
- `SOLUCION_ERRORES_INVENTARIO.md`

## Cambios Realizados

### 1. Nueva migración (008_fix_inventory_movements_schema.sql)
- Agrega las columnas faltantes: `movement_type`, `reference_type`, `reference_id`, `user_id`
- Migra datos existentes de `type` a `movement_type`
- Establece valores por defecto apropiados
- Agrega constraints de validación
- Elimina columnas obsoletas
- Inserta datos de ejemplo para testing

### 2. Script de prueba (test-inventory-movements.js)
- Verifica que `getInventoryMovements()` funcione
- Verifica que `getMovementStats()` funcione
- Prueba inserción y eliminación de movimientos
- Proporciona información detallada de errores

## Estructura Final de la Tabla

```sql
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    product_id UUID REFERENCES inventory(id),
    movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer')),
    quantity INTEGER NOT NULL,
    reference_type TEXT NOT NULL CHECK (reference_type IN ('purchase', 'sale', 'adjustment', 'transfer', 'return')),
    reference_id TEXT,
    notes TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Verificación

Después de aplicar la migración, deberías poder:
1. Ver la página de movimientos de inventario sin errores
2. Crear nuevos movimientos
3. Ver las estadísticas correctamente
4. Editar y eliminar movimientos existentes

Si sigues teniendo problemas, revisa:
1. Que la migración se ejecutó correctamente
2. Que las variables de entorno están configuradas
3. Que el cliente de Supabase está configurado correctamente
