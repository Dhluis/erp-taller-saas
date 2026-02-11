# Guía de testing E2E – Verificación pre-producción

Checklist manual para validar flujos críticos antes del lanzamiento. Marca cada ítem con ✅ (pasó) o ❌ (falló) al probar.

---

## 1. Registro y onboarding

### 1.1 Crear cuenta nueva

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Ir a la página de registro (ej. `/auth/register`) | Se muestra formulario de registro | |
| 2 | Completar email, contraseña y datos requeridos | Validación en cliente correcta | |
| 3 | Enviar formulario | Cuenta creada; redirección a login o dashboard | |
| 4 | Iniciar sesión con las credenciales nuevas | Sesión activa; se ve layout del dashboard | |

### 1.2 Completar configuración inicial

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Con usuario nuevo (sin organización), acceder al dashboard | Redirección automática a `/onboarding` o pantalla de configuración inicial | |
| 2 | Completar nombre de organización / taller y datos obligatorios | Formulario valida y guarda | |
| 3 | Guardar configuración inicial | Se asigna `organization_id` al usuario; no hay loop de redirección | |

### 1.3 Verificar dashboard carga

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Tras onboarding, navegar al dashboard (/) | Carga la página del dashboard sin error 404/500 | |
| 2 | Revisar sidebar, top bar y contenido principal | Todos los elementos visibles y navegables | |
| 3 | Recargar la página (F5) | Dashboard sigue cargando correctamente; sesión persistida | |

---

## 2. CRUD básico

### 2.1 Crear cliente

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Ir a Clientes → Nueva / Crear cliente | Formulario de cliente visible | |
| 2 | Rellenar nombre, teléfono/email y campos requeridos | Validación correcta; sin errores de consola | |
| 3 | Guardar cliente | Mensaje de éxito; cliente aparece en listado | |
| 4 | Abrir detalle o edición del cliente creado | Datos guardados se muestran correctamente | |

### 2.2 Crear vehículo

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Ir a Vehículos (o Clientes → [cliente] → Vehículos) → Crear vehículo | Formulario de vehículo visible | |
| 2 | Seleccionar cliente y completar marca, modelo, año, placa, etc. | Validación correcta | |
| 3 | Guardar vehículo | Vehículo creado y asociado al cliente; aparece en listado/detalle del cliente | |

### 2.3 Crear orden de trabajo (4 pasos)

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Ir a Órdenes de trabajo → Nueva orden | Se muestra flujo por pasos (ej. Cliente → Vehículo → Servicios → Resumen) | |
| 2 | Paso 1: Seleccionar o crear cliente | Cliente seleccionado; se habilita siguiente paso | |
| 3 | Paso 2: Seleccionar o crear vehículo | Vehículo seleccionado; se habilita siguiente paso | |
| 4 | Paso 3: Añadir servicios/ítems (descripción, precio, cantidad) | Ítems añadidos; totales calculados | |
| 5 | Paso 4: Revisar resumen y confirmar | Orden creada; número de orden asignado; redirección a detalle o listado | |
| 6 | Abrir la orden creada | Todos los datos (cliente, vehículo, ítems) correctos | |

### 2.4 Crear cotización

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Ir a Cotizaciones → Nueva cotización | Formulario de cotización visible | |
| 2 | Seleccionar cliente (dropdown con datos reales) | Lista de clientes carga; se puede elegir uno | |
| 3 | Seleccionar vehículo (filtrado por cliente) | Solo vehículos del cliente seleccionado; se puede elegir uno | |
| 4 | Añadir líneas (servicios/repuestos) con precios | Subtotal y total se actualizan | |
| 5 | Guardar/enviar cotización | Cotización creada; aparece en listado; se puede ver/imprimir | |

---

## 3. WhatsApp e integración

### 3.1 Enviar mensaje WhatsApp

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Ir a la sección de WhatsApp / Mensajes (según la app) | Pantalla de envío o conversaciones visible | |
| 2 | Enviar un mensaje de prueba a un número configurado | Mensaje enviado sin error; confirmación en UI | |
| 3 | Revisar logs o estado del mensaje | Estado “enviado” o equivalente según integración | |

### 3.2 Verificar lead creado

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Tras recibir/registrar interacción por WhatsApp (según flujo) | Se crea un lead en el sistema | |
| 2 | Ir a Leads / Mensajes entrantes | El lead aparece en listado con datos correctos (teléfono, origen, etc.) | |

### 3.3 Convertir lead a cliente

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Abrir un lead desde el listado | Detalle del lead visible | |
| 2 | Ejecutar acción “Convertir a cliente” / “Crear cliente” | Formulario o modal con datos del lead pre-rellenados | |
| 3 | Confirmar conversión | Cliente creado; lead marcado como convertido o vinculado; cliente visible en listado de clientes | |

### 3.4 Crear orden desde lead

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Desde el lead (o desde el cliente recién convertido), iniciar “Crear orden” | Se abre flujo de nueva orden con cliente (y opcionalmente vehículo) ya asociado | |
| 2 | Completar vehículo y servicios según flujo de 4 pasos | Orden creada correctamente | |
| 3 | Verificar en la orden el cliente/origen | Cliente y relación con lead correctos | |

---

## 4. Billing

### 4.1 Trial activo (7 días)

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Con organización en trial, ir a Configuración → Billing / Plan | Se muestra estado “Trial” y días restantes (ej. 7) | |
| 2 | Revisar límites (ej. órdenes, usuarios) | Límites de trial visibles y coherentes | |

### 4.2 Intentar crear orden #21 → modal upgrade

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Con plan Trial (límite ej. 20 órdenes), tener ya 20 órdenes creadas | Sistema reconoce límite alcanzado | |
| 2 | Intentar crear la orden número 21 | Se muestra modal o mensaje de upgrade (no se crea la orden o se bloquea el botón) | |
| 3 | Cerrar modal | Vuelta al flujo normal sin errores | |

### 4.3 Upgrade a Premium

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Desde Billing o desde el modal de upgrade, elegir plan Premium | Redirección a Stripe Checkout o pantalla de pago | |
| 2 | Completar pago (tarjeta de test en Stripe) | Pago exitoso; redirección de vuelta a la app | |
| 3 | Verificar en Billing / Dashboard | Plan actualizado a Premium; límites aumentados | |

### 4.4 Portal Stripe funciona

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | En Billing, hacer clic en “Gestionar suscripción” / “Portal de facturación” | Se abre el portal de Stripe (Customer Portal) en nueva pestaña o ventana | |
| 2 | En el portal, ver método de pago y facturas | Datos de suscripción y facturación visibles | |

### 4.5 Cancelar suscripción

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Desde el portal Stripe (o desde la app si existe la opción), cancelar suscripción | Cancelación procesada; mensaje de confirmación | |
| 2 | Volver a la app y revisar Billing | Estado “Cancelado” o “Activo hasta fin de periodo”; límites según política post-cancelación | |

---

## 5. Divisas

### 5.1 Cambiar moneda en selector

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Localizar selector de moneda (header, configuración o dashboard) | Selector visible y con opciones (ej. USD, EUR, MXN) | |
| 2 | Cambiar a otra moneda | La moneda seleccionada se guarda; la UI refleja el cambio (símbolo o código) | |
| 3 | Recargar la página | La moneda elegida se mantiene | |

### 5.2 Verificar conversión en dashboard

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Con moneda base configurada (ej. USD), revisar totales en dashboard | Totales mostrados en la moneda seleccionada | |
| 2 | Cambiar moneda en el selector | Los totales del dashboard se actualizan según la nueva moneda (o se muestra conversión coherente) | |

### 5.3 Verificar billing muestra dual

| # | Paso a seguir | Resultado esperado | ✅ / ❌ |
|---|----------------|--------------------|---------|
| 1 | Ir a Billing / Facturación con moneda secundaria o no USD configurada | Precios o totales se muestran en moneda local y/o en USD (formato dual) | |
| 2 | Revisar que cantidades y etiquetas sean correctas | Sin errores de redondeo ni etiquetas intercambiadas | |

---

## Resumen de ejecución

| Sección | Pasados | Fallidos | No probados |
|---------|---------|---------|-------------|
| 1. Registro y onboarding | | | |
| 2. CRUD básico | | | |
| 3. WhatsApp e integración | | | |
| 4. Billing | | | |
| 5. Divisas | | | |

**Fecha de última ejecución:** _______________  
**Entorno:** _______________ (staging / producción)  
**Ejecutado por:** _______________

---

*Documento generado para verificación E2E pre-lanzamiento. Ajusta pasos y rutas según la estructura real de tu aplicación.*
