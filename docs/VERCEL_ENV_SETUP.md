# 🔧 Configuración de Variables de Entorno en Vercel

## 📋 Variables Requeridas para WhatsApp

Para que la integración de WhatsApp funcione correctamente en producción (Vercel), necesitas configurar las siguientes variables de entorno:

### Variables de WAHA

1. **WAHA_API_URL**
   - Valor: `https://waha-erp-eagles-sistem.0rfifc.easypanel.host`
   - Descripción: URL base de la API de WAHA
   - Scope: Production, Preview, Development

2. **WAHA_API_KEY**
   - Valor: `mi_clave_segura_2025`
   - Descripción: Clave de API para autenticación con WAHA
   - Scope: Production, Preview, Development
   - ⚠️ **IMPORTANTE**: Marca esta variable como "Sensitive" en Vercel

3. **NEXT_PUBLIC_APP_URL**
   - Valor: `https://erp-taller-saas-5dqka3oow.vercel.app`
   - Descripción: URL pública de tu aplicación (para webhooks)
   - Scope: Production, Preview, Development

## 🚀 Cómo Configurar en Vercel

### Opción 1: Dashboard de Vercel (Recomendado)

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Agrega cada variable:
   - **Name**: `WAHA_API_URL`
   - **Value**: `https://waha-erp-eagles-sistem.0rfifc.easypanel.host`
   - **Environment**: Selecciona Production, Preview y Development según necesites
5. Repite para `WAHA_API_KEY` y `NEXT_PUBLIC_APP_URL`
6. **Importante**: Marca `WAHA_API_KEY` como "Sensitive"
7. Haz clic en **Save**
8. **Redeploy** tu aplicación para que los cambios surtan efecto

### Opción 2: Vercel CLI

```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Agregar variables
vercel env add WAHA_API_URL
vercel env add WAHA_API_KEY
vercel env add NEXT_PUBLIC_APP_URL

# Para producción específicamente
vercel env add WAHA_API_URL production
vercel env add WAHA_API_KEY production
vercel env add NEXT_PUBLIC_APP_URL production
```

## ✅ Verificación

Después de configurar las variables:

1. Ve a **Settings** → **Environment Variables** en Vercel
2. Verifica que las 3 variables estén listadas
3. Haz un **Redeploy** de tu aplicación
4. Verifica los logs del deployment para confirmar que no hay errores

## 🔍 Troubleshooting

### Error: "WAHA_API_URL no está configurada"

**Causa**: La variable no está configurada en Vercel o el deployment no se ha actualizado.

**Solución**:
1. Verifica que la variable esté en Vercel Dashboard
2. Asegúrate de que el scope incluya el ambiente donde se está ejecutando
3. Haz un redeploy completo (no solo un push)

### Error: "WAHA_API_KEY no está configurada"

**Causa**: Similar al anterior, pero específico para la API key.

**Solución**: 
1. Verifica que `WAHA_API_KEY` esté configurada
2. Asegúrate de que el valor sea correcto (sin espacios extra)
3. Haz redeploy

### Las variables funcionan en local pero no en Vercel

**Causa**: Las variables en `.env.local` solo funcionan en desarrollo local.

**Solución**: 
- **SIEMPRE** configura las variables en Vercel Dashboard para producción
- Las variables de `.env.local` NO se suben a Vercel automáticamente

## 📝 Notas Importantes

- ⚠️ **NUNCA** subas `.env.local` a Git
- ✅ Las variables en Vercel son seguras y encriptadas
- 🔄 Después de agregar variables, siempre haz redeploy
- 🌍 Puedes tener diferentes valores para Production, Preview y Development

## 🔐 Seguridad

- `WAHA_API_KEY` debe marcarse como "Sensitive" en Vercel
- No compartas estas variables públicamente
- Rota las claves periódicamente si es necesario

