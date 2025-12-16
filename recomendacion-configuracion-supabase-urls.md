# ✅ Recomendación: Configuración de Redirect URLs en Supabase

## 📋 Configuración Actual (detectada)

**Site URL:**
```
https://erp-taller-saas-5dqka3oow.vercel.app
```

**Redirect URLs:**
```
https://erp-taller-saas-5dqka3oow.vercel.app/**
https://erp-taller-saas-5dqka3oow.vercel.app/auth/callback
http://localhost:3000/**
http://localhost:3000/auth/callback
```

---

## ⚠️ Problema Identificado

Los wildcards `/**` pueden causar que Supabase genere URLs incorrectas con patrones como:
- `/*/auth/callback` (incorrecto)
- `/**/auth/callback` (incorrecto)

En lugar de:
- `https://erp-taller-saas-5dqka3oow.vercel.app/auth/callback` (correcto)

---

## ✅ Configuración Recomendada

### **Site URL:**
```
https://erp-taller-saas-5dqka3oow.vercel.app
```

### **Redirect URLs (una por línea):**
```
https://erp-taller-saas-5dqka3oow.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

**⚠️ Eliminar estas líneas:**
- ❌ `https://erp-taller-saas-5dqka3oow.vercel.app/**`
- ❌ `http://localhost:3000/**`

---

## 🔧 Pasos para Corregir

1. Ve a: https://supabase.com/dashboard/project/igshgleciwknpupbmvhn/auth/url-configuration

2. En la sección **"Redirect URLs"**:
   - Elimina las líneas con `/**`
   - Deja solo las URLs específicas:
     - `https://erp-taller-saas-5dqka3oow.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback`

3. Guarda los cambios

4. Prueba crear una cuenta nueva y verificar el link del email

---

## ✅ Verificación

Después de hacer los cambios:

1. **Crear cuenta nueva** desde `/auth/register`
2. **Revisar email** recibido
3. **Copiar link completo** del email
4. **Verificar formato:**
   - ✅ Correcto: `https://erp-taller-saas-5dqka3oow.vercel.app/auth/callback?token_hash=...`
   - ❌ Incorrecto: `https://erp-taller-saas-5dqka3oow.vercel.app/*/auth/callback?token_hash=...`
   - ❌ Incorrecto: `https://erp-taller-saas-5dqka3oow.vercel.app/**/auth/callback?token_hash=...`

---

## 📝 Nota

Tu variable `NEXT_PUBLIC_APP_URL` en Vercel está correctamente configurada:
```
NEXT_PUBLIC_APP_URL=https://erp-taller-saas-5dqka3oow.vercel.app
```

El problema está únicamente en los wildcards de Supabase Dashboard.

