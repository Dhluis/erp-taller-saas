# 🔧 Fix: Modal de Citas desde Calendario

## 📅 Fecha: 3 de Diciembre 2025

---

## 🐛 Problema Reportado

El usuario reportó que al hacer clic en una cita había comportamientos diferentes:

1. ✅ **Desde el botón de editar (llave 🔧):** El modal se abría CON todos los datos del cliente y vehículo
2. ❌ **Desde el calendario (clic en la cita):** El modal se abría VACÍO, como si fuera para crear una nueva cita

---

## 🔍 Análisis del Problema

### Causa Raíz

Los datos de las citas vienen de Supabase con una **estructura anidada**:

```typescript
// ✅ ESTRUCTURA REAL que retorna Supabase
{
  id: "123",
  service_type: "Cambio de aceite",
  appointment_date: "2025-12-04",
  appointment_time: "10:00",
  customer: {              // ← OBJETO ANIDADO
    id: "456",
    name: "Mario Pérez",
    phone: "+52 444 77 2020",
    email: "mario@gmail.com"
  },
  vehicle: {               // ← OBJETO ANIDADO
    id: "789",
    brand: "Chevrolet",
    model: "Sierra",
    license_plate: "ABC-123"
  }
}
```

Pero la función `handleEdit` estaba buscando campos **planos** que no existen:

```typescript
// ❌ CÓDIGO VIEJO - Buscaba campos planos
const handleEdit = (appointment: Appointment) => {
  setFormData({
    customer_name: appointment.customer_name,      // ← undefined
    customer_phone: appointment.customer_phone,    // ← undefined
    customer_email: appointment.customer_email,    // ← undefined
    vehicle_info: appointment.vehicle_info,        // ← undefined
    // ...
  })
}
```

**Resultado:** El formulario se llenaba con valores vacíos (`undefined` → `''`)

---

## ✅ Solución Implementada

Actualicé `handleEdit` para que lea correctamente de **ambas estructuras**:

```typescript
// ✅ CÓDIGO NUEVO - Lee de estructura anidada O plana
const handleEdit = (appointment: Appointment) => {
  console.log('📝 [handleEdit] Editando cita:', appointment)
  setEditingAppointment(appointment)
  
  // Obtener nombre del cliente (puede venir de customer.name o customer_name)
  const customerName = appointment.customer?.name || appointment.customer_name || ''
  const customerPhone = appointment.customer?.phone || appointment.customer_phone || ''
  const customerEmail = appointment.customer?.email || appointment.customer_email || ''
  
  // Construir vehicle_info si viene de la relación vehicle
  let vehicleInfo = appointment.vehicle_info || ''
  if (appointment.vehicle && !vehicleInfo) {
    vehicleInfo = `${appointment.vehicle.brand} ${appointment.vehicle.model}${
      appointment.vehicle.license_plate ? ` - ${appointment.vehicle.license_plate}` : ''
    }`
  }
  
  console.log('📝 [handleEdit] Datos del formulario:', {
    customerName,
    customerPhone,
    customerEmail,
    vehicleInfo
  })
  
  setFormData({
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    vehicle_info: vehicleInfo,
    service_type: appointment.service_type,
    appointment_date: appointment.appointment_date,
    appointment_time: appointment.appointment_time || '',
    status: (appointment.status as 'scheduled' | 'confirmed' | 'completed' | 'cancelled') || 'scheduled',
    notes: appointment.notes || '',
    estimated_duration: appointment.estimated_duration || appointment.duration || 60
  })
  setIsDialogOpen(true)
}
```

---

## 🎯 Cambios Específicos

### 1. **Lectura de Datos del Cliente**

**Antes ❌:**
```typescript
customer_name: appointment.customer_name || ''
```

**Ahora ✅:**
```typescript
const customerName = appointment.customer?.name || appointment.customer_name || ''
//                   ↑ Prioridad 1: anidado     ↑ Prioridad 2: plano
```

### 2. **Construcción de Información del Vehículo**

**Antes ❌:**
```typescript
vehicle_info: appointment.vehicle_info || ''
// Si no existe el campo plano, queda vacío
```

**Ahora ✅:**
```typescript
let vehicleInfo = appointment.vehicle_info || ''
if (appointment.vehicle && !vehicleInfo) {
  vehicleInfo = `${appointment.vehicle.brand} ${appointment.vehicle.model}${
    appointment.vehicle.license_plate ? ` - ${appointment.vehicle.license_plate}` : ''
  }`
}
// Ejemplo: "Chevrolet Sierra - ABC-123"
```

### 3. **Logs de Debugging**

Se agregaron logs para facilitar el debugging:

```typescript
console.log('📝 [handleEdit] Editando cita:', appointment)
console.log('📝 [handleEdit] Datos del formulario:', {
  customerName,
  customerPhone,
  customerEmail,
  vehicleInfo
})
```

---

## 📊 Comparación Antes/Después

### Escenario: Clic en una cita del calendario

**Antes ❌:**

```
Usuario hace clic en "Cambio de aceite - 10:00"
↓
handleEdit recibe:
{
  customer: { name: "Mario Pérez", phone: "+52..." }
  vehicle: { brand: "Chevrolet", model: "Sierra" }
}
↓
Código busca:
appointment.customer_name  → undefined
appointment.vehicle_info   → undefined
↓
Modal se abre con campos VACÍOS
```

**Ahora ✅:**

```
Usuario hace clic en "Cambio de aceite - 10:00"
↓
handleEdit recibe:
{
  customer: { name: "Mario Pérez", phone: "+52..." }
  vehicle: { brand: "Chevrolet", model: "Sierra" }
}
↓
Código busca:
appointment.customer?.name  → "Mario Pérez" ✓
vehicleInfo construido      → "Chevrolet Sierra" ✓
↓
Modal se abre con campos COMPLETOS
```

---

## 🧪 Testing

### ✅ Casos Probados

1. **Clic en llave (editar) desde la lista**
   - ✅ Modal se abre con datos completos
   - ✅ Campos del cliente poblados
   - ✅ Información del vehículo visible

2. **Clic en cita desde calendario**
   - ✅ Modal se abre con datos completos (FIX)
   - ✅ Campos del cliente poblados (FIX)
   - ✅ Información del vehículo visible (FIX)

3. **Crear nueva cita**
   - ✅ Modal se abre vacío (comportamiento correcto)
   - ✅ Formulario listo para llenar

---

## 📝 Archivos Modificados

| Archivo | Cambio | Líneas |
|---------|--------|--------|
| `src/app/citas/page.tsx` | Actualizada función `handleEdit` | 253-290 |

---

## 🔗 Flujo de Datos Completo

```
1. CARGA DE DATOS
   ↓
   Supabase query con JOIN
   .select(`
     *,
     customer:customers(id, name, phone, email),
     vehicle:vehicles(id, brand, model, license_plate)
   `)
   ↓
   Datos se guardan en state con estructura anidada

2. CALENDARIO
   ↓
   Usuario hace clic en cita
   onClick={() => handleEdit(apt)}
   ↓
   handleEdit recibe appointment con estructura anidada

3. FUNCIÓN handleEdit (MEJORADA)
   ↓
   Lee de appointment.customer?.name (anidado)
   O fallback a appointment.customer_name (plano)
   ↓
   Construye vehicle_info si no existe
   ↓
   Llena formData correctamente

4. MODAL
   ↓
   Se abre con datos completos
   Usuario puede editar la cita
```

---

## 💡 Lecciones Aprendidas

### 1. **Compatibilidad con Múltiples Estructuras**

Usar operador de coalescencia (`||`) para soportar ambas estructuras:

```typescript
// ✅ Funciona con datos anidados Y planos
const value = nested?.property || flat_property || defaultValue
```

### 2. **Logs Estratégicos**

Agregar logs al inicio de funciones críticas ayuda al debugging:

```typescript
console.log('📝 [handleEdit] Editando cita:', appointment)
```

### 3. **Construcción Dinámica de Datos**

Si un campo no existe, construirlo a partir de datos relacionados:

```typescript
if (appointment.vehicle && !vehicleInfo) {
  vehicleInfo = `${appointment.vehicle.brand} ${appointment.vehicle.model}`
}
```

---

## 🚨 Consideraciones Futuras

### 1. **Normalizar Estructura**

Considerar mapear los datos al cargarlos para tener una estructura consistente:

```typescript
const normalizedAppointments = appointmentsData.map(apt => ({
  ...apt,
  customer_name: apt.customer?.name,
  customer_phone: apt.customer?.phone,
  customer_email: apt.customer?.email,
  vehicle_info: apt.vehicle 
    ? `${apt.vehicle.brand} ${apt.vehicle.model}` 
    : apt.vehicle_info
}))
```

### 2. **TypeScript Estricto**

Mejorar los tipos para reflejar la estructura real:

```typescript
interface Appointment extends BaseAppointment {
  customer?: {
    id: string
    name: string
    phone?: string
    email?: string
  }
  vehicle?: {
    id: string
    brand: string
    model: string
    license_plate?: string
  }
  // Campos legacy para compatibilidad
  customer_name?: string
  customer_phone?: string
  vehicle_info?: string
}
```

---

## 🎉 Resultado Final

### Antes ❌
- Clic en calendario → Modal vacío
- Confusión del usuario
- Datos inconsistentes

### Ahora ✅
- Clic en calendario → Modal con datos completos
- Experiencia consistente
- Funciona desde cualquier punto de entrada

---

**Estado:** ✅ Corregido y Funcionando  
**Impacto:** Alto - UX mejorada significativamente  
**Breaking Changes:** Ninguno (retrocompatible)  
**Última actualización:** 3 de Diciembre 2025





