# Resumen: Sistema de Órdenes de Trabajo

**Última actualización:** Abril 2026

---

## Documentos disponibles

### `ARQUITECTURA_NUEVA_ORDEN.md`
- Mapeo completo de archivos y componentes del sistema de órdenes
- Diagrama de arquitectura y flujo de creación
- Cuándo usar: para entender cómo funciona todo el sistema

### `PLAN_OPTIMIZACION_NUEVA_ORDEN.md`
- Quick wins implementables
- Estructura de carpetas propuesta
- Código de ejemplo con Zod, React Hook Form, Wizard
- Plan de migración paso a paso

### `TABLA_ARCHIVOS_ORDENES.md`
- Tabla de todos los archivos relacionados al sistema de órdenes
- Útil para encontrar rápido dónde está algo

---

## Estado actual

El sistema de órdenes está completo y en producción. Incluye:

- Lista de órdenes con filtros por estado, fecha, cliente, mecánico
- Vista Kanban (arrastrar tarjetas entre columnas)
- Detalle de orden: servicios, piezas, fotos, notas, historial
- Cambio de estado con notificación automática al cliente (WhatsApp + email)
- Botón manual "Notificar al cliente" desde la vista de detalle
- Conversión de orden → cotización → nota de venta

## Archivos clave

| Archivo | Rol |
|---|---|
| `src/app/api/work-orders/route.ts` | GET/POST órdenes — **protegido, no modificar** |
| `src/app/api/work-orders/[id]/route.ts` | GET/PUT/DELETE orden específica |
| `src/app/api/work-orders/[id]/notify/route.ts` | POST notificación manual al cliente |
| `src/lib/orders/notifications.ts` | Lógica de notificaciones (WhatsApp + email + push) |
