# 🔧 Configurar Variables de Entorno en Vercel

## Variables Mínimas Requeridas

Para que el deploy funcione, necesitas configurar estas variables en Vercel:

### 1. Variables Obligatorias de Supabase

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role-aqui
```

### 2. Cómo Obtenerlas

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Click en **Settings** (⚙️) → **API**
3. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ (SECRETO)

### 3. Configurar en Vercel

#### Opción A: Dashboard de Vercel (Recomendado)

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto: `erp-taller-saas`
3. Ve a **Settings** → **Environment Variables**
4. Agrega cada variable:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://tu-proyecto.supabase.co`
   - Environment: ✅ Production, ✅ Preview, ✅ Development
   - Click **Save**
5. Repite para `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`
6. ⚠️ Marca `SUPABASE_SERVICE_ROLE_KEY` como **Sensitive**

#### Opción B: Vercel CLI

```bash
# Configurar variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Verificar que se agregaron
vercel env ls
```

### 4. Redeploy

Después de agregar las variables:

```bash
vercel --prod --yes
```

O desde el dashboard: **Deployments** → **Redeploy**

---

## ✅ Verificación

Para verificar que las variables están configuradas:

```bash
vercel env ls
```

Deberías ver las 3 variables listadas para Production.
