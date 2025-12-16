# 🧪 GUÍA DE TESTING: SessionContext

## 🎯 Objetivo

Verificar que la implementación de **SessionContext** resuelve el problema de carga lenta y que todas las funcionalidades siguen operando correctamente.

---

## ⚡ TEST RÁPIDO (5 minutos)

### 1. Limpiar Todo y Recargar

```
1. Abrir DevTools (F12)
2. Console → Clear console (icono 🚫)
3. Application → Storage → Clear site data → Clear
4. Cerrar DevTools
5. Recargar página (Ctrl+Shift+R)
```

### 2. Login

```
1. Hacer login con tus credenciales
2. ⏱️ MEDIR: ¿Cuánto tardó en aparecer el dashboard?
   ✅ ESPERADO: < 1 segundo
   ❌ PROBLEMA: > 3 segundos
```

### 3. Abrir Consola

```
1. Abrir DevTools (F12)
2. Console → Buscar mensajes de [Session]
```

**Logs que DEBES ver:**
```
✅ 🚀 [Session] SessionProvider montado
✅ 🔄 [Session] Iniciando carga de sesión...
✅ ✅ [Session] Usuario autenticado: ...
✅ ✅ [Session] Perfil cargado: ...
✅ ✅ [Session] Workshop cargado: ...
✅ ✅✅✅ [Session] Sesión completamente cargada
```

**Logs que NO DEBES ver:**
```
❌ [OrganizationContext] fetchOrganization...
❌ [AuthContext] Auth state changed...
❌ ⏳ Esperando organizationId...
❌ ⚠️⚠️⚠️ organizationId es NULL
```

### 4. Test de Navegación Rápida

```
Dashboard → Órdenes → Clientes → Vehículos → Reportes → Dashboard

⏱️ MEDIR: ¿Cuánto tarda cada navegación?
✅ ESPERADO: < 500ms cada una
❌ PROBLEMA: > 2 segundos
```

### 5. Test de Refresh Múltiple

```
1. En cualquier página, presionar F5 rápidamente 5 veces
2. Verificar en Network tab (F12 → Network)
   ✅ ESPERADO: 3-4 requests por reload
   ❌ PROBLEMA: 6+ requests por reload
```

---

## 🔬 TEST COMPLETO (15 minutos)

### Sección 1: Verificar Carga Inicial

#### Test 1.1: Login y Dashboard
```
PASOS:
1. Logout completo
2. Limpiar localStorage (DevTools → Application → Storage → Clear)
3. Login con usuario válido
4. Abrir consola ANTES de que termine de cargar

RESULTADO ESPERADO:
✅ Ver secuencia completa de logs [Session]
✅ Dashboard carga en < 1 segundo
✅ Estadísticas visibles inmediatamente
✅ NO ver "Esperando organizationId..."

RESULTADO ACTUAL:
[ ] ✅ Pasa
[ ] ❌ Falla - Anotar qué logs aparecen
```

---

#### Test 1.2: Tiempo hasta isReady
```
PASOS:
1. En consola, buscar: "✅✅✅ [Session] Sesión completamente cargada"
2. Ver timestamp del primer log vs este log

RESULTADO ESPERADO:
✅ Diferencia < 500ms
✅ Solo 1 secuencia (no múltiples cargas)

RESULTADO ACTUAL:
Tiempo total: _____ ms
[ ] ✅ < 500ms
[ ] ⚠️ 500-1000ms
[ ] ❌ > 1000ms
```

---

### Sección 2: Verificar Páginas Críticas

#### Test 2.1: Página de Órdenes
```
PASOS:
1. Ir a /ordenes
2. Verificar que la tabla cargue inmediatamente

RESULTADO ESPERADO:
✅ Órdenes visibles en < 500ms
✅ NO ver "Esperando organizationId..."
✅ Filtros funcionan
✅ Búsqueda funciona

RESULTADO ACTUAL:
[ ] ✅ Pasa todos
[ ] ⚠️ Funciona pero lento
[ ] ❌ Falla - Anotar error
```

---

#### Test 2.2: Página de Clientes
```
PASOS:
1. Ir a /clientes
2. Verificar que la tabla cargue

VERIFICAR:
✅ Clientes visibles
✅ Dropdown en "Nueva Orden" funciona
✅ Búsqueda funciona
✅ Crear cliente funciona

RESULTADO ACTUAL:
[ ] ✅ Pasa todos
[ ] ❌ Falla - Anotar qué no funciona:
    ___________________________________
```

---

#### Test 2.3: Página de Vehículos
```
PASOS:
1. Ir a /vehiculos
2. Verificar que la tabla cargue

VERIFICAR:
✅ Vehículos visibles
✅ Carga en < 500ms
✅ Filtros funcionan

RESULTADO ACTUAL:
[ ] ✅ Pasa todos
[ ] ❌ Falla - Anotar error
```

---

#### Test 2.4: Página de Reportes
```
PASOS:
1. Ir a /reportes
2. Esperar a que carguen las gráficas

VERIFICAR:
✅ Gráficas se generan
✅ Estadísticas visibles
✅ Filtros de fecha funcionan
✅ NO queda en "Cargando..." infinito

RESULTADO ACTUAL:
[ ] ✅ Pasa todos
[ ] ❌ Falla - Anotar error
```

---

### Sección 3: Verificar Performance

#### Test 3.1: Contar Queries en Network
```
PASOS:
1. Limpiar localStorage
2. DevTools → Network → Clear
3. Login
4. Contar requests a Supabase (buscar "supabase" en filter)

RESULTADO ESPERADO:
✅ 3-4 requests iniciales (auth.getUser, users, workshops)
❌ > 6 requests indica duplicación

RESULTADO ACTUAL:
Total de requests: _____ 
[ ] ✅ 3-4 requests
[ ] ⚠️ 5-6 requests
[ ] ❌ > 6 requests
```

---

#### Test 3.2: Re-renders
```
PASOS:
1. Instalar React DevTools (extensión de Chrome)
2. Abrir React DevTools → Profiler
3. Click en "Record"
4. Navegar: Dashboard → Órdenes
5. Click en "Stop"
6. Ver flamegraph

RESULTADO ESPERADO:
✅ 2-4 renders por navegación
❌ > 10 renders indica problema

RESULTADO ACTUAL:
Número de renders: _____
[ ] ✅ < 5 renders
[ ] ⚠️ 5-10 renders
[ ] ❌ > 10 renders
```

---

### Sección 4: Stress Testing

#### Test 4.1: F5 Repetido
```
PASOS:
1. En Dashboard, presionar F5 rápidamente 10 veces
2. Verificar que no haya errores en consola

RESULTADO ESPERADO:
✅ Carga correctamente cada vez
✅ NO duplica requests
✅ NO errores en consola

RESULTADO ACTUAL:
[ ] ✅ Pasa
[ ] ❌ Falla - Anotar errores:
    ___________________________________
```

---

#### Test 4.2: Navegación Rápida
```
PASOS:
1. Click rápido en sidebar:
   Dashboard → Órdenes → Clientes → Vehículos → Reportes
   (Sin esperar a que cargue cada página)

RESULTADO ESPERADO:
✅ Todas las páginas cargan
✅ NO se queda en blanco
✅ NO errores "organizationId undefined"

RESULTADO ACTUAL:
[ ] ✅ Pasa
[ ] ❌ Falla - Anotar qué página falló
```

---

### Sección 5: Verificar Hooks de Compatibilidad

#### Test 5.1: useOrganization()
```
PASOS:
1. Abrir cualquier componente que use useOrganization
2. En consola, ejecutar:
   useOrganization() (en React DevTools)

VERIFICAR:
✅ Retorna { organizationId, ready: true, ... }
✅ organizationId tiene valor (UUID)
✅ ready = true

RESULTADO ACTUAL:
organizationId: ___________________
ready: [ ] true [ ] false
[ ] ✅ Pasa
[ ] ❌ Falla
```

---

#### Test 5.2: useAuth()
```
PASOS:
1. En consola, verificar que useAuth funcione

VERIFICAR:
✅ Retorna { user, profile, workshop, ... }
✅ Todos los campos tienen valor
✅ workshop contiene nombre del taller

RESULTADO ACTUAL:
user: [ ] ✅ Presente [ ] ❌ Null
profile: [ ] ✅ Presente [ ] ❌ Null
workshop: [ ] ✅ Presente [ ] ❌ Null
```

---

## 📊 CHECKLIST FINAL

### Performance
- [ ] ✅ Login a Dashboard < 1 segundo
- [ ] ✅ Navegación entre páginas < 500ms
- [ ] ✅ Solo 3-4 queries a Supabase (no 6+)
- [ ] ✅ isReady = true estable (no flickering)
- [ ] ✅ NO mensajes "Esperando organizationId..."

### Funcionalidad
- [ ] ✅ Dashboard carga estadísticas
- [ ] ✅ Órdenes carga y funciona
- [ ] ✅ Clientes carga y dropdown funciona
- [ ] ✅ Vehículos carga y funciona
- [ ] ✅ Reportes genera gráficas
- [ ] ✅ WhatsApp carga configuración

### Estabilidad
- [ ] ✅ F5 múltiples sin errores
- [ ] ✅ Navegación rápida sin errores
- [ ] ✅ NO errores en consola
- [ ] ✅ NO requests duplicados en Network

### Logs
- [ ] ✅ Ver mensajes [Session] en consola
- [ ] ✅ NO ver mensajes [OrganizationContext]
- [ ] ✅ NO ver mensajes [AuthContext]
- [ ] ✅ Secuencia completa de carga

---

## ❌ QUÉ HACER SI FALLA

### Problema 1: "Cannot access 'X' before initialization"
```
CAUSA: Temporal Dead Zone (TDZ)

SOLUCIÓN:
1. Abrir el archivo mencionado en el error
2. Buscar useCallback/useMemo que se use antes de definirse
3. Mover la definición ARRIBA del useEffect

ARCHIVO COMÚN: Cualquier componente con useCallback
```

---

### Problema 2: Sigue diciendo "Esperando organizationId..."
```
CAUSA: Hook todavía usa OrganizationContext viejo

SOLUCIÓN:
1. Buscar en el archivo: "from '@/contexts/OrganizationContext'"
2. Reemplazar por: "from '@/lib/context/SessionContext'"
3. Guardar y recargar

VERIFICAR:
grep -r "OrganizationContext" src/
```

---

### Problema 3: "useSession is not defined"
```
CAUSA: Import incorrecto

SOLUCIÓN:
1. Verificar que SessionContext.tsx exista
2. Verificar que Providers.tsx use SessionProvider
3. Limpiar cache: npm run clean (si existe)
4. Reiniciar servidor: Ctrl+C → npm run dev
```

---

### Problema 4: Errores 401 Unauthorized
```
CAUSA: Token de Supabase expirado o inválido

SOLUCIÓN:
1. Logout completo
2. Limpiar localStorage (DevTools → Application → Clear)
3. Login nuevamente
4. Si persiste, verificar .env.local
```

---

### Problema 5: Lentitud persiste
```
CAUSA POSIBLE: Cache de navegador o server

SOLUCIÓN:
1. Limpiar cache del navegador (Ctrl+Shift+Delete)
2. Hard reload (Ctrl+Shift+R)
3. Reiniciar servidor (Ctrl+C → npm run dev)
4. Verificar Network tab para ver qué requests son lentos
```

---

## 📝 REPORTE DE BUGS

Si encuentras un bug, reporta con esta información:

```markdown
### 🐛 Bug Report

**Descripción:**
[Qué pasó vs qué esperabas]

**Pasos para reproducir:**
1. 
2. 
3. 

**Logs en consola:**
```
[Pegar logs aquí]
```

**Network tab:**
[Screenshot o descripción de requests]

**Navegador:**
[Chrome/Firefox/Safari - versión]

**Página afectada:**
[Dashboard/Órdenes/Clientes/etc]
```

---

## ✅ CRITERIOS DE ÉXITO

El sistema se considera **EXITOSO** si:

1. ✅ **Performance:** 5-10x más rápido
   - Login a Dashboard: < 1s (antes 5-10s)
   - Navegación: < 500ms (antes 2-5s)

2. ✅ **Estabilidad:** Sin errores
   - NO errores en consola
   - NO "Esperando organizationId..."
   - NO pantallas en blanco

3. ✅ **Funcionalidad:** Todo funciona
   - Todas las páginas cargan
   - Todos los botones funcionan
   - Todos los formularios funcionan

4. ✅ **Arquitectura:** Código limpio
   - Solo 3 queries (no 6)
   - NO race conditions
   - NO loops infinitos

---

## 🎉 DESPUÉS DEL TESTING

### Si todo funciona (24-48h de uso):

1. ✅ **Eliminar archivos obsoletos:**
   ```
   src/contexts/OrganizationContext.tsx
   src/contexts/AuthContext.tsx
   ```

2. ✅ **Actualizar documentación**

3. ✅ **Celebrar** 🎊

### Si algo falla:

1. ⚠️ **NO eliminar nada aún**
2. ⚠️ **Reportar el bug**
3. ⚠️ **Esperar solución**
4. ⚠️ **Volver a testear**

---

**Fecha de creación:** 3 de Diciembre 2025  
**Versión:** 1.0  
**Autor:** AI Assistant








