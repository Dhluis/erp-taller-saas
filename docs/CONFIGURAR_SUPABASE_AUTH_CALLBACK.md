# 🔧 Configurar Supabase Auth Callback - Solución Definitiva

**Problema:** Error 404 en `/auth/callback` cuando se crea una nueva cuenta o sesión.

---

## 🎯 SOLUCIÓN EN 2 PASOS

### Paso 1: Configurar Supabase Dashboard (CRÍTICO)

1. Ve a tu proyecto en **Supabase Dashboard**
2. Navega a **Authentication** → **URL Configuration**
3. Configura lo siguiente:

#### Site URL:
```
https://tu-dominio-vercel.vercel.app
```
**O si tienes dominio personalizado:**
```
https://tu-dominio-real.com
```

**⚠️ IMPORTANTE:** NO uses wildcards (`/*`) en Site URL. Debe ser la URL base exacta.

#### Redirect URLs:
Agrega estas URLs (una por línea):
```
https://tu-dominio-vercel.vercel.app/auth/callback
https://tu-dominio-vercel.vercel.app/**
http://localhost:3000/auth/callback
http://localhost:3000/**
```

**Nota:** El `/**` permite cualquier ruta después del dominio para desarrollo.

4. **Guarda los cambios**

---

### Paso 2: Verificar Variables de Entorno en Vercel

En tu proyecto de Vercel:

1. Ve a **Settings** → **Environment Variables**
2. Verifica que tienes:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   NEXT_PUBLIC_APP_URL=https://tu-dominio-vercel.vercel.app
   ```

3. Si no existe `NEXT_PUBLIC_APP_URL`, créala con la URL de tu aplicación en Vercel

---

## ✅ VERIFICACIÓN

Después de configurar:

1. **Crea una cuenta nueva** en el ERP
2. **Revisa el email** de Supabase
3. **Verifica que el link** sea:
   ```
   https://tu-dominio.vercel.app/auth/callback?token_hash=...
   ```
   Y NO:
   ```
   https://tu-dominio.vercel.app/*/auth/callback?token_hash=...
   ```

4. **Haz clic en el link** - Debe redirigir correctamente al dashboard

---

## 🔍 TROUBLESHOOTING

### Si el link sigue teniendo `/*`:

1. **Verifica Site URL en Supabase:**
   - Debe ser exactamente: `https://tu-dominio.vercel.app`
   - NO debe tener: `/*` o wildcards

2. **Verifica Redirect URLs:**
   - Debe incluir: `https://tu-dominio.vercel.app/auth/callback`
   - Puede incluir: `https://tu-dominio.vercel.app/**` para desarrollo

3. **Limpia cache del navegador** y prueba de nuevo

### Si el link es correcto pero sigue dando 404:

1. **Verifica que el archivo existe:**
   - `src/app/auth/callback/route.ts` debe existir

2. **Verifica el deploy en Vercel:**
   - El archivo debe estar desplegado
   - Revisa los logs de Vercel

3. **Verifica la ruta en Next.js:**
   - La ruta debe ser `/auth/callback` (no `/*/auth/callback`)

---

## 📋 CHECKLIST

- [ ] Site URL configurada en Supabase (sin wildcards)
- [ ] Redirect URLs configuradas en Supabase
- [ ] `NEXT_PUBLIC_APP_URL` configurada en Vercel
- [ ] Código actualizado con `emailRedirectTo`
- [ ] Prueba: Crear cuenta nueva
- [ ] Prueba: Verificar link en email
- [ ] Prueba: Hacer clic en link (debe funcionar)

---

## 🎯 RESULTADO ESPERADO

Después de configurar correctamente:

✅ El link en el email será: `https://tu-dominio.vercel.app/auth/callback?token_hash=...`  
✅ Al hacer clic, redirige correctamente al dashboard  
✅ No aparece error 404  

---

**Configura esto en Supabase Dashboard y el problema se resolverá.**
