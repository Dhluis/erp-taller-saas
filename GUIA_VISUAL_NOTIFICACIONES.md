# 🎯 GUÍA VISUAL - CONFIGURAR NOTIFICACIONES PASO A PASO

## 📋 **PREPARACIÓN**

Antes de comenzar, ten a mano:
- ✅ Acceso a Supabase Dashboard
- ✅ Tu proyecto de Supabase abierto
- ✅ Los archivos creados en tu proyecto

---

## 🚀 **PASO 1: Abrir Supabase SQL Editor**

### **1.1 Ir a Supabase**
1. Abre tu navegador
2. Ve a: https://supabase.com/dashboard
3. Inicia sesión si es necesario
4. Selecciona tu proyecto: **erp-taller-saas** (o el nombre que tenga)

### **1.2 Abrir SQL Editor**
1. En el menú lateral izquierdo, busca **"SQL Editor"**
2. Click en **SQL Editor**
3. Verás un editor de código en blanco

**📸 Deberías ver algo así:**
```
+------------------+
| SQL Editor       |
|                  |
| [Nueva Query]    |
|                  |
| ┌──────────────┐ |
| │              │ |
| │  Editor SQL  │ |
| │              │ |
| └──────────────┘ |
|                  |
| [Run] [Format]   |
+------------------+
```

---

## 🔑 **PASO 2: Obtener tu User ID**

### **2.1 Abrir el archivo**
1. En VS Code, abre: **`1-obtener-mi-user-id.sql`**
2. Selecciona TODO el contenido (`Ctrl+A`)
3. Copia (`Ctrl+C`)

### **2.2 Ejecutar en Supabase**
1. Ve a Supabase SQL Editor
2. Pega el código (`Ctrl+V`)
3. Click en el botón **"Run"** (o presiona `Ctrl+Enter`)

### **2.3 Ver resultados**
Deberías ver una tabla con resultados como:

```
┌──────────────────────────────────────┬─────────────────────┬─────────────────────┐
│ user_id                              │ email               │ created_at          │
├──────────────────────────────────────┼─────────────────────┼─────────────────────┤
│ 301eb55a-f6f9-449f-ab04-8dcf8fc081a6 │ tu@email.com        │ 2024-10-01 10:00:00 │
└──────────────────────────────────────┴─────────────────────┴─────────────────────┘
```

### **2.4 Copiar tu User ID**
1. Busca la fila con **TU EMAIL**
2. Haz click en el `user_id` (el UUID largo)
3. Copia ese valor completo
4. **GUÁRDALO** en un bloc de notas temporalmente

**💡 NOTA:** El `user_id` se ve así:
```
301eb55a-f6f9-449f-ab04-8dcf8fc081a6
```

---

## 🔔 **PASO 3: Insertar Notificaciones de Prueba**

### **3.1 Verificar el User ID en el script**

**OPCIÓN A: Tu user_id es el del log (Recomendado)**

Si tu `user_id` es: `301eb55a-f6f9-449f-ab04-8dcf8fc081a6`

✅ **No necesitas cambiar nada**, el script ya está listo.

Ve directo al **PASO 3.2**

---

**OPCIÓN B: Tu user_id es DIFERENTE**

Si tu `user_id` es diferente (por ejemplo: `abc123de-4567-890f-ghij-klmnopqrstuv`):

1. Abre: **`2-insertar-notificaciones-prueba.sql`**
2. Presiona `Ctrl+H` (Buscar y Reemplazar)
3. En **"Buscar"** escribe:
   ```
   301eb55a-f6f9-449f-ab04-8dcf8fc081a6
   ```
4. En **"Reemplazar con"** pega TU `user_id`
5. Click en **"Reemplazar todo"**
6. Guarda el archivo (`Ctrl+S`)

---

### **3.2 Ejecutar el script**
1. Abre: **`2-insertar-notificaciones-prueba.sql`**
2. Selecciona TODO (`Ctrl+A`)
3. Copia (`Ctrl+C`)
4. Ve a Supabase SQL Editor
5. **LIMPIA el editor** (borra el contenido anterior)
6. Pega el nuevo código (`Ctrl+V`)
7. Click en **"Run"** (o `Ctrl+Enter`)

### **3.3 Verificar inserción**
Deberías ver un mensaje de éxito y luego una tabla con los resultados:

```
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1

┌──────────────────────┬──────────────────┬─────────────────────┬───────┐
│ id                   │ type             │ title               │ read  │
├──────────────────────┼──────────────────┼─────────────────────┼───────┤
│ uuid-1               │ order_completed  │ Orden completada    │ false │
│ uuid-2               │ stock_low        │ Stock bajo          │ false │
│ uuid-3               │ quotation_created│ Nueva cotización    │ false │
│ uuid-4               │ success          │ Pago recibido       │ false │
│ uuid-5               │ info             │ Cliente registrado  │ true  │
│ uuid-6               │ success          │ Vehículo agregado   │ true  │
│ uuid-7               │ warning          │ Mantenimiento...    │ true  │
└──────────────────────┴──────────────────┴─────────────────────┴───────┘

7 rows
```

✅ **¡Perfecto!** Si ves esto, las notificaciones se insertaron correctamente.

---

## 🎨 **PASO 4: Ver las Notificaciones en la App**

### **4.1 Recargar la aplicación**
1. Ve a tu aplicación en el navegador
2. Presiona **`Ctrl + Shift + R`** (hard refresh)
   - O en Chrome: F12 → Click derecho en el botón de recargar → "Vaciar caché y volver a cargar"

### **4.2 Buscar la campana**
1. Busca en la esquina **superior derecha** del navbar
2. Deberías ver una **campana 🔔**
3. La campana debe tener un **badge rojo con el número 4**

**📸 Deberías ver:**
```
┌─────────────────────────────────────────┐
│ ERP Taller          [🔍] [🔔4] [👤]    │
└─────────────────────────────────────────┘
```

### **4.3 Abrir el dropdown**
1. **Click en la campana 🔔**
2. Se abrirá un dropdown
3. Deberías ver:
   - Header: "Notificaciones" + botón "Marcar todas"
   - **7 notificaciones** en la lista
   - **4 notificaciones NO LEÍDAS** con fondo resaltado
   - **3 notificaciones LEÍDAS** sin fondo

**📸 Dropdown abierto:**
```
┌──────────────────────────────────────┐
│ Notificaciones      [Marcar todas ✓] │
├──────────────────────────────────────┤
│ ✅ Orden completada          [•]     │ ← Fondo resaltado
│ La orden #WO-001 ha sido...  [✓][🗑] │
│ Hace 30 minutos                      │
├──────────────────────────────────────┤
│ ⚠️  Stock bajo               [•]     │ ← Fondo resaltado
│ El producto "Filtro de...   [✓][🗑] │
│ Hace 2 horas                         │
├──────────────────────────────────────┤
│ ℹ️  Nueva cotización         [•]     │ ← Fondo resaltado
│ Se ha creado la cotización...[✓][🗑] │
│ Hace 4 horas                         │
├──────────────────────────────────────┤
│ ✅ Pago recibido             [•]     │ ← Fondo resaltado
│ Se ha recibido el pago de... [✓][🗑] │
│ Hace 6 horas                         │
├──────────────────────────────────────┤
│ ℹ️  Cliente registrado              │ ← Sin fondo (leída)
│ Nuevo cliente "María..."       [🗑] │
│ Hace 1 día                           │
├──────────────────────────────────────┤
│ ✅ Vehículo agregado                │ ← Sin fondo (leída)
│ Se ha registrado el vehículo...[🗑] │
│ Hace 2 días                          │
├──────────────────────────────────────┤
│ ⚠️  Mantenimiento programado        │ ← Sin fondo (leída)
│ Recuerda realizar el manten...[🗑]  │
│ Hace 3 días                          │
└──────────────────────────────────────┘
```

---

## 🧪 **PASO 5: Probar Funcionalidades**

### **5.1 Marcar una notificación como leída**
1. Busca una notificación **NO LEÍDA** (con fondo resaltado)
2. Click en el botón **✓** (check)
3. **Resultado esperado:**
   - La notificación pierde el fondo resaltado
   - El badge disminuye: **4** → **3**

### **5.2 Marcar todas como leídas**
1. Click en el botón **"Marcar todas"** (arriba a la derecha)
2. **Resultado esperado:**
   - TODAS las notificaciones pierden el fondo
   - El badge **desaparece**

### **5.3 Eliminar una notificación**
1. Click en el botón **🗑️** (basura) de cualquier notificación
2. **Resultado esperado:**
   - La notificación desaparece de la lista
   - Si era no leída, el badge disminuye

### **5.4 Verificar actualización automática**
1. Deja el dropdown abierto
2. Espera **30 segundos**
3. El contador debería actualizarse automáticamente

---

## ✅ **CHECKLIST DE VERIFICACIÓN**

Marca cada uno cuando lo pruebes:

- [ ] ✅ Badge con contador visible en la campana
- [ ] ✅ Dropdown se abre al hacer click
- [ ] ✅ 7 notificaciones visibles en la lista
- [ ] ✅ 4 notificaciones con fondo resaltado (no leídas)
- [ ] ✅ 3 notificaciones sin fondo (leídas)
- [ ] ✅ Botón "Marcar todas" visible y funciona
- [ ] ✅ Botón individual "✓" funciona
- [ ] ✅ Botón eliminar "🗑️" funciona
- [ ] ✅ Scroll visible cuando hay muchas notificaciones
- [ ] ✅ Iconos de colores correctos:
  - Verde para success/order_completed
  - Amarillo para warning/stock_low
  - Azul para info/quotation_created
- [ ] ✅ Fechas formateadas en español

---

## 🆘 **SOLUCIÓN DE PROBLEMAS**

### **Problema 1: No veo la campana en el navbar**
**Causa:** La aplicación no se recargó correctamente
**Solución:**
1. Cierra todas las pestañas de la app
2. Abre de nuevo
3. O presiona `Ctrl + Shift + R` varias veces

---

### **Problema 2: No veo el badge con el número**
**Causa:** Las notificaciones no se insertaron o todas están leídas
**Solución:**
1. Ve a Supabase SQL Editor
2. Ejecuta:
   ```sql
   SELECT COUNT(*) 
   FROM notifications 
   WHERE user_id = 'TU-USER-ID' 
     AND read = false;
   ```
3. Si el resultado es **0**, ejecuta de nuevo el script del PASO 3

---

### **Problema 3: El dropdown está vacío**
**Causa:** El `user_id` en el script no coincide con el tuyo
**Solución:**
1. Verifica tu `user_id` con el PASO 2
2. Abre `2-insertar-notificaciones-prueba.sql`
3. Busca y reemplaza el `user_id` correcto
4. Ejecuta de nuevo el script

---

### **Problema 4: Error al ejecutar el script**
**Causa:** Problema con la tabla o permisos
**Solución:**
1. Verifica que la tabla existe:
   ```sql
   SELECT * FROM notifications LIMIT 1;
   ```
2. Si da error, ejecuta:
   ```sql
   CREATE TABLE IF NOT EXISTS notifications (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     organization_id UUID NOT NULL,
     user_id UUID,
     type TEXT NOT NULL,
     title TEXT NOT NULL,
     message TEXT NOT NULL,
     read BOOLEAN DEFAULT false,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

---

## 🎉 **¡LISTO!**

Si completaste todos los pasos, tu sistema de notificaciones está:
- ✅ 100% funcional
- ✅ Con datos reales de la base de datos
- ✅ Con UI completa y moderna
- ✅ Listo para usar

**Siguiente paso:** Empieza a usar el sistema en producción o implementa el siguiente módulo (Documentos o Reportes PDF).

---

## 📞 **¿Necesitas ayuda?**

Si algo no funciona:
1. Revisa la consola del navegador (F12) para ver errores
2. Revisa los logs de Supabase
3. Verifica que el `user_id` es correcto
4. Ejecuta las queries de verificación









