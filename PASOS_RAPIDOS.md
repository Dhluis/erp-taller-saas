# ⚡ PASOS RÁPIDOS - CONFIGURAR NOTIFICACIONES

## 🎯 **RESUMEN ULTRA RÁPIDO**

Tu `user_id` parece ser: **`301eb55a-f6f9-449f-ab04-8dcf8fc081a6`**

Si es correcto, solo necesitas hacer esto:

---

## ✅ **OPCIÓN RÁPIDA (Si tu user_id es correcto)**

### **1. Ejecutar script en Supabase**
1. Abre: **`2-insertar-notificaciones-prueba.sql`**
2. Copia TODO el contenido (`Ctrl+A`, `Ctrl+C`)
3. Ve a: **Supabase Dashboard → SQL Editor**
4. Pega el código (`Ctrl+V`)
5. Click **"Run"** (o `Ctrl+Enter`)
6. Deberías ver: **"7 rows"**

### **2. Ver en la app**
1. Recarga la app: **`Ctrl + Shift + R`**
2. Busca la campana 🔔 arriba a la derecha
3. Deberías ver badge con **"4"**
4. Click en la campana
5. ¡Listo! Deberías ver 7 notificaciones

---

## ❓ **OPCIÓN COMPLETA (Si tu user_id es diferente)**

### **1. Obtener tu user_id**
1. Abre: **`1-obtener-mi-user-id.sql`**
2. Copia TODO (`Ctrl+A`, `Ctrl+C`)
3. Ve a: **Supabase Dashboard → SQL Editor**
4. Pega (`Ctrl+V`)
5. Click **"Run"**
6. Copia tu `user_id` de los resultados

### **2. Actualizar el script**
1. Abre: **`2-insertar-notificaciones-prueba.sql`**
2. Buscar y reemplazar (`Ctrl+H`):
   - **Buscar:** `301eb55a-f6f9-449f-ab04-8dcf8fc081a6`
   - **Reemplazar:** `TU-USER-ID`
3. Click **"Reemplazar todo"**
4. Guarda (`Ctrl+S`)

### **3. Ejecutar y ver**
1. Copia TODO el script (`Ctrl+A`, `Ctrl+C`)
2. Pega en Supabase SQL Editor
3. Click **"Run"**
4. Recarga la app (`Ctrl + Shift + R`)
5. Busca la campana 🔔

---

## 📸 **¿QUÉ VAS A VER?**

### **En el navbar:**
```
[Logo]                    [🔔4] [👤]
                           ↑
                    Badge con "4"
```

### **Al abrir (click en 🔔):**
```
┌────────────────────────────────┐
│ Notificaciones  [Marcar todas] │
├────────────────────────────────┤
│ ✅ Orden completada      [•]   │ ← Fondo resaltado
│ ⚠️  Stock bajo           [•]   │ ← Fondo resaltado
│ ℹ️  Nueva cotización     [•]   │ ← Fondo resaltado
│ ✅ Pago recibido         [•]   │ ← Fondo resaltado
│ ℹ️  Cliente registrado         │ ← Sin fondo
│ ✅ Vehículo agregado           │ ← Sin fondo
│ ⚠️  Mantenimiento              │ ← Sin fondo
└────────────────────────────────┘
```

---

## 🆘 **PROBLEMAS COMUNES**

| Problema | Solución |
|----------|----------|
| No veo la campana | `Ctrl + Shift + R` varias veces |
| No hay badge | Ejecuta de nuevo el script SQL |
| Dropdown vacío | Verifica tu `user_id` |
| Error en SQL | Lee `GUIA_VISUAL_NOTIFICACIONES.md` |

---

## 🎯 **VERIFICACIÓN RÁPIDA**

```sql
-- Ejecuta esto en Supabase para verificar:
SELECT COUNT(*) as total,
       SUM(CASE WHEN read = false THEN 1 ELSE 0 END) as no_leidas
FROM notifications
WHERE user_id = '301eb55a-f6f9-449f-ab04-8dcf8fc081a6';
```

**Resultado esperado:**
- `total`: 7
- `no_leidas`: 4

---

## ✅ **CHECKLIST**

- [ ] Script ejecutado en Supabase
- [ ] 7 notificaciones insertadas
- [ ] App recargada con `Ctrl+Shift+R`
- [ ] Campana visible con badge "4"
- [ ] Dropdown funciona
- [ ] Botones funcionan (marcar, eliminar)

---

**¿Todo bien?** → ¡Sistema completo al 100%! 🎉

**¿Problemas?** → Lee `GUIA_VISUAL_NOTIFICACIONES.md` para ayuda detallada





