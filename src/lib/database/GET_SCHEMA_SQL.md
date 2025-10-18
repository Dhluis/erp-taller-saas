# 🔍 CONSULTAS SQL PARA OBTENER ESQUEMA REAL

## 📋 INSTRUCCIONES

1. **Abrir Supabase SQL Editor**
2. **Ejecutar las siguientes consultas una por una**
3. **Copiar los resultados**
4. **Actualizar SCHEMA.md con los datos reales**

---

## 🔍 CONSULTA 1: OBTENER TODAS LAS COLUMNAS

```sql
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

**Resultado esperado:** Lista de todas las columnas de todas las tablas con sus tipos y propiedades.

---

## 🔍 CONSULTA 2: OBTENER INFORMACIÓN DE TABLAS

```sql
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Resultado esperado:** Lista de todas las tablas en el esquema público.

---

## 🔍 CONSULTA 3: OBTENER FOREIGN KEYS

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

**Resultado esperado:** Lista de todas las relaciones de foreign key entre tablas.

---

## 🔍 CONSULTA 4: OBTENER ÍNDICES

```sql
SELECT 
  t.table_name,
  i.indexname,
  i.indexdef
FROM information_schema.tables t
LEFT JOIN pg_indexes i ON t.table_name = i.tablename
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, i.indexname;
```

**Resultado esperado:** Lista de todos los índices en las tablas.

---

## 🔍 CONSULTA 5: OBTENER INFORMACIÓN DE TAMAÑOS

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Resultado esperado:** Lista de tablas con sus tamaños en disco.

---

## 📝 FORMATO PARA ACTUALIZAR SCHEMA.md

Una vez que tengas los resultados, actualiza `src/lib/database/SCHEMA.md` con este formato:

```markdown
### 🔧 Tabla: nombre_de_tabla
| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| campo1 | text | SÍ | NULL | Descripción del campo |
| campo2 | integer | NO | 0 | Descripción del campo |

**Relaciones:**
- campo1 → otra_tabla.id

**Índices:**
- PRIMARY KEY (id)
- INDEX (campo1)
```

---

## ⚠️ IMPORTANTE

- **NO asumas nombres de campos** - usa solo los que aparecen en los resultados
- **NO uses campos que no existan** - verifica cada campo antes de usarlo
- **Mantén la documentación actualizada** - ejecuta estas consultas cuando cambies el esquema
- **Verifica las relaciones** - asegúrate de que las foreign keys sean correctas

---

## 🔄 PROCESO RECOMENDADO

1. **Ejecutar consulta 1** - Obtener columnas
2. **Ejecutar consulta 2** - Obtener tablas
3. **Ejecutar consulta 3** - Obtener foreign keys
4. **Ejecutar consulta 4** - Obtener índices
5. **Actualizar SCHEMA.md** con los datos reales
6. **Verificar que todo coincida** con la base de datos

---

**📅 Fecha de creación:** $(date)
**🔧 Última actualización:** $(date)
