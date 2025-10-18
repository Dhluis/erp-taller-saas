# PRUEBAS DEL FRONTEND - ERP TALLER SAAS

## 1. Verificar que el servidor esté funcionando
- Abre http://localhost:3001 en tu navegador
- Debe mostrar el dashboard con la nueva paleta (fondo negro, colores primario/secundario/terciario)

## 2. Probar navegación
- Dashboard: http://localhost:3001/
- Clientes: http://localhost:3001/clientes
- Vehículos: http://localhost:3001/vehiculos
- Órdenes: http://localhost:3001/ordenes
- Inventario: http://localhost:3001/inventario

## 3. Probar creación de órdenes
1. Ve a http://localhost:3001/ordenes
2. Haz clic en "Nueva Orden"
3. Completa el formulario:
   - Cliente: Selecciona "Juan Pérez" (debe aparecer si ejecutaste el SQL)
   - Vehículo: Selecciona el vehículo del cliente
   - Descripción: "Prueba de orden desde frontend"
   - Costo estimado: 1500
   - Fecha estimada: Mañana
4. Haz clic en "Crear Orden de Trabajo"
5. Debe aparecer en la columna "Recepción" del Kanban

## 4. Probar gestión de items en órdenes
1. Haz clic en la orden creada para abrir el modal
2. En la sección "Servicios y Productos":
   - Haz clic en "Agregar Item"
   - Selecciona tipo "Servicio"
   - Elige "Cambio de aceite" (debe aparecer si ejecutaste el SQL)
   - Cantidad: 1
   - Precio: 800
   - Haz clic en "Agregar"
3. Agrega otro item tipo "Producto":
   - Selecciona "Filtro de aceite"
   - Cantidad: 1
   - Precio: 250
   - Haz clic en "Agregar"
4. Verifica que el total se calcule correctamente

## 5. Probar cambio de estado de órdenes
1. En el modal de la orden, cambia el estado de "Recepción" a "Diagnóstico"
2. La orden debe moverse a la columna correspondiente en el Kanban
3. Prueba otros estados: "Aprobación", "Reparación", etc.

## 6. Verificar dashboard
1. Ve a http://localhost:3001/
2. Debe mostrar métricas:
   - Órdenes del mes
   - Ingresos del mes
   - Clientes activos
   - Vehículos en taller
3. Debe mostrar órdenes recientes en la tabla

## 7. Probar filtros en órdenes
1. En http://localhost:3001/ordenes
2. Usa los filtros:
   - Filtrar por cliente
   - Filtrar por fechas
3. Verifica que los resultados se actualicen

## 8. Verificar estilos
- Fondo debe ser negro
- Colores primarios: #03c4ff (azul claro)
- Colores secundarios: #0346ff (azul)
- Colores terciarios: #03ffbc (verde claro)
- Texto debe ser legible sobre fondo negro

## Errores comunes y soluciones

### Error: "Module not found: '@/components/ui/use-toast'"
- Solución: Reinicia el servidor (Ctrl+C, luego npm run dev)

### Error: "Failed to fetch" en las páginas
- Verifica que las variables de entorno estén configuradas en .env.local
- Verifica que Supabase esté configurado correctamente

### No aparecen datos en el dashboard
- Ejecuta el archivo test-supabase.sql en Supabase SQL Editor
- Verifica que las tablas tengan datos

### Error de autenticación
- Verifica que el JWT tenga la claim organization_id
- Revisa las políticas RLS en Supabase

