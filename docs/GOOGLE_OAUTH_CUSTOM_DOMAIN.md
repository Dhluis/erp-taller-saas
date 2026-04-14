# Login con Google: mostrar confiadrive.io en lugar de supabase.co

Cuando el usuario hace clic en "Continuar con Google", en la pantalla **"Elige una cuenta"** Google muestra **"Ir a igshgleciwknpupbmvhn.supabase.co"** porque esa es la URL de callback (redirect) del OAuth. Para que aparezca **confiadrive.io** (o un subdominio tuyo) hay que usar un **dominio personalizado** en Supabase.

---

## Opción recomendada: Custom domain de Supabase

Con un **custom domain** de Supabase (por ejemplo `api.confiadrive.io`), el callback de OAuth pasa a ser `https://api.confiadrive.io/auth/v1/callback` y Google mostrará **"Ir a api.confiadrive.io"** en lugar del proyecto `.supabase.co`.

**Requisito:** add-on de Custom Domain en Supabase (plan de pago).

---

## Pasos

### 1. Activar Custom Domain en Supabase

1. Entra al [Dashboard de Supabase](https://supabase.com/dashboard) y abre tu proyecto.
2. Ve a **Project Settings** (engranaje) → **Add-ons** (o **General** → **Custom Domains** según tu versión).
3. Activa **Custom Domain** y elige un subdominio, por ejemplo:
   - `api.confiadrive.io` (recomendado)
   - O `auth.confiadrive.io` si prefieres dejar `api` para otra cosa.
4. Anota la **URL de callback de Auth** que te indique Supabase para tu dominio, será algo como:
   - `https://api.confiadrive.io/auth/v1/callback`

---

### 2. Configurar DNS (en tu proveedor de dominio)

En el panel de DNS de **confiadrive.io** (Cloudflare, Namecheap, etc.):

1. **CNAME** (obligatorio):
   - Nombre/host: `api` (para api.confiadrive.io).
   - Valor/apunta a: `igshgleciwknpupbmvhn.supabase.co` (el dominio actual de tu proyecto).
   - TTL bajo (ej. 300) al principio para probar.

2. **TXT para verificación** (Supabase te lo da al registrar el dominio):
   - En Supabase, al añadir el custom domain te mostrará un registro TXT tipo:
     - Nombre: `_acme-challenge.api` (o el que indique Supabase).
     - Valor: el token que te den.
   - Crea ese TXT en tu DNS. Algunos paneles añaden el dominio automáticamente al nombre; si creas "api" y te queda "api.confiadrive.io" está bien; si te crea "api.confiadrive.io.confiadrive.io", corrige para que solo sea el subdominio.

3. Espera propagación (minutos a horas). Luego en Supabase usa **Verify** / **Reverify** hasta que el dominio quede verificado y activo.

---

### 3. Añadir la nueva URL de callback en Google Cloud

1. Entra a [Google Cloud Console](https://console.cloud.google.com/) → tu proyecto.
2. **APIs & Services** → **Credentials**.
3. Abre el **OAuth 2.0 Client ID** que usas para “Web application” con Supabase.
4. En **Authorized redirect URIs**:
   - **No quites** la actual: `https://igshgleciwknpupbmvhn.supabase.co/auth/v1/callback`
   - **Añade** la del custom domain: `https://api.confiadrive.io/auth/v1/callback` (o la que te haya dado Supabase).
5. En **Authorized JavaScript origins** añade también:
   - `https://api.confiadrive.io`
   - Y si tu app está en `https://confiadrive.io`, mantén `https://confiadrive.io`.
6. Guarda los cambios.

---

### 4. Activar el custom domain en Supabase

Cuando la verificación DNS esté correcta:

1. En Supabase, en la sección del custom domain, activa el dominio (botón **Activate** o equivalente).
2. Tras activar, Supabase usará ese dominio para Auth; el flujo OAuth usará `https://api.confiadrive.io/auth/v1/callback` y Google mostrará **"Ir a api.confiadrive.io"**.

---

### 5. Usar el custom domain en tu app (recomendado)

Para que todo el tráfico a Supabase (Auth, API) pase por tu dominio:

1. **Variables de entorno** (Vercel, `.env.local`, etc.):
   - Antes: `NEXT_PUBLIC_SUPABASE_URL=https://igshgleciwknpupbmvhn.supabase.co`
   - Después: `NEXT_PUBLIC_SUPABASE_URL=https://api.confiadrive.io`
   - (Y si usas `SUPABASE_URL` en servidor, cámbialo también.)
2. Vuelve a desplegar o reiniciar el servidor de desarrollo.

Así, en "Elige una cuenta" el usuario verá **"Ir a api.confiadrive.io"** (dominio tuyo) en lugar de `igshgleciwknpupbmvhn.supabase.co`.

---

## Resumen rápido

| Dónde | Qué hacer |
|-------|-----------|
| **Supabase** | Add-on Custom Domain → subdominio `api.confiadrive.io` → verificar DNS (CNAME + TXT) → Activate. |
| **DNS** | CNAME `api` → `igshgleciwknpupbmvhn.supabase.co`; TXT `_acme-challenge.api` con el valor que dé Supabase. |
| **Google Cloud** | En el OAuth client, añadir redirect URI `https://api.confiadrive.io/auth/v1/callback` (mantener la de supabase.co). |
| **App** | `NEXT_PUBLIC_SUPABASE_URL=https://api.confiadrive.io` (y `SUPABASE_URL` si aplica). |

---

## Si no puedes usar Custom Domain (Supabase gratis)

- **No** puedes cambiar el texto "Ir a X" que muestra Google: ese X es siempre el dominio del **redirect_uri**. Con Supabase estándar ese dominio es `*.supabase.co`.
- Sí puedes mejorar la confianza:
  1. **Google Cloud** → **APIs & Services** → **OAuth consent screen**:
     - Nombre de la aplicación: por ejemplo "Confia Drive" o "confiadrive.io".
     - Logo, dominio de la app (confiadrive.io), etc.
  - Así la pantalla mostrará tu marca, pero la línea "Ir a igshgleciwknpupbmvhn.supabase.co" seguirá igual hasta que uses custom domain en Supabase.

---

## Referencias

- [Supabase – Custom Domains](https://supabase.com/docs/guides/platform/custom-domains)
- [Supabase – Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase – Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)


