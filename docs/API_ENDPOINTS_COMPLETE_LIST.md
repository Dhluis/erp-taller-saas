# 📋 Lista Completa de Endpoints API

## Endpoints Principales

| Ruta | Métodos | Descripción |
|------|---------|-------------|
| `/api/customers` | GET, POST | Listar y crear clientes |
| `/api/customers/[id]` | GET, PUT, DELETE | Obtener, actualizar y eliminar cliente específico |
| `/api/customers/[id]/vehicles` | GET, POST | Obtener vehículos de un cliente y agregar vehículo |
| `/api/work-orders` | GET, POST | Listar y crear órdenes de trabajo |
| `/api/work-orders/[id]` | GET, PUT, DELETE | Obtener, actualizar y eliminar orden de trabajo |
| `/api/work-orders/[id]/items` | GET, POST | Gestión de items de orden de trabajo |
| `/api/work-orders/[id]/images` | POST, DELETE | Subir y eliminar imágenes de orden de trabajo |
| `/api/work-orders/[id]/status` | PUT | Actualizar estado de orden de trabajo |
| `/api/work-orders/stats` | GET | Estadísticas de órdenes de trabajo |
| `/api/inventory` | GET, POST | Listar y crear artículos de inventario |
| `/api/inventory/[id]` | GET, PUT, DELETE | Obtener, actualizar y eliminar artículo de inventario |
| `/api/inventory/categories` | GET, POST | Listar y crear categorías de inventario |
| `/api/inventory/categories/[id]` | GET, PUT, DELETE | Gestión de categoría específica |
| `/api/inventory/movements` | GET, POST | Listar y crear movimientos de inventario |
| `/api/inventory/movements/[id]` | GET | Obtener movimiento específico |
| `/api/inventory/movements/stats` | GET | Estadísticas de movimientos |
| `/api/inventory/low-stock` | GET | Artículos con stock bajo |
| `/api/inventory/stats` | GET | Estadísticas generales de inventario |
| `/api/vehicles` | GET, POST | Listar y crear vehículos |
| `/api/vehicles/[id]` | GET | Obtener vehículo específico |
| `/api/vehicles/[id]/history` | GET | Historial de un vehículo |
| `/api/vehicles/search` | GET | Buscar vehículos |
| `/api/quotations` | GET, POST, PATCH | Listar, crear y operaciones masivas de cotizaciones |
| `/api/quotations/[id]` | GET, PUT, DELETE, PATCH | CRUD completo de cotización |
| `/api/quotations/[id]/status` | GET, PUT | Obtener y actualizar estado de cotización |
| `/api/quotations/[id]/items` | GET, POST, PUT | Gestión de items de cotización |
| `/api/quotations/[id]/items/[itemId]` | GET, PUT, DELETE | Gestión de item específico |
| `/api/quotations/[id]/convert` | GET, POST | Convertir cotización a orden de trabajo o nota de venta |
| `/api/quotations/[id]/send` | POST | Enviar cotización por email |
| `/api/quotations/bulk-status` | PUT | Actualizar estado de múltiples cotizaciones |
| `/api/suppliers` | GET, POST | Listar y crear proveedores |
| `/api/suppliers/[id]` | GET, PUT, DELETE | Gestión de proveedor específico |
| `/api/suppliers/[id]/payments` | GET | Pagos de un proveedor |
| `/api/suppliers/[id]/purchase-orders` | GET | Órdenes de compra de un proveedor |
| `/api/suppliers/stats` | GET | Estadísticas de proveedores |
| `/api/invoices` | GET, POST | Listar y crear notas de venta |
| `/api/invoices/[id]` | GET, PUT, DELETE, PATCH | CRUD completo de nota de venta |
| `/api/invoices/[id]/items` | GET, POST, PUT | Gestión de items de nota de venta |
| `/api/invoices/[id]/items/[itemId]` | GET, PUT, DELETE | Gestión de item específico |
| `/api/invoices/[id]/discount` | PUT | Actualizar descuento de nota de venta |
| `/api/invoices/[id]/pay` | POST | Registrar pago de nota de venta |
| `/api/invoices/unpaid` | GET | Notas de venta sin pagar |
| `/api/invoices/overdue` | GET | Notas de venta vencidas |
| `/api/invoices/from-order` | POST | Crear nota de venta desde orden |
| `/api/payments` | GET, POST | Listar y crear pagos |
| `/api/payments/[id]` | GET, PUT, DELETE | Gestión de pago específico |
| `/api/payments/invoice/[invoiceId]` | GET | Pagos de una nota de venta |
| `/api/orders` | GET, POST | Listar y crear órdenes |
| `/api/orders/[id]` | GET, PATCH, DELETE | Obtener, actualizar y eliminar orden |
| `/api/orders/[id]/items` | GET, POST | Gestión de items de orden |
| `/api/orders/[id]/items/[itemId]` | GET, PUT, DELETE | Gestión de item específico |
| `/api/orders/[id]/totals` | GET, POST | Calcular totales de orden |
| `/api/orders/stats` | GET | Estadísticas de órdenes |
| `/api/employees` | GET, POST | Listar y crear empleados |
| `/api/services` | GET, POST | Listar y crear servicios |
| `/api/notifications` | GET | Listar notificaciones |
| `/api/notifications/[id]` | GET, PUT, DELETE | Gestión de notificación específica |
| `/api/notifications/mark-all-read` | POST | Marcar todas las notificaciones como leídas |
| `/api/notifications/stats` | GET | Estadísticas de notificaciones |
| `/api/notifications/urgent` | GET | Notificaciones urgentes |
| `/api/notifications/auto-check` | POST | Verificación automática de notificaciones |
| `/api/notifications/info` | GET | Información sobre notificaciones |
| `/api/appointments` | GET | Listar citas |
| `/api/appointments/stats` | GET | Estadísticas de citas |
| `/api/invitations` | GET, POST, DELETE | Listar, crear y cancelar invitaciones |
| `/api/invitations/resend` | POST | Reenviar invitación |
| `/api/users` | GET, POST | Listar y crear usuarios |
| `/api/users/[id]` | GET, PUT, DELETE | Gestión de usuario específico |
| `/api/users/[id]/activate` | PUT | Activar/desactivar usuario |
| `/api/users/[id]/role` | PUT | Actualizar rol de usuario |
| `/api/users/me` | GET | Obtener perfil del usuario actual |
| `/api/users/stats` | GET | Estadísticas de usuarios |
| `/api/purchase-orders` | GET, POST | Listar y crear órdenes de compra |
| `/api/purchase-orders/[id]` | GET, PUT, DELETE | Gestión de orden de compra |
| `/api/purchase-orders/[id]/approve` | POST | Aprobar orden de compra |
| `/api/purchase-orders/[id]/receive` | POST | Recibir orden de compra |
| `/api/conversions/quotation-to-invoice` | POST | Convertir cotización a nota de venta |
| `/api/conversions/work-order-to-quotation` | POST | Convertir orden de trabajo a cotización |
| `/api/conversions/work-order-to-invoice` | POST | Convertir orden de trabajo a nota de venta |
| `/api/search/global` | GET | Búsqueda global en el sistema |
| `/api/search/suggestions` | GET | Sugerencias de búsqueda |
| `/api/reports/customers` | GET | Reporte de clientes |
| `/api/reports/sales` | GET | Reporte de ventas |
| `/api/reports/inventory` | GET | Reporte de inventario |
| `/api/reports/performance` | GET | Reporte de rendimiento |
| `/api/reports/suppliers` | GET | Reporte de proveedores |
| `/api/reports/dashboard` | GET | Reporte del dashboard |
| `/api/kpis/dashboard` | GET | KPIs del dashboard |
| `/api/kpis/orders-status` | GET | KPIs de estado de órdenes |
| `/api/kpis/sales-chart` | GET | Gráfico de ventas |
| `/api/kpis/top-customers` | GET | Top clientes |
| `/api/kpis/top-products` | GET | Top productos |
| `/api/kpis/performance` | GET | KPIs de rendimiento |
| `/api/kpis/low-stock` | GET | KPIs de stock bajo |
| `/api/kpis/info` | GET | Información sobre KPIs |
| `/api/backups` | GET, POST | Listar y crear backups |
| `/api/backups/[id]` | GET | Obtener backup específico |
| `/api/backups/[id]/restore` | POST | Restaurar backup |
| `/api/backups/[id]/verify` | GET | Verificar backup |
| `/api/backups/stats` | GET | Estadísticas de backups |
| `/api/backups/schedule` | GET, POST | Programar backups |
| `/api/backups/cleanup` | POST | Limpiar backups antiguos |
| `/api/backups/info` | GET | Información sobre backups |
| `/api/seed` | POST | Seed de datos de prueba |
| `/api/seed/inventory` | POST | Seed de inventario |
| `/api/inspections` | POST | Crear inspección |
| `/api/admin/migrate-customers` | POST | Migrar clientes |
| `/api/admin/migrate-orders` | POST | Migrar órdenes |
| `/api/admin/migrate-webhooks` | GET, POST | Migrar webhooks |
| `/api/swagger.json` | GET | Documentación Swagger |
| `/api/docs/info` | GET | Información de documentación |

## Finanzas (agregados 2026)

| Ruta | Métodos | Descripción |
|------|---------|-------------|
| `/api/financial-transactions` | GET, POST | Libro de movimientos (ingresos/gastos diarios) |
| `/api/cash-accounts` | GET, POST | Cuentas de efectivo, banco y tarjeta |
| `/api/cash-accounts/[id]` | GET, PUT, DELETE | Gestión de cuenta específica |
| `/api/cash-account-movements` | GET, POST | Movimientos de una cuenta de efectivo |
| `/api/supplier-payments` | GET, POST | Pagos a proveedores |
| `/api/collections` | GET, POST | Cobros a clientes |
| `/api/invoices/[id]/payments` | GET, POST | Pagos registrados contra una factura |
| `/api/ingresos/stats` | GET | KPIs: ingresos del mes, hoy, ticket promedio |

## Comunicaciones (agregados 2026)

| Ruta | Métodos | Descripción |
|------|---------|-------------|
| `/api/push/subscribe` | POST, DELETE | Suscribir/cancelar push notifications |
| `/api/push/send` | POST | Enviar push a todos los suscriptores de la org |
| `/api/work-orders/[id]/notify` | POST | Notificar al cliente sobre estado de su orden |
| `/api/messaging/twilio/webhook/[organizationId]` | POST | Webhook de Twilio (WhatsApp entrante) |

## Billing (Hotmart)

| Ruta | Métodos | Descripción |
|------|---------|-------------|
| `/api/webhooks/hotmart` | POST | Webhook de pagos Hotmart (verificado con hottok) |
| `/api/billing/status` | GET | Estado de suscripción de la organización |
| `/api/billing/plans` | GET | Planes disponibles |

## Notas

- **Excluidos de esta lista**: `/api/auth/*`, `/api/test-*` (bloqueados en producción)
- Todos los endpoints requieren `organization_id` válido en sesión
- Los endpoints con `[id]` son rutas dinámicas de Next.js App Router
- Webhook de Hotmart es público (verificado por `HOTMART_HOTTOK` con `timingSafeEqual`)

