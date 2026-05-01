# Guía de uso del ERP (en palabras simples) y avance del proyecto

---

# Parte 1: Cómo usar el sistema (para el usuario del taller)

Esta guía explica qué hace cada parte del sistema y cómo usarla día a día, sin términos técnicos.

---

## Entrar al sistema

1. Abre el enlace que te dieron (por ejemplo: tu-dominio.com o confiadrive.io).
2. Escribe tu **correo** y **contraseña** y haz clic en **Iniciar sesión**.
3. La primera vez puede pedirte completar datos de tu taller (nombre, teléfono, etc.). Rellénalos y guarda.

---

## Pantalla principal (Dashboard)

Ahí ves un resumen del taller:

- **Gráfica de ingresos**: cuánto ha entrado en el tiempo que elijas (hoy, semana, mes, etc.).
- **Órdenes por estado**: cuántas órdenes hay en recepción, diagnóstico, en reparación, listas, etc.
- **Alertas de inventario**: si algún producto está por acabarse.
- **Acciones rápidas**: botones para crear orden, ver órdenes, etc.

**Qué hacer:** Revisar esta pantalla al empezar el día para ver el estado general.

---

## Clientes y vehículos

- **Clientes**  
  Lista de clientes. Puedes agregar nuevos (nombre, teléfono, correo, etc.) y buscar o editar los que ya existen.

- **Vehículos**  
  Aquí se guardan los autos (marca, modelo, año, placa, etc.) y con qué cliente están asociados.

**Uso típico:** Antes de crear una orden, asegúrate de tener al cliente y al vehículo dados de alta (o créalos desde la misma pantalla de la orden).

---

## Cotizaciones

Una **cotización** es un presupuesto que le das al cliente antes de hacer el trabajo.

- Puedes **crear** una cotización nueva (cliente, vehículo, servicios o productos, precios).
- Puedes **ver** y **editar** cotizaciones.
- Cuando el cliente acepta, desde la cotización puedes generar la **orden de trabajo**.

**Uso típico:** Crear cotización → enviar al cliente → cuando acepte, convertir en orden.

---

## Órdenes de trabajo (el corazón del taller)

Las **órdenes** son los trabajos que entran al taller. Cada orden pasa por varios estados, por ejemplo:

1. **Recepción** – Acaba de llegar.
2. **Diagnóstico** – Se está revisando el auto.
3. **Cotización** – Se armó el presupuesto.
4. **Esperando aprobación** – El cliente debe decir sí o no.
5. **En reparación** / **Esperando piezas** / **Armado** / **Pruebas** – Fases del trabajo.
6. **Listo** – Terminado, pendiente de entrega.
7. **Completado** – Entregado al cliente.

**Cómo trabajar con órdenes:**

- **Vista lista (Órdenes):** Lista de todas las órdenes; puedes filtrar por estado, fecha, cliente.
- **Vista Kanban (Mis Órdenes / Kanban):** Tarjetas por columna (Recepción, Diagnóstico, etc.). Arrastras la tarjeta a otra columna para cambiar el estado. Muy útil para mecánicos.
- **Crear orden:** Botón “Nueva orden” o “Crear orden”. Llenas cliente, vehículo, qué se va a hacer, y guardas.
- **Ver detalle:** Clic en una orden para ver todo: datos del cliente, vehículo, servicios, piezas, notas, fotos, etc. Desde ahí puedes editar y cambiar estado.

**Uso típico:** Crear la orden al recibir el auto → ir moviendo la tarjeta (o el estado) según avance el trabajo → al terminar, marcar como Listo y luego Completado al entregar.

---

## Inventario

Todo lo que vendes o usas en el taller (refacciones, lubricantes, etc.) se controla aquí.

- **Productos:** Lista de productos. Puedes agregar nombre, código, precio, cuánto hay en stock, categoría.
- **Categorías:** Agrupar productos (por ejemplo: “Filtros”, “Lubricantes”).
- **Movimientos:** Ver entradas y salidas de inventario (qué entró, qué salió, ajustes). Ayuda a no quedarte sin piezas.

**Uso típico:** Dar de alta productos y categorías una vez; luego solo revisar movimientos y stock. Si algo está bajo, comprar o hacer ajuste.

---

## Ingresos, facturación y cobros

- **Notas de venta (Facturas):** Comprobantes que emites a clientes por órdenes o servicios. Puedes registrar pagos parciales o totales contra cada nota.
- **Pagos de facturas:** Registrar cuánto y cuándo pagó el cliente. La factura se marca automáticamente como pagada al completar el monto.
- **Cobros:** Registrar cobros directos a clientes (fuera de una factura específica). Puede asociarse a una cuenta de efectivo.

**Uso típico:** Cerrar orden → generar nota de venta → registrar pago cuando el cliente pague.

---

## Entradas y Salidas (Libro de Movimientos)

Registro diario de **todos** los ingresos y gastos del taller, independiente de órdenes o facturas.

- **Ingreso:** Registra una entrada de dinero (servicios, venta, otro).
- **Gasto:** Registra una salida de dinero (compra, renta, nómina, etc.).
- **Cuentas de efectivo:** Separar el dinero por caja (Caja chica, Cuenta banco, Tarjeta). Cada ingreso o gasto puede asociarse a una cuenta para reflejar saldo real.

**Uso típico:** Registrar gastos del día (refacciones pagadas en efectivo, servicios externos) y verificar que el saldo de cada cuenta cuadre.

---

## Compras (a proveedores)

- **Órdenes de compra:** Pedidos que tú haces a proveedores (piezas, materiales). Puedes crear una orden, ver su estado y, cuando llegue, marcarla como “recibida”.
- **Proveedores:** Lista de proveedores (nombre, contacto, etc.).
- **Pagos a proveedores:** Registrar pagos que tú haces a proveedores.

**Uso típico:** Crear orden de compra cuando necesites piezas → al recibir, marcar recibido → después registrar el pago en Pagos.

---

## Reportes

Pantallas que resumen información para tomar decisiones:

- **Ventas:** Qué se ha vendido, en qué periodo.
- **Inventario:** Estado del stock, movimientos, alertas.
- **Financieros:** Ingresos, gastos, flujo de dinero (según lo que esté implementado).

**Uso típico:** Entrar cuando necesites “números” del taller (ventas, stock, finanzas).

---

## Configuración del taller

- **Empresa:** Datos del taller (nombre, RFC, dirección, teléfono, correo, logo, horarios de atención, moneda, impuestos, etc.). Es lo que verán los clientes en facturas y comunicaciones.
- **Usuarios:** Si tienes permisos, puedes agregar o quitar usuarios del sistema (mecánicos, administración) y asignar qué pueden ver o hacer.
- **Planes:** Ver o cambiar el plan de suscripción del sistema (si aplica).
- **Mensajería:** Configuración para enviar mensajes (por ejemplo WhatsApp o correo) desde el sistema.

**Uso típico:** Configurar empresa una vez; usuarios cuando entren o salgan personas del equipo; mensajería si quieres enviar notificaciones automáticas.

---

## Perfil y cerrar sesión

- **Mi perfil:** Ver o cambiar tu nombre, correo, contraseña o foto.
- **Cerrar sesión:** Salir del sistema de forma segura (esquina superior, menú de usuario).

---

## Resumen rápido por rol

- **Dueño / administrador:** Dashboard, clientes, vehículos, cotizaciones, órdenes, inventario, ingresos/cobros, compras, reportes, configuración (empresa, usuarios, planes).
- **Mecánico:** Dashboard, Mis Órdenes (Kanban), ver y actualizar órdenes asignadas, Mi perfil.
- **Recepcionista / ventas:** Clientes, vehículos, cotizaciones, órdenes (crear y seguir), algo de inventario e ingresos según permisos.

---

# Parte 2: Avance del proyecto y qué falta

---

## Porcentaje de avance estimado: **alrededor del 95 %**

El sistema cubre el flujo completo de un taller en producción: clientes, vehículos, cotizaciones, órdenes (lista y Kanban), inventario, finanzas (entradas/salidas, cuentas de efectivo, cobros, pagos a proveedores), facturación, compras, reportes, configuración, y roles. El billing SaaS (Hotmart), WhatsApp vía Twilio, notificaciones push y seguridad de producción están implementados. Lo que falta son mejoras de calidad y detalles menores.

---

## Lo que ya está hecho (listo para usar)

| Área | Qué hay |
|------|--------|
| **Entrada y seguridad** | Login, registro, Google OAuth, perfiles, permisos por rol (admin, mecánico, recepcionista). Contraseñas mínimo 8 caracteres + número. |
| **Dashboard** | KPIs financieros con flip privado: ingresos del mes, efectivo, bancos/tarjetas, ticket promedio. Órdenes por estado, alertas de stock. |
| **Clientes y vehículos** | Listado, búsqueda, crear, editar, historial de vehículo. |
| **Cotizaciones** | Crear, editar, ver; convertir en orden de trabajo o nota de venta. |
| **Órdenes de trabajo** | Lista con filtros; Kanban por estado; crear orden; detalle con servicios, piezas, fotos, notas; notificación automática al cliente por WhatsApp al cambiar estado. |
| **Inventario** | Productos, categorías, movimientos de entrada/salida/ajustes, alertas de stock bajo. |
| **Finanzas** | Notas de venta (facturas) con pagos parciales; libro de entradas y salidas; cuentas de efectivo/banco/tarjeta; cobros a clientes; pagos a proveedores. |
| **Compras** | Órdenes de compra (crear, aprobar, recibir); proveedores; pagos a proveedores. |
| **Reportes** | Ventas, inventario, financieros, dashboard de KPIs. |
| **Configuración** | Empresa; usuarios e invitaciones; planes; mensajería (WhatsApp Twilio, email). |
| **Comunicaciones** | WhatsApp vía Twilio (conversaciones, respuestas automáticas por IA); email (SendGrid); push notifications (PWA). |
| **Billing SaaS** | Suscripción mensual vía Hotmart; trial de 7 días; bloqueo automático al vencer. |

---

## Lo que falta o está por pulir (para llegar al 100 %)

| Prioridad | Qué falta o mejorar |
|-----------|----------------------|
| **Media** | **CSP en modo enforced:** El Content-Security-Policy está en modo observación; activarlo en producción tras validar que no bloquea nada. |
| **Media** | **Citas / agenda:** La sección existe; falta afinar el flujo “agendar cita → crear orden” de forma fluida. |
| **Media** | **Facturación electrónica (SAT/CFDI):** Fuera del alcance actual. La facturación interna (cobros, pagos, totales) sí está. |
| **Media** | **Impresión y PDF:** Reportes y comprobantes descargables en PDF de forma consistente. |
| **Baja** | **Pruebas automáticas:** Más cobertura de pruebas para prevenir regresiones. |
| **Baja** | **Rate limiting fail-closed:** Si Redis no responde, el login sigue funcionando (sin bloqueo). Evaluar si es aceptable. |
| **Baja** | **Rendimiento:** Revisar consultas pesadas en pantallas con muchos datos (órdenes, movimientos). |
| **Opcional** | **Facturación electrónica integrada:** Para mercados que requieren CFDI/XML oficial. |

---

## Cómo leer el porcentaje

- **75–80 %:** El taller puede operar de punta a punta: clientes, órdenes, inventario, compras, ingresos, reportes y configuración. Lo que falta son mejoras de calidad, integraciones opcionales y detalles (citas, facturación fiscal fina, pruebas, API documentada).
- **100 %:** Todo lo de la tabla “qué falta” resuelto o aceptado como “no necesario” para tu caso.

Si quieres, en el siguiente paso podemos bajar esto a un checklist por módulo (por ejemplo “Órdenes 100 %”, “Inventario 90 %”) o preparar una versión corta de esta guía solo para imprimir y dar a los usuarios del taller.

