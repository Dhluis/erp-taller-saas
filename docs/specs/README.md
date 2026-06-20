# Specs — Eagles System ERP

Fuente de verdad por módulo. Actualizar al final de cada sesión cuando se modifica un módulo.

| Spec | Módulo |
|------|--------|
| [auth-permissions.md](auth-permissions.md) | Autenticación, roles, multi-tenancy |
| [work-orders.md](work-orders.md) | Órdenes de trabajo, estados, notificaciones |
| [invoices-quotations.md](invoices-quotations.md) | Cotizaciones, facturas, pagos |
| [inventory.md](inventory.md) | Inventario, categorías, movimientos, antifraude |
| [customers-vehicles.md](customers-vehicles.md) | Clientes, vehículos, historial |
| [purchases-suppliers.md](purchases-suppliers.md) | Proveedores, órdenes de compra, anticipos |
| [finances.md](finances.md) | Cuentas, movimientos, KPIs, reportes |
| [whatsapp-communications.md](whatsapp-communications.md) | WhatsApp Twilio, email, push notifications |
| [billing-plans.md](billing-plans.md) | Planes SaaS, Hotmart, límites |
| [antifraude.md](antifraude.md) | Sistema de detección de anomalías |

## Protocolo de actualización

Cuando terminas de implementar algo nuevo:
1. Actualiza el spec del módulo afectado (`docs/specs/[modulo].md`)
2. Si hay cambios de BD, actualiza también `docs/DATABASE_SCHEMA.md`
3. Si cambia el estado general del proyecto, actualiza `docs/PROJECT_STATUS.md`
