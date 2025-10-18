# 🔍 GUÍA COMPLETA DE DIAGNÓSTICO - DESINCRONIZACIÓN DASHBOARD vs KANBAN

## ✅ LOGS AGREGADOS EXITOSAMENTE

He agregado logs detallados en 4 archivos clave del sistema:

### 📁 **Archivos Modificados:**

1. ✅ `src/app/dashboard/page.tsx` - Dashboard frontend
2. ✅ `src/components/ordenes/KanbanBoard.tsx` - Kanban frontend  
3. ✅ `src/app/api/orders/stats/route.ts` - API del Dashboard
4. ✅ `src/lib/database/queries/orders.ts` - Query del Kanban

---

## 🧪 **PASO 1: RECARGAR Y PROBAR**

### **1.1 Recargar el Servidor**
Si el servidor Next.js no se recarga automáticamente:
```bash
# Detener el servidor (Ctrl+C)
# Iniciar de nuevo
npm run dev
```

### **1.2 Limpiar Caché del Navegador**
- Presiona `Ctrl+Shift+R` (Windows) o `Cmd+Shift+R` (Mac)
- O abre DevTools (F12) → Pestaña "Network" → Marca "Disable cache"

---

## 🎯 **PASO 2: HACER PRUEBA CON LOGS**

### **2.1 Probar Dashboard**

1. **Abre el Dashboard:**
   - URL: `http://localhost:3000/dashboard`
   
2. **Abre la Consola del Navegador:**
   - Presiona `F12`
   - Ve a la pestaña "Console"
   - Limpia la consola (botón 🚫 o `Ctrl+L`)

3. **Selecciona filtro "Últimos 7 días"**
   - Haz clic en el botón "Últimos 7 días"
   - **Espera a que cargue**

4. **Busca estos logs en la consola:**
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔌 API /orders/stats - QUERY EJECUTADA
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Organization ID: 00000000-0000-0000-0000-000000000001
   Workshop ID: 042ab6bd-8979-4166-882a-c244b5e51e51
   Filtro de tiempo: 7d
   Rango de fechas: { from: '...', to: '...' }
   ✅ Órdenes encontradas: X
   ✅ Órdenes por estado: { ... }
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

5. **Busca también:**
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📊 DASHBOARD - DATOS RECIBIDOS DE LA API
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Filtro aplicado: 7d
   Datos por estado: { ... }
   Total de órdenes (calculado): X
   Total de órdenes (del API): X
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

6. **Anota estos números:**
   - Total de órdenes según API: _______
   - Número en "Órdenes Activas": _______
   - Número en "Órdenes Pendientes": _______
   - Número en "Órdenes Completadas": _______

---

### **2.2 Probar Kanban**

1. **Abre el Kanban en OTRA PESTAÑA:**
   - URL: `http://localhost:3000/ordenes`
   
2. **Abre la Consola del Navegador:**
   - Presiona `F12`
   - Ve a la pestaña "Console"
   - Limpia la consola (botón 🚫 o `Ctrl+L`)

3. **Selecciona filtro "Últimos 7 días"**
   - Haz clic en el botón "Últimos 7 días"
   - **Espera a que cargue**

4. **Busca estos logs en la consola:**
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔌 getAllOrders - QUERY EJECUTADA
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Organization ID: 00000000-0000-0000-0000-000000000001
   ✅ Órdenes encontradas: X
   ✅ Distribución por estado: { ... }
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

5. **Busca también:**
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📋 KANBAN - ÓRDENES ANTES DE FILTRAR
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Total de órdenes obtenidas de DB: X
   Filtro de fecha activo: 7days
   Organization ID: 00000000-0000-0000-0000-000000000001
   Rango de fechas aplicado: { from: '...', to: '...' }
   Órdenes filtradas por fecha: X → X (eliminadas: X)
   Órdenes después de búsqueda: X
   Distribución por estado:
     Recepción: X
     Cotización: X
     Esperando Aprobación: X
     ...
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

6. **Cuenta las tarjetas MANUALMENTE:**
   - Recepción: _______
   - Diagnóstico: _______
   - Cotización: _______
   - Esperando Aprobación: _______
   - Desarmado: _______
   - Esperando Piezas: _______
   - Armado: _______
   - Pruebas: _______
   - Listo: _______
   - Completado: _______
   - **TOTAL:** _______

---

## 📊 **PASO 3: EJECUTAR QUERIES SQL**

1. **Abre Supabase:**
   - Ve a tu proyecto en [supabase.com](https://supabase.com)
   - Haz clic en "SQL Editor" en el menú lateral

2. **Ejecuta las queries:**
   - Abre el archivo `DIAGNOSTIC_SQL_QUERIES.sql`
   - Copia cada query **una por una**
   - Pégala en el SQL Editor
   - Haz clic en "Run" (o presiona `Ctrl+Enter`)
   - **COPIA LOS RESULTADOS** de cada query

3. **Queries más importantes:**
   - **Query 1:** Total de órdenes en la BD
   - **Query 2:** Órdenes de los últimos 7 días por estado
   - **Query 3:** Verificar órdenes sin organization_id
   - **Query 4:** Verificar si hay múltiples organizaciones
   - **Query 6:** Rangos de fechas que usa Supabase

---

## 📝 **PASO 4: COMPARAR RESULTADOS**

### **Tabla de Comparación:**

| **Fuente** | **Últimos 7 días** | **Comentarios** |
|------------|-------------------|-----------------|
| **Supabase (Query 2)** | _______ | Total desde la BD |
| **Dashboard API** | _______ | Lo que devuelve el API |
| **Dashboard Frontend** | _______ | Lo que muestra el Dashboard |
| **Kanban Query** | _______ | Órdenes obtenidas por getAllOrders |
| **Kanban Filtradas** | _______ | Después de aplicar filtro de fecha |
| **Kanban Visibles** | _______ | Tarjetas que ves en pantalla |

---

## 🔍 **PASO 5: IDENTIFICAR EL PROBLEMA**

### **Escenario 1: Supabase ≠ Dashboard API**
**Problema:** La query en el API está mal

**Verificar:**
- ¿El rango de fechas es correcto?
- ¿El `organization_id` es correcto?
- ¿Hay problema de zona horaria?

**Solución:**
- Ajustar el rango de fechas en `src/app/api/orders/stats/route.ts`

---

### **Escenario 2: Dashboard API ≠ Dashboard Frontend**
**Problema:** El mapeo de datos está mal

**Verificar:**
- ¿Los nombres de los campos son correctos? (`initial_quote` vs `cotizacion`)
- ¿El frontend está sumando correctamente?

**Solución:**
- Verificar el mapeo en `src/app/dashboard/page.tsx`

---

### **Escenario 3: Kanban Query ≠ Kanban Filtradas**
**Problema:** El filtro de fechas en el Kanban está mal

**Verificar:**
- ¿El rango de fechas del Kanban coincide con el del Dashboard?
- ¿Hay órdenes que se están filtrando incorrectamente?
- Busca en los logs: `❌ Orden ...excluida (fecha: ...)`

**Solución:**
- Ajustar la función `getDateRange()` en `KanbanBoard.tsx`

---

### **Escenario 4: Todos coinciden pero los números son diferentes**
**Problema:** Dashboard cuenta diferentes estados que Kanban

**Verificar:**
- Dashboard "Órdenes Activas" = Todo EXCEPTO "Recepción" y "Completado"
- Kanban "Todas" = TODAS las tarjetas sin excepción

**Solución:**
- Esto es CORRECTO, son diferentes vistas

---

## 📋 **PASO 6: COMPARTIR RESULTADOS**

**Copia y pega esta información en tu respuesta:**

```
RESULTADOS DEL DIAGNÓSTICO
══════════════════════════

DASHBOARD (Últimos 7 días):
- API devolvió: _______ órdenes
- Frontend muestra: _______ órdenes activas
- Rango de fechas API: from: _______ to: _______

KANBAN (Últimos 7 días):
- getAllOrders obtuvo: _______ órdenes
- Después de filtrar por fecha: _______ órdenes
- Tarjetas visibles: _______ órdenes
- Rango de fechas Kanban: from: _______ to: _______

SUPABASE (Query directa):
- Total en BD: _______ órdenes
- Últimos 7 días (Query 2): _______ órdenes
- Órdenes sin organization_id: _______
- Múltiples organizations: _______ (Sí/No)

COMPARACIÓN DE RANGOS:
- Dashboard: from: _______ to: _______
- Kanban: from: _______ to: _______
- ¿Son iguales? _______ (Sí/No)

LOGS DEL KANBAN:
[Pega aquí los logs completos del Kanban, especialmente las líneas que dicen:
 "❌ Orden ...excluida (fecha: ...)"]

RESULTADO QUERY 2 (Supabase):
[Pega aquí la tabla completa de la Query 2]
```

---

## ⚠️ **NOTAS IMPORTANTES**

1. **Los logs se muestran en la CONSOLA DEL NAVEGADOR**, no en la terminal
2. **Asegúrate de limpiar la consola** antes de cada prueba
3. **No confundas** los logs del servidor (terminal) con los del navegador (consola F12)
4. **Copia TODO el bloque de logs** entre las líneas `━━━━━━━`
5. **Si no ves los logs**, verifica que el servidor se haya recargado correctamente

---

## 🚀 **SIGUIENTE PASO**

Una vez que tengas todos los resultados:
1. Compártelos en el chat
2. Analizaremos juntos dónde está la diferencia
3. Implementaremos la solución específica

**¡Listo para comenzar el diagnóstico!** 🔍✨

