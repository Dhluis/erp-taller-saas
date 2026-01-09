# 🔧 Fix: Actualizar URL de Callback OAuth después de eliminar proyecto

## 📋 Problema

Después de eliminar el proyecto `erp-taller-saas` en Vercel, el callback de OAuth sigue apuntando a la URL antigua (`erp-taller-saas.vercel.app`), causando un error 404.

## ✅ Solución

### 1. Actualizar Variable de Entorno en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona el proyecto: **`erp-taller-saas-correct`**
3. Ve a **Settings** → **Environment Variables**
4. Busca `NEXT_PUBLIC_APP_URL`
5. Actualiza el valor a: `https://erp-taller-saas-correct.vercel.app`
6. Asegúrate de que esté configurada para **Production**, **Preview** y **Development**
7. Haz clic en **Save**
8. **IMPORTANTE:** Haz un **Redeploy** del proyecto para que los cambios surtan efecto

### 2. Actualizar Configuración de OAuth en Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Providers**
4. Haz clic en **Google**
5. Verifica que el toggle esté **activado**
6. En la sección de configuración, verifica que no haya URLs hardcodeadas
7. **No necesitas cambiar nada aquí** - Supabase usa automáticamente la URL de tu aplicación desde las variables de entorno

### 3. Actualizar Google Cloud Console (Si es necesario)

Si configuraste URLs específicas en Google Cloud Console:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs y servicios** → **Credenciales**
4. Haz clic en tu **OAuth 2.0 Client ID**
5. En **"Orígenes de JavaScript autorizados"**, actualiza:
   - ✅ `https://erp-taller-saas-correct.vercel.app`
   - ❌ Elimina `https://erp-taller-saas.vercel.app` (si existe)
6. En **"URI de redirección autorizados"**, verifica que solo esté:
   - `https://igshgleciwknpupbmvhn.supabase.co/auth/v1/callback`
7. Haz clic en **"GUARDAR"**

### 4. Verificar Configuración

Después de hacer los cambios:

1. **Redeploy en Vercel:**
   ```bash
   # Desde la terminal
   vercel --prod
   ```

2. **Probar el flujo:**
   - Ve a `https://erp-taller-saas-correct.vercel.app/auth/login`
   - Haz clic en "Continuar con Google"
   - Deberías ser redirigido correctamente sin error 404

## 🔍 Verificación de Variables de Entorno

Para verificar que la variable está configurada correctamente:

```bash
# Desde Vercel CLI
vercel env ls

# O desde el dashboard de Vercel
# Settings → Environment Variables
```

## ⚠️ Notas Importantes

- **El código usa `window.location.origin`** - Esto significa que la URL se detecta automáticamente
- **El problema está en Supabase/Google Cloud** - Necesitas actualizar las URLs configuradas allí
- **Después de cambiar variables de entorno, SIEMPRE haz redeploy**

## 📝 Checklist

- [ ] Variable `NEXT_PUBLIC_APP_URL` actualizada en Vercel
- [ ] Redeploy realizado en Vercel
- [ ] URLs actualizadas en Google Cloud Console (si aplica)
- [ ] Flujo de OAuth probado exitosamente

