# Spec: Clientes y Vehículos

**Última actualización:** Mayo 2026
**Tablas:** `customers`, `vehicles`
**Rutas:** `src/app/(dashboard)/clientes/`, `src/app/(dashboard)/vehiculos/`

---

## Clientes (`customers`)

```typescript
id, organization_id, workshop_id | null
name: string
email: string | null
phone: string | null              // formato normalizado
rfc: string | null                // RFC para México
address: text | null
notes: text | null
is_active: boolean
```

### Sugerencias de Clientes

Al crear una orden, el sistema sugiere clientes existentes basándose en nombre/teléfono similar.
Implementado en `src/app/api/customers/suggestions/route.ts`.

---

## Vehículos (`vehicles`)

```typescript
id, organization_id, workshop_id | null
customer_id: uuid               // propietario
make: string                    // marca (Toyota, Ford...)
model: string
year: integer
license_plate: string
vin: string | null              // número de serie
color: string | null
mileage: integer | null
notes: text | null
```

### Historial

Cada vehículo tiene historial completo de órdenes y cotizaciones.
Endpoint: `GET /api/vehicles/[id]/history` → devuelve:
```typescript
{
  vehicle: { id, brand, model, year, license_plate, vin, color, mileage, customer }
  history: { work_orders[], quotations[], work_orders_count, quotations_count, total_spent }
  summary: { total_services, total_quotations, total_amount_spent, last_service, last_quotation }
}
```

---

## APIs

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET/POST | `/api/customers` | Listar / crear |
| GET/PUT/DELETE | `/api/customers/[id]` | CRUD |
| GET | `/api/customers/suggestions` | Sugerencias para búsqueda |
| GET/POST | `/api/vehicles` | Listar / crear |
| GET/PUT/DELETE | `/api/vehicles/[id]` | CRUD |
| GET | `/api/vehicles/[id]/history` | Historial de servicios y cotizaciones |

---

## Permisos

- Admin y Advisor: CRUD completo
- Mechanic: solo lectura
