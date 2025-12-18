# 🔐 Guía Completa: Configurar Google OAuth

## 📋 Resumen

Esta guía te ayudará a configurar Google OAuth para que los usuarios puedan iniciar sesión con su cuenta de Google en tu aplicación ERP Taller.

**URL de Callback de Supabase:**
```
https://igshgleciwknpupbmvhn.supabase.co/auth/v1/callback
```

---

## 🎯 PASO 1: Configurar Google Cloud Console

### 1.1 Crear o Seleccionar un Proyecto

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Inicia sesión con tu cuenta de Google
3. En la parte superior, haz clic en el selector de proyectos
4. Haz clic en **"NUEVO PROYECTO"** o selecciona uno existente
5. Si creas uno nuevo:
   - Nombre: `ERP Taller SaaS` (o el que prefieras)
   - Haz clic en **"CREAR"**
   - Espera a que se cree el proyecto

### 1.2 Habilitar APIs (Opcional - Se habilita automáticamente)

**⚠️ IMPORTANTE:** NO necesitas habilitar IAM ni ninguna API manualmente. Google Cloud habilitará automáticamente las APIs necesarias cuando crees las credenciales OAuth 2.0.

**Puedes saltarte este paso** y ir directo a **"Configurar Pantalla de Consentimiento OAuth"** (Paso 1.3).

Si quieres habilitarlas manualmente (opcional):
1. En el menú lateral, ve a **"APIs y servicios"** → **"Biblioteca"**
2. Busca **"Google Identity Services API"** o **"Google+ API"**
3. Haz clic en **"HABILITAR"**

**❌ NO necesitas:**
- IAM (Identity and Access Management) - Esto es para gestionar permisos de recursos GCP, no para OAuth
- Ninguna otra API específica - Se habilitan automáticamente

### 1.3 Configurar Pantalla de Consentimiento OAuth

1. Ve a **"APIs y servicios"** → **"Pantalla de consentimiento OAuth"**
2. Selecciona **"Externo"** (o "Interno" si tienes Google Workspace)
3. Haz clic en **"CREAR"**
4. Completa el formulario:
   - **Nombre de la aplicación:** `ERP Taller SaaS`
   - **Correo electrónico de soporte:** Tu email
   - **Logo de la aplicación:** (Opcional) Sube un logo
   - **Dominio autorizado:** `igshgleciwknpupbmvhn.supabase.co`
   - **Correo electrónico del desarrollador:** Tu email
5. Haz clic en **"GUARDAR Y CONTINUAR"**
6. En **"Alcances"**, haz clic en **"AGREGAR O QUITAR ALCANCES"**
   - Selecciona:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - Haz clic en **"ACTUALIZAR"**
7. Haz clic en **"GUARDAR Y CONTINUAR"**
8. En **"Usuarios de prueba"** (si es externo), agrega los emails de prueba
9. Haz clic en **"GUARDAR Y CONTINUAR"**
10. Revisa y haz clic en **"VOLVER AL PANEL"**

### 1.4 Crear Credenciales OAuth 2.0

1. Ve a **"APIs y servicios"** → **"Credenciales"**
2. Haz clic en **"+ CREAR CREDENCIALES"** → **"ID de cliente de OAuth 2.0"**
3. Selecciona **"Aplicación web"** como tipo de aplicación
4. Completa el formulario:
   - **Nombre:** `ERP Taller - Supabase OAuth`
   - **Orígenes de JavaScript autorizados:**
     - `https://igshgleciwknpupbmvhn.supabase.co`
     - `https://erp-taller-saas.vercel.app` (tu dominio de producción)
     - `http://localhost:3000` (para desarrollo local)
   - **URI de redirección autorizados:**
     - `https://igshgleciwknpupbmvhn.supabase.co/auth/v1/callback`
5. Haz clic en **"CREAR"**
6. **⚠️ IMPORTANTE:** Copia y guarda en un lugar seguro:
   - **ID de cliente** (Client ID)
   - **Secreto de cliente** (Client Secret)

---

## 🎨 PERSONALIZAR EL NOMBRE DE LA APLICACIÓN EN GOOGLE OAUTH

### ¿Cómo cambiar "igshgleciwknpupbmvhn.supabase.co" por un nombre más profesional?

Cuando los usuarios ven la pantalla de Google OAuth, ven el dominio de Supabase. Puedes personalizarlo de dos formas:

### Opción 1: Actualizar Pantalla de Consentimiento OAuth (Recomendado - Más Fácil)

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **"APIs y servicios"** → **"Pantalla de consentimiento OAuth"**
4. Haz clic en **"EDITAR APP"**
5. En la sección **"Información de la aplicación"**, actualiza:
   - **Nombre de la aplicación:** Cambia a algo más profesional como:
     - `ERP Taller SaaS`
     - `Sistema de Gestión de Talleres`
     - `Eagles Gear System`
   - **Logo de la aplicación:** (Opcional) Sube un logo de tu aplicación
   - **Dominio autorizado:** Puedes agregar tu dominio personalizado si lo tienes
6. Haz clic en **"GUARDAR Y CONTINUAR"**
7. Revisa y publica los cambios

**Nota:** Esto cambiará el nombre que aparece en la pantalla de consentimiento, pero el dominio seguirá siendo `igshgleciwknpupbmvhn.supabase.co` en la URL.

### Opción 2: Configurar Dominio Personalizado en Supabase (Avanzado)

Si quieres que aparezca tu propio dominio (ej: `auth.mi-taller.com`):

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **"Settings"** → **"Custom Domains"**
4. Configura un dominio personalizado para autenticación
5. Actualiza las credenciales OAuth en Google Cloud Console con el nuevo dominio

**⚠️ Requisitos:**
- Debes tener un dominio propio
- Debes configurar DNS correctamente
- Puede tardar hasta 48 horas en propagarse

**Recomendación:** Usa la Opción 1 si solo quieres cambiar el nombre. Usa la Opción 2 si necesitas un dominio completamente personalizado.

---

## 🎯 PASO 2: Configurar en Supabase Dashboard

### 2.1 Acceder a Configuración de Proveedores

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: `igshgleciwknpupbmvhn`
3. En el menú lateral, ve a **"Authentication"** → **"Providers"**

### 2.2 Habilitar Google Provider

1. Busca **"Google"** en la lista de proveedores
2. Haz clic en el toggle para **habilitar** Google
3. Se abrirá un formulario con campos:
   - **Client ID (for OAuth):** Pega el **Client ID** de Google Cloud Console
   - **Client Secret (for OAuth):** Pega el **Client Secret** de Google Cloud Console
4. Haz clic en **"SAVE"**

### 2.3 Verificar Configuración

1. Asegúrate de que el toggle de Google esté **activado** (verde)
2. Verifica que los campos Client ID y Client Secret estén completos
3. Opcional: Configura el **"Authorized Client IDs"** si necesitas restricciones adicionales

---

## 🎯 PASO 3: Verificar en tu Aplicación

### 3.1 Verificar Variables de Entorno

Asegúrate de que en tu `.env.local` o variables de entorno de Vercel tengas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://igshgleciwknpupbmvhn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### 3.2 Probar el Login con Google

1. Ve a tu aplicación: `https://erp-taller-saas.vercel.app/auth/login`
2. Haz clic en el botón **"Continuar con Google"**
3. Deberías ser redirigido a Google para autenticarte
4. Después de autenticarte, serás redirigido de vuelta a tu aplicación

---

## ✅ Checklist de Verificación

- [ ] Proyecto creado en Google Cloud Console
- [ ] Google+ API habilitada
- [ ] Pantalla de consentimiento OAuth configurada
- [ ] Credenciales OAuth 2.0 creadas
- [ ] URI de redirección agregada: `https://igshgleciwknpupbmvhn.supabase.co/auth/v1/callback`
- [ ] Google Provider habilitado en Supabase
- [ ] Client ID y Client Secret configurados en Supabase
- [ ] Variables de entorno configuradas correctamente
- [ ] Login con Google probado exitosamente

---

## 🐛 Solución de Problemas

### Error: "redirect_uri_mismatch"

**Causa:** La URI de redirección en Google Cloud Console no coincide con la de Supabase.

**Solución:**
1. Verifica que en Google Cloud Console tengas exactamente:
   ```
   https://igshgleciwknpupbmvhn.supabase.co/auth/v1/callback
   ```
2. No debe tener espacios, barras adicionales, ni caracteres especiales
3. Guarda los cambios y espera 1-2 minutos para que se propaguen

### Error: "invalid_client"

**Causa:** El Client ID o Client Secret están incorrectos en Supabase.

**Solución:**
1. Ve a Google Cloud Console → Credenciales
2. Copia nuevamente el Client ID y Client Secret
3. Pégalos en Supabase Dashboard → Authentication → Providers → Google
4. Guarda los cambios

### Error: "access_denied"

**Causa:** El usuario canceló la autenticación o hay un problema con los alcances.

**Solución:**
1. Verifica que en la Pantalla de Consentimiento OAuth tengas los alcances:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
2. Si es un proyecto externo, asegúrate de agregar usuarios de prueba

### El botón de Google no funciona

**Causa:** Puede ser un problema con el código o la configuración.

**Solución:**
1. Abre la consola del navegador (F12)
2. Busca errores en la consola
3. Verifica que `NEXT_PUBLIC_SUPABASE_URL` esté configurado correctamente
4. Verifica que el provider de Google esté habilitado en Supabase

---

## 📚 Recursos Adicionales

- [Documentación de Supabase Auth](https://supabase.com/docs/guides/auth)
- [Documentación de Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Guía de Google Cloud Console](https://console.cloud.google.com/)

---

## 🔒 Seguridad

⚠️ **IMPORTANTE:**
- **NUNCA** compartas tu Client Secret públicamente
- **NUNCA** lo subas a repositorios públicos
- Mantén las credenciales seguras y rotalas periódicamente
- Usa variables de entorno para todas las credenciales

---

**Última actualización:** 2024-12-09
**URL de Callback:** `https://igshgleciwknpupbmvhn.supabase.co/auth/v1/callback`

