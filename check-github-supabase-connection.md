# 🔍 Verificar Conexión GitHub ↔ Supabase

## 📋 Resumen de Emails Encontrados

### GitHub
- **Email para login web**: `hdzalfonsodigital@gmail.com` (según tu comentario)
- **Email en commits Git**: `exclusicoparaclientes@gmail.com` (usuario: `Dhluis`)
- **Repositorio**: `https://github.com/Dhluis/erp-taller-saas.git`

### Supabase
- **Proyecto URL**: `https://igshgleciwknpupbmvhn.supabase.co`

---

## ✅ Pasos para Verificar en Supabase

### 1. Verificar Cuenta de GitHub Vinculada en Supabase

**Opción A: Desde Dashboard de Supabase**
1. Ve a: https://supabase.com/dashboard
2. Inicia sesión (usa el email con el que te registraste en Supabase)
3. Ve a tu proyecto: `igshgleciwknpupbmvhn`
4. Ve a: **Settings** → **Integrations** → **GitHub**
5. O ve a: **Settings** → **Project Settings** → **Linked GitHub Repo**
6. Verás qué cuenta de GitHub está conectada

**Opción B: Verificar desde Account Settings**
1. Dashboard → **Settings** → **Account**
2. Ve a la sección **Connected Accounts**
3. Busca **GitHub** en la lista
4. Verás el email/usuario de GitHub vinculado

---

### 2. Verificar Email en auth.users de Supabase

Ejecuta este SQL en Supabase SQL Editor:

```sql
-- Ver todos los usuarios en auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at,
  app_metadata->>'provider' as auth_provider
FROM auth.users
ORDER BY created_at DESC;
```

Si usaste OAuth de GitHub, verás:
- `auth_provider = 'github'`
- `email` = El email de tu cuenta de GitHub

---

### 3. Comparar Emails

**Si el email en Supabase es `hdzalfonsodigital@gmail.com`:**
✅ **Coincide** - La cuenta de GitHub para login web está vinculada

**Si el email en Supabase es `exclusicoparaclientes@gmail.com`:**
⚠️ **No coincide** - La cuenta vinculada es diferente a la que usas para login

---

## 🔧 Cómo Vincular la Cuenta Correcta

### Si necesitas cambiar la cuenta de GitHub vinculada:

1. **En Supabase Dashboard:**
   - Settings → Integrations → GitHub
   - Si hay una vinculación, desconéctala
   - Conecta de nuevo usando la cuenta de GitHub correcta

2. **Para vincular el repositorio:**
   - Settings → Project Settings → Linked GitHub Repo
   - Conecta: `Dhluis/erp-taller-saas`

---

## 📝 Notas Importantes

- **Git tiene dos configuraciones:**
  - Email para commits locales: `exclusicoparaclientes@gmail.com`
  - Email para login en GitHub web: `hdzalfonsodigital@gmail.com`
  
- **Supabase puede tener:**
  - Email de registro de Supabase (puede ser cualquiera)
  - Cuenta de GitHub vinculada para OAuth (debe ser la que usas para login)

---

## 🎯 Respuesta Directa

**Para saber si coinciden:**
1. Ve a Supabase Dashboard → Settings → Account → Connected Accounts
2. Busca GitHub en la lista
3. Compara el email/usuario mostrado con `hdzalfonsodigital@gmail.com`

**Si coinciden:** ✅ Todo correcto
**Si NO coinciden:** ⚠️ Necesitas vincular la cuenta correcta

