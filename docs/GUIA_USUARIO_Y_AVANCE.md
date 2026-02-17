# Guía de uso del ERP (en palabras simples) y avance del proyecto

---

# Parte 1: Cómo usar el sistema (para el usuario del taller)

Esta guía explica qué hace cada parte del sistema y cómo usarla día a día, sin términos técnicos.

---

## Entrar al sistema

1. Abre el enlace que te dieron (por ejemplo: tu-dominio.com o eaglessystem.io).
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

- **Facturación / Ingresos:** Aquí se registran y ven las facturas o comprobantes que emites a los clientes (por órdenes, servicios, etc.).
- **Cobros:** Registrar qué te han pagado (efectivo, transferencia, etc.) y asociarlo a facturas o órdenes.

**Uso típico:** Al cerrar una orden o entregar un servicio, facturar y luego registrar el cobro cuando te paguen.

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

## Porcentaje de avance estimado: **alrededor del 75–80 %**

El sistema ya cubre el flujo principal de un taller: clientes, vehículos, cotizaciones, órdenes (lista y Kanban), inventario (productos, categorías, movimientos), ingresos/cobros, compras (órdenes, proveedores, pagos), reportes básicos, configuración de empresa y usuarios, y roles (admin, mecánico). Por eso se considera **avanzado** (75–80 %).

El resto son mejoras, pulido, integraciones opcionales y temas de calidad (pruebas, documentación, rendimiento).

---

## Lo que ya está hecho (listo para usar)

| Área | Qué hay |
|------|--------|
| **Entrada y seguridad** | Login, registro, recuperar contraseña, perfiles, permisos por rol (admin, mecánico, etc.). |
| **Dashboard** | Resumen con ingresos, órdenes por estado, alertas de inventario, filtros por fechas. |
| **Clientes y vehículos** | Listado, búsqueda, crear, editar. |
| **Cotizaciones** | Crear, editar, ver; convertir en orden de trabajo. |
| **Órdenes de trabajo** | Lista con filtros; Kanban para arrastrar estados; crear orden; detalle con servicios, piezas, fotos, notas; cambiar estados. |
| **Inventario** | Productos, categorías, movimientos de entrada/salida/ajustes. |
| **Ingresos y cobros** | Pantallas de facturación e ingresos; cobros. |
| **Compras** | Órdenes de compra (crear, recibir); proveedores; pagos a proveedores. |
| **Reportes** | Ventas, inventario, financieros (según lo implementado). |
| **Configuración** | Empresa (datos, horarios, moneda, impuestos); usuarios; planes; mensajería (WhatsApp, email). |
| **Extra** | Integración WhatsApp (conectar número, conversaciones); paquetes de servicio; análisis financiero; métricas; notificaciones; búsqueda global. |

---

## Lo que falta o está por pulir (para llegar al 100 %)

| Prioridad | Qué falta o mejorar |
|-----------|----------------------|
| **Alta** | **Pruebas automáticas:** Más pruebas (unitarias e integración) para no romper nada al cambiar código. |
| **Alta** | **Documentación de la API:** Listado claro de todos los endpoints y cómo usarlos (para desarrolladores o integraciones). |
| **Media** | **Citas / agenda:** La sección de citas existe; falta afinar que el flujo “agendar cita → crear orden” quede redondo y estable. |
| **Media** | **Facturación fiscal:** Que la factura cumpla 100 % con el formato y reglas del SAT (CFDI) si se usa en México. |
| **Media** | **Impresión y PDF:** Reportes y comprobantes que se puedan imprimir o descargar en PDF de forma consistente. |
| **Media** | **Estados de WhatsApp:** Algunos casos raros de conexión/desconexión del número; mejorar mensajes al usuario cuando falle. |
| **Baja** | **Monitoreo y logs:** Herramientas para ver errores y uso en producción sin entrar a código. |
| **Baja** | **Rendimiento:** Revisar consultas pesadas y caché en pantallas con muchos datos (órdenes, movimientos, reportes). |
| **Opcional** | **App móvil:** Versión móvil nativa o PWA muy afinada para uso en el taller desde el celular. |
| **Opcional** | **Más integraciones:** Pagos en línea (Stripe/Mercado Pago ya están en proyecto), envío de facturas por correo/WhatsApp automático. |

---

## Cómo leer el porcentaje

- **75–80 %:** El taller puede operar de punta a punta: clientes, órdenes, inventario, compras, ingresos, reportes y configuración. Lo que falta son mejoras de calidad, integraciones opcionales y detalles (citas, facturación fiscal fina, pruebas, API documentada).
- **100 %:** Todo lo de la tabla “qué falta” resuelto o aceptado como “no necesario” para tu caso.

Si quieres, en el siguiente paso podemos bajar esto a un checklist por módulo (por ejemplo “Órdenes 100 %”, “Inventario 90 %”) o preparar una versión corta de esta guía solo para imprimir y dar a los usuarios del taller.
