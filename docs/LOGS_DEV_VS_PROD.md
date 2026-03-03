# Logs: Desarrollo vs Producción

## ¿Qué cambia?

**Ninguna variación en el funcionamiento del ERP.** La lógica, las APIs, la UI y los datos son idénticos en ambos entornos.

Solo cambia **qué se imprime en la consola del navegador**:

| Entorno | Cómo se ejecuta | Logs en consola |
|---------|-----------------|-----------------|
| **Desarrollo** | `npm run dev` (localhost) | ✅ Todos los logs de debug (Session, Dashboard, getAlertasInventario, etc.) |
| **Producción** | `npm run build` + deploy (Vercel, eaglessystem.io) | ❌ Logs de debug ocultos. Solo `console.error` en errores reales |

## Cómo diferenciar en qué entorno estás

1. **URL:** `localhost:3000` = desarrollo. `eaglessystem.io` (o tu dominio) = producción.
2. **Consola:** Si ves logs como `📊 DASHBOARD - DATOS RECIBIDOS` o `🔍 [getAlertasInventario]` → desarrollo. Si la consola está casi vacía al cargar el dashboard → producción.
3. **Variable:** `process.env.NODE_ENV` es `'development'` en dev y `'production'` en build/deploy.

## Qué sigue mostrándose en producción

- `console.error()` — errores reales (ej. fallo al cargar estadísticas)
- `console.warn()` — solo los que no envuelven en `NODE_ENV` (pocos)
- Logs de librerías externas (Supabase, etc.) si las tienen

## Para depurar en producción

1. **Vercel:** Revisar logs del servidor en el dashboard de Vercel.
2. **Sentry/LogRocket:** Añadir un servicio de monitoreo para capturar errores en producción.
3. **Temporal:** Activar logs en prod cambiando la condición a `true` solo para una sesión de debug (no recomendado dejarlo así).
