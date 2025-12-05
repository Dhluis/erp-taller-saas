# 🔧 Solución: Error 404 en `/auth/callback` - Link de Supabase

**Problema:** Cuando se crea una nueva sesión o cuenta, el link de Supabase que llega al correo muestra un error 404.

**URL del error:** `erp-taller-git-2f293e-exclusicoparaclientes-gmailcoms-projects.vercel.app/*/auth/callback?token_hash=...`

---

## 🎯 CAUSA DEL PROBLEMA

El problema está en la **configuración de Supabase**, no en el código. Supabase está generando links con `/*/auth/callback` en lugar de `/auth/callback`.

Esto ocurre porque:
1. La URL de redirección en Supabase tiene un wildcard `/*` configurado
2. O la URL base del sitio está mal configurada en Supabase

---

## ✅ SOLUCIÓN

### Paso 1: Configurar URL de Redirección en Supabase Dashboard

1. Ve a tu proyecto en **Supabase Dashboard**
2. Navega a **Authentication** → **URL Configuration**
3. En **Site URL**, configura:
   ```
   https://tu-dominio-vercel.vercel.app
   ```
   O si es producción:
   ```
   https://tu-dominio-real.com
   ```

4. En **Redirect URLs**, agrega:
   ```
   https://tu-dominio-vercel.vercel.app/auth/callback
   https://tu-dominio-real.com/auth/callback
   http://localhost:3000/auth/callback
   ```

5. **Guarda los cambios**

---

### Paso 2: Verificar Variables de Entorno en Vercel

En tu proyecto de Vercel, verifica que tienes configuradas:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

---

### Paso 3: Actualizar Código para Usar URL Correcta

Si el problema persiste, necesitamos asegurar que el código use la URL correcta al registrar usuarios.

---

## 🔍 VERIFICACIÓN

Después de configurar:

1. **Crea una cuenta nueva** en el ERP
2. **Revisa el email** que llega de Supabase
3. **Verifica que el link** sea:
   ```
   https://tu-dominio.vercel.app/auth/callback?token_hash=...
   ```
   Y NO:
   ```
   https://tu-dominio.vercel.app/*/auth/callback?token_hash=...
   ```

---

## 📋 CONFIGURACIÓN RECOMENDADA EN SUPABASE

### Site URL:
```
https://tu-dominio.vercel.app
```

### Redirect URLs (agregar todas):
```
https://tu-dominio.vercel.app/auth/callback
https://tu-dominio.vercel.app/**
http://localhost:3000/auth/callback
http://localhost:3000/**
```

**Nota:** El `/**` permite cualquier ruta después del dominio, pero la URL base debe ser correcta.

---

## ⚠️ IMPORTANTE

- **NO uses wildcards en Site URL** (ej: `/*`)
- **Site URL debe ser la URL base** de tu aplicación
- **Redirect URLs puede tener wildcards** para desarrollo

---

**Configura esto en Supabase Dashboard y el problema se resolverá.**
