# 📋 Guía: Regulatory Bundles para LATAM

## 🌍 Requisito: Un Bundle por País

**IMPORTANTE:** Twilio requiere un Regulatory Bundle **por cada país** donde quieras operar. No puedes usar un solo Bundle para todos los países LATAM.

## 📝 Países Soportados

El sistema soporta los siguientes países LATAM:

| País | Código | Variable de Entorno |
|------|--------|---------------------|
| México | MX | `TWILIO_REGULATORY_BUNDLE_MX` |
| Colombia | CO | `TWILIO_REGULATORY_BUNDLE_CO` |
| Argentina | AR | `TWILIO_REGULATORY_BUNDLE_AR` |
| Chile | CL | `TWILIO_REGULATORY_BUNDLE_CL` |
| Perú | PE | `TWILIO_REGULATORY_BUNDLE_PE` |
| Brasil | BR | `TWILIO_REGULATORY_BUNDLE_BR` |
| Ecuador | EC | `TWILIO_REGULATORY_BUNDLE_EC` |
| Uruguay | UY | `TWILIO_REGULATORY_BUNDLE_UY` |
| Costa Rica | CR | `TWILIO_REGULATORY_BUNDLE_CR` |

## 🔧 Configuración de Variables de Entorno

### Opción 1: Bundles Específicos por País (Recomendado)

```bash
# México
TWILIO_REGULATORY_BUNDLE_MX=BUxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Colombia
TWILIO_REGULATORY_BUNDLE_CO=BUyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy

# Argentina
TWILIO_REGULATORY_BUNDLE_AR=BUzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz

# ... y así para cada país que necesites
```

### Opción 2: Bundle Genérico (Fallback)

Si solo operas en un país o quieres usar el mismo Bundle para todos:

```bash
# Bundle genérico (se usa si no hay Bundle específico para el país)
TWILIO_REGULATORY_BUNDLE_SID=BUxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Nota:** El sistema primero busca el Bundle específico del país. Si no existe, usa el Bundle genérico.

## 📋 Proceso de Creación de Bundles

### Paso 1: Crear Bundle en Twilio Console

Para cada país donde quieras operar:

1. Ve a: https://console.twilio.com/us1/develop/phone-numbers/regulatory-compliance/bundles/create
2. Selecciona el país (ej: México, Colombia, etc.)
3. Selecciona tipo: **"Local"** (para números locales)
4. Completa todos los pasos del formulario

### Paso 2: Datos Requeridos por País

Cada país puede tener requisitos diferentes. Datos comunes:

#### Información del Negocio:
- **Nombre Legal:** Nombre registrado de tu empresa
- **Dirección Completa:** Calle, número, colonia, ciudad, estado, CP
- **Ciudad:** Ciudad donde opera
- **Estado/Provincia:** Estado o provincia
- **Código Postal**
- **Tipo de Negocio:** "Automotive Repair Shop" o similar
- **Descripción:** Breve descripción del negocio

#### Documentos (varían por país):
- RFC / NIT / RUC (según el país)
- Acta constitutiva
- Comprobante de domicilio
- Documentos adicionales que Twilio solicite

### Paso 3: Nombre Amigable

Sugerencia de nombres:
- `Eagles System - Bundle México`
- `Eagles System - Bundle Colombia`
- `Eagles System - Bundle Argentina`
- etc.

### Paso 4: Esperar Aprobación

- **Tiempo estimado:** 24-72 horas
- **Estado requerido:** `twilio-approved` o `approved`
- **Notificaciones:** Configura email para recibir actualizaciones

### Paso 5: Copiar Bundle SID

Una vez aprobado:
1. Ve a la lista de Bundles en Twilio Console
2. Copia el **Bundle SID** (formato: `BUxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
3. Agrégalo a las variables de entorno según el país

## 🔄 Flujo del Sistema

```
Organización solicita activar SMS
    ↓
Sistema detecta país de la organización (ej: MX)
    ↓
Busca variable: TWILIO_REGULATORY_BUNDLE_MX
    ↓
Si existe → Usa ese Bundle
Si no existe → Usa TWILIO_REGULATORY_BUNDLE_SID (fallback)
    ↓
Verifica estado del Bundle
    ↓
Si está aprobado → Compra número local
Si no está aprobado → Usa número Toll-Free
```

## ✅ Checklist de Configuración

- [ ] Crear Bundle para México (si operas en MX)
- [ ] Crear Bundle para Colombia (si operas en CO)
- [ ] Crear Bundle para Argentina (si operas en AR)
- [ ] ... (repetir para cada país necesario)
- [ ] Esperar aprobación de todos los Bundles
- [ ] Copiar Bundle SIDs a variables de entorno
- [ ] Configurar en Vercel/Servidor de producción
- [ ] Probar activación de SMS para cada país

## 🚨 Notas Importantes

1. **Un Bundle por País:** No puedes reutilizar el Bundle de México para Colombia
2. **Aprobación Requerida:** Los números locales solo funcionan con Bundles aprobados
3. **Toll-Free como Fallback:** Si el Bundle no está aprobado, el sistema usa números Toll-Free
4. **Costo:** Cada Bundle puede tener costos diferentes según el país
5. **Tiempo de Aprobación:** Varía por país (24-72 horas típicamente)

## 📞 Soporte

Si tienes problemas con la configuración:
- Revisa los logs del sistema para ver qué Bundle se está usando
- Verifica el estado del Bundle en Twilio Console
- Asegúrate de que el Bundle esté en estado `twilio-approved` o `approved`

## 🔗 Enlaces Útiles

- [Twilio Regulatory Compliance](https://console.twilio.com/us1/develop/phone-numbers/regulatory-compliance/bundles)
- [Documentación de Twilio Bundles](https://www.twilio.com/docs/phone-numbers/regulatory-compliance/bundles)
- [Requisitos por País](https://www.twilio.com/docs/phone-numbers/regulatory-compliance/requirements-by-country)
