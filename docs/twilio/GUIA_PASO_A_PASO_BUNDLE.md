# 📋 Guía Paso a Paso: Crear Regulatory Bundle en Twilio

## 🎯 Objetivo
Crear un Regulatory Bundle para poder usar números locales de SMS en Twilio (requerido para países LATAM).

---

## 📍 Paso 1: Acceder a Twilio Console

1. Ve a: https://console.twilio.com/
2. Inicia sesión con tu cuenta de Twilio
3. Navega a: **Develop** → **Phone Numbers** → **Regulatory Compliance** → **Bundles**
4. Haz clic en **"Create a Regulatory Bundle"**

---

## 🌍 Paso 2: Elegir País y Tipo de Número

### 2.1 Seleccionar País
- **Campo:** "Country"
- **Valor:** Selecciona el país donde operarás
  - Para México: `MX (+52) Mexico - MX`
  - Para Colombia: `CO (+57) Colombia - CO`
  - Para Argentina: `AR (+54) Argentina - AR`
  - ... (según el país que necesites)

### 2.2 Seleccionar Tipo de Número
- **Campo:** "Type of Phone Number"
- **Opciones disponibles:**
  - ✅ **"Local"** ← **SELECCIONA ESTE** (para números locales del país)
  - ❌ "Toll-Free" (no requiere Bundle, pero tiene limitaciones)
  - ❌ "Mobile" (si está disponible)

**⚠️ IMPORTANTE:** Selecciona **"Local"** para números locales del país.

### 2.3 Continuar
- Haz clic en **"Next"** (se habilitará después de seleccionar ambos campos)

**💾 Guardado Automático:** Los datos se guardan automáticamente mientras avanzas. Puedes volver atrás usando las flechas en cada paso sin perder información.

---

## 👤 Paso 3: Seleccionar End-User (Usuario Final)

### 3.1 Información del End-User
- **Nombre:** "Confia Drive" o el nombre de tu empresa
- **Tipo:** 
  - ✅ **"Business"** (si es una empresa)
  - O "Individual" (si es persona física)
- **Email:** Tu email de contacto empresarial
- **Teléfono:** Tu número de contacto

**⚠️ IMPORTANTE - ACLARACIÓN SOBRE EL NÚMERO DE TELÉFONO:**
- El número que ingresas aquí (ej: 449 169 86 35) es **SOLO para contacto**
- **NO se pierde ni deja de pertenecerte**
- Es el número donde Twilio puede contactarte si necesita información adicional
- **NO es el número que usarás para enviar SMS**
- El número para SMS se compra **DESPUÉS** de que el Bundle sea aprobado
- Puedes usar tu número personal o empresarial sin problema
- Este número sigue siendo tuyo y funcionando normalmente

### 3.2 Continuar
- Haz clic en **"Next"**

---

## 🏢 Paso 4: Agregar Información del Negocio

### 4.1 Información Básica

**Nombre Legal:**
- Nombre registrado de tu empresa
- Ejemplo: "Confia Drive S.A. de C.V." (México)
- Ejemplo: "Confia Drive S.A.S." (Colombia)

**Dirección Completa:**
- **Calle y Número:** Dirección física completa
- **Colonia/Barrio:** Colonia o barrio
- **Ciudad:** Ciudad donde opera
- **Estado/Provincia:** Estado o provincia
- **Código Postal:** Código postal
- **País:** Ya está pre-seleccionado según el país elegido

### 4.2 Información del Negocio

**Tipo de Negocio:**
- Selecciona: **"Automotive Repair Shop"** o **"Automotive Services"**
- O el tipo más cercano a tu actividad

**Descripción del Negocio:**
- Ejemplo: "Servicios de reparación y mantenimiento automotriz"
- Ejemplo: "Taller mecánico especializado en reparación de vehículos"
- Describe brevemente qué hace tu negocio

**Sitio Web (Opcional):**
- URL de tu sitio web si tienes uno

### 4.3 Información Fiscal (si aplica)

**Tax ID / RFC / NIT / RUC:**
- **México:** RFC (Registro Federal de Contribuyentes)
- **Colombia:** NIT (Número de Identificación Tributaria)
- **Argentina:** CUIT (Código Único de Identificación Tributaria)
- **Chile:** RUT (Rol Único Tributario)
- **Perú:** RUC (Registro Único de Contribuyentes)
- **Brasil:** CNPJ (Cadastro Nacional de Pessoa Jurídica)
- ... (según el país)

**⚠️ IMPORTANTE:** Este campo puede ser obligatorio según el país.

### 4.4 Continuar
- Haz clic en **"Next"**

---

## 📄 Paso 5: Subir Documentos de Soporte

### 5.1 Documentos Requeridos

Los documentos varían según el país, pero típicamente incluyen:

**Documentos Comunes:**
1. **Identificación Fiscal:**
   - RFC, NIT, CUIT, RUT, RUC, CNPJ (según el país)
   - Formato: PDF, JPG, PNG

2. **Acta Constitutiva / Registro Mercantil:**
   - Documento que acredita la constitución legal de la empresa
   - Formato: PDF

3. **Comprobante de Domicilio:**
   - Recibo de servicios (luz, agua, teléfono)
   - Estado de cuenta bancario
   - Formato: PDF, JPG, PNG
   - **Debe tener máximo 3 meses de antigüedad**

4. **Documentos Adicionales (si Twilio los solicita):**
   - Poder notarial
   - Autorización de representante legal
   - Otros documentos según el país

### 5.2 Subir Documentos

1. Haz clic en **"Upload"** o **"Choose File"**
2. Selecciona el archivo desde tu computadora
3. Espera a que se suba (verás un indicador de progreso)
4. Repite para cada documento requerido

**⚠️ IMPORTANTE:**
- Los documentos deben estar en formato legible
- Asegúrate de que sean documentos oficiales y actuales
- Los documentos deben coincidir con la información proporcionada

### 5.3 Continuar
- Haz clic en **"Next"** (después de subir todos los documentos requeridos)

---

## 🏷️ Paso 6: Nombre Amigable (Opcional pero Recomendado)

### 6.1 Nombre del Bundle
- **Campo:** "Friendly Name"
- **Sugerencias:**
  - `Confia Drive - Bundle México`
  - `Confia Drive - Bundle Colombia`
  - `Confia Drive - Bundle Argentina`
  - `Confia Drive ERP - Regulatory Bundle MX`

**💡 TIP:** Usa un nombre descriptivo que te ayude a identificar el Bundle fácilmente.

### 6.2 Continuar
- Haz clic en **"Next"**

---

## 🔔 Paso 7: Configurar Notificaciones (Opcional pero Recomendado)

### 7.1 Email de Notificaciones
- **Campo:** "Email for notifications"
- **Valor:** Tu email donde quieres recibir actualizaciones
- Ejemplo: `admin@confiadrive.io`

### 7.2 Tipo de Notificaciones
- ✅ **"Status updates"** - Recibir actualizaciones del estado del Bundle
- ✅ **"Approval notifications"** - Recibir notificación cuando sea aprobado
- ✅ **"Rejection notifications"** - Recibir notificación si es rechazado

**💡 TIP:** Activa todas las notificaciones para estar al tanto del proceso.

### 7.3 Continuar
- Haz clic en **"Next"**

---

## ✅ Paso 8: Revisar y Enviar

### 8.1 Revisar Información
- Revisa todos los datos ingresados
- Verifica que los documentos estén subidos correctamente
- Asegúrate de que toda la información sea correcta

### 8.2 Enviar para Revisión
- Haz clic en **"Submit for review"**
- ⚠️ **IMPORTANTE:** Una vez enviado, no podrás editarlo hasta que Twilio lo revise

### 8.3 Confirmación
- Verás un mensaje de confirmación
- Twilio te enviará un email de confirmación

---

## ⏳ Paso 9: Esperar Aprobación

### 9.1 Tiempo de Procesamiento
- **Tiempo estimado:** 24-72 horas
- Puede variar según el país y la complejidad

### 9.2 Estados del Bundle
- **"Pending"** - En revisión
- **"Approved"** - ✅ Aprobado (listo para usar)
- **"Twilio-Approved"** - ✅ Aprobado por Twilio (listo para usar)
- **"Rejected"** - ❌ Rechazado (requiere correcciones)

### 9.3 Notificaciones
- Recibirás un email cuando el estado cambie
- También puedes verificar en Twilio Console

---

## 📋 Paso 10: Copiar Bundle SID

### 10.1 Acceder al Bundle Aprobado
1. Ve a: **Develop** → **Phone Numbers** → **Regulatory Compliance** → **Bundles**
2. Busca tu Bundle en la lista
3. Haz clic en el Bundle para ver detalles

### 10.2 Copiar Bundle SID
- **Campo:** "Bundle SID"
- **Formato:** `BUxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Ejemplo:** `BU1234567890abcdef1234567890abcdef`
- Copia este valor completo

### 10.3 Agregar a Variables de Entorno

**Para un país específico:**
```bash
# México
TWILIO_REGULATORY_BUNDLE_MX=BUxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Colombia
TWILIO_REGULATORY_BUNDLE_CO=BUyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy

# Argentina
TWILIO_REGULATORY_BUNDLE_AR=BUzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
```

**O Bundle genérico (si solo operas en un país):**
```bash
TWILIO_REGULATORY_BUNDLE_SID=BUxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 10.4 Configurar en Vercel/Producción
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega la variable correspondiente
4. Guarda y redepleya

---

## ✅ Checklist Final

- [ ] Bundle creado en Twilio Console
- [ ] País seleccionado correctamente
- [ ] Tipo "Local" seleccionado
- [ ] Información del negocio completa
- [ ] Documentos subidos correctamente
- [ ] Bundle enviado para revisión
- [ ] Bundle aprobado (estado: "Approved" o "Twilio-Approved")
- [ ] Bundle SID copiado
- [ ] Variable de entorno configurada
- [ ] Sistema probado con activación de SMS

---

## 🚨 Problemas Comunes y Soluciones

### ❓ ¿Se pierden los datos si cierro el navegador?
**Respuesta:** 
- ✅ **NO se pierden** si ya has avanzado al menos un paso
- ✅ Los datos se guardan automáticamente en la sesión de Twilio
- ✅ Puedes volver más tarde y continuar desde donde quedaste
- ⚠️ **PERO:** Si cierras antes de completar el Paso 1 (país y tipo), deberás empezar de nuevo
- 💡 **Recomendación:** Completa al menos el Paso 2 antes de cerrar para asegurar que se guarde

### ❓ ¿Puedo volver atrás sin perder información?
**Respuesta:**
- ✅ **SÍ**, puedes usar las flechas de navegación en cada paso
- ✅ Todos los datos ingresados se conservan
- ✅ Los documentos subidos también se conservan
- ✅ Puedes editar cualquier paso antes de hacer "Submit for review"

### ❓ ¿Si subo mi número de teléfono (ej: 449 169 86 35), se pierde o deja de ser mío?
**Respuesta:**
- ✅ **NO se pierde ni deja de pertenecerte**
- ✅ El número que ingresas es **SOLO para contacto** con Twilio
- ✅ Es el número donde Twilio puede llamarte o enviarte SMS si necesita información
- ✅ **NO es el número que usarás para enviar SMS a tus clientes**
- ✅ El número para SMS se compra **DESPUÉS** de que el Bundle sea aprobado
- ✅ Tu número personal/empresarial sigue funcionando normalmente
- ✅ Puedes usar tu número actual sin ningún problema
- 💡 **Ejemplo:** Si ingresas "449 169 86 35", ese número sigue siendo tuyo y funcionando. Solo lo usan para contactarte si necesitan algo del Bundle.

### Problema: "Next" button está deshabilitado
**Solución:** Asegúrate de haber completado todos los campos requeridos del paso actual.

### Problema: Documentos rechazados
**Solución:** 
- Verifica que los documentos sean legibles
- Asegúrate de que sean documentos oficiales
- Revisa que la información coincida con lo ingresado
- Vuelve a subir los documentos corregidos

### Problema: Bundle rechazado
**Solución:**
- Revisa el email de Twilio con los detalles del rechazo
- Corrige la información según las indicaciones
- Crea un nuevo Bundle con la información corregida

### Problema: Bundle en "Pending" por mucho tiempo
**Solución:**
- El tiempo de aprobación puede variar (24-72 horas es normal)
- Si pasa más de 72 horas, contacta a soporte de Twilio
- Verifica que todos los documentos estén correctos

---

## 📞 Soporte

Si tienes problemas:
- **Twilio Support:** https://support.twilio.com/
- **Twilio Console:** https://console.twilio.com/
- **Documentación:** https://www.twilio.com/docs/phone-numbers/regulatory-compliance/bundles

---

## 🔗 Enlaces Útiles

- [Crear Bundle](https://console.twilio.com/us1/develop/phone-numbers/regulatory-compliance/bundles/create)
- [Lista de Bundles](https://console.twilio.com/us1/develop/phone-numbers/regulatory-compliance/bundles)
- [Requisitos por País](https://www.twilio.com/docs/phone-numbers/regulatory-compliance/requirements-by-country)
- [Documentación de Bundles](https://www.twilio.com/docs/phone-numbers/regulatory-compliance/bundles)



