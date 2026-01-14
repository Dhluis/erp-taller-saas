# 🧹 Limpieza de Navegador para Debugging

Cuando tienes problemas con cookies, autenticación o estado cacheado, puedes limpiar el almacenamiento del navegador usando estos comandos.

## 📋 Comandos para la Consola del Navegador (F12)

### Opción 1: Limpieza Manual Paso a Paso

Abre la consola del navegador (F12) y ejecuta uno por uno:

```javascript
// Paso 1: Limpiar localStorage
localStorage.clear()

// Paso 2: Limpiar sessionStorage
sessionStorage.clear()

// Paso 3: Hard reload
location.reload(true)
```

### Opción 2: Todo en Uno (Copia y Pega)

```javascript
localStorage.clear(); sessionStorage.clear(); location.reload(true)
```

## 🎯 Cuándo Usar Estos Comandos

- ✅ Problemas con cookies de autenticación
- ✅ Estado cacheado que no se actualiza
- ✅ Después de cambios importantes en autenticación
- ✅ Problemas con sesiones persistentes
- ✅ Para probar cambios recientes en el código

## 🔍 Cómo Ejecutarlos

1. **Abre la Consola del Navegador:**
   - Presiona `F12` o `Ctrl+Shift+I` (Windows/Linux)
   - O `Cmd+Option+I` (Mac)
   - O clic derecho → "Inspeccionar" → Pestaña "Console"

2. **Pega los Comandos:**
   - Copia los comandos de arriba
   - Pégalos en la consola
   - Presiona `Enter`

3. **El Navegador se Recargará:**
   - Todos los datos locales se limpiarán
   - La página se recargará automáticamente
   - Tendrás que iniciar sesión de nuevo

## ⚠️ Advertencias

- Estos comandos **eliminan todos los datos locales** del sitio
- Tendrás que **iniciar sesión nuevamente**
- No afecta datos del servidor (solo del navegador)
- Solo limpia datos de la pestaña actual

## 🔄 Alternativa: Hard Reload con Cache Clear

Si prefieres usar el menú del navegador:

1. **Chrome/Edge:**
   - `Ctrl+Shift+R` (Windows/Linux)
   - `Cmd+Shift+R` (Mac)
   - O clic derecho en el botón de recargar → "Vaciar caché y volver a cargar de forma forzada"

2. **Firefox:**
   - `Ctrl+F5` (Windows/Linux)
   - `Cmd+Shift+R` (Mac)
   - O `Ctrl+Shift+Delete` → Limpiar caché

## 📝 Notas

- Estos comandos son útiles durante el desarrollo
- No afectan la base de datos
- Útil para probar cambios recientes
- Recomendado después de cambios en autenticación o cookies
