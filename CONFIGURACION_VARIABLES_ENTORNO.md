# 🔐 GUÍA COMPLETA DE CONFIGURACIÓN DE VARIABLES DE ENTORNO

## 📋 **RESUMEN**

Esta guía te muestra exactamente cómo configurar todas las variables de entorno necesarias para que tu ERP funcione correctamente.

---

## 🎯 **PASO 1: CREAR ARCHIVO .env.local**

### **Ubicación del archivo:**
```
erp-taller-saas/
├── .env.local          ← CREAR ESTE ARCHIVO
├── env.local.example   ← Ya existe (referencia)
└── env.production.example ← Ya existe (referencia)
```

### **Contenido del archivo .env.local:**
Copia el contenido de `env.local.example` y reemplaza los valores de ejemplo con los reales.

---

## 🔍 **PASO 2: OBTENER VALORES DE SUPABASE**

### **2.1 Acceder al Dashboard de Supabase**
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto (o crea uno nuevo)

### **2.2 Obtener la URL del Proyecto**
1. Ve a **Settings** → **API**
2. Copia la **Project URL**
3. Reemplaza en `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-real.supabase.co
   ```

### **2.3 Obtener la Clave Anónima**
1. En la misma página **Settings** → **API**
2. Copia la **anon public** key
3. Reemplaza en `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### **2.4 Obtener la Clave de Servicio**
1. En **Settings** → **API**
2. Copia la **service_role** key (⚠️ MANTÉNLA SECRETA)
3. Reemplaza en `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### **2.5 Obtener URL de Base de Datos (Opcional)**
1. Ve a **Settings** → **Database**
2. Copia la **Connection string**
3. Reemplaza en `.env.local`:
   ```env
   DATABASE_URL=postgresql://postgres:password@db.tu-proyecto.supabase.co:5432/postgres
   ```

---

## 🔐 **PASO 3: GENERAR CLAVES DE SEGURIDAD**

### **3.1 Generar JWT_SECRET**
```bash
# En terminal (Windows PowerShell)
openssl rand -base64 32

# O usar Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### **3.2 Generar ENCRYPTION_KEY**
```bash
# Generar otra clave diferente
openssl rand -base64 32
```

### **3.3 Reemplazar en .env.local**
```env
JWT_SECRET=tu-jwt-secret-generado-aqui
ENCRYPTION_KEY=tu-encryption-key-generado-aqui
```

---

## ✅ **PASO 4: VERIFICAR CONFIGURACIÓN**

### **4.1 Crear Script de Verificación**
Crea el archivo `scripts/verify-env.js`:

```javascript
// scripts/verify-env.js
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY'
]

console.log('🔍 Verificando variables de entorno...\n')

let allPresent = true

requiredVars.forEach(varName => {
  const value = process.env[varName]
  if (!value) {
    console.log(`❌ ${varName}: NO CONFIGURADA`)
    allPresent = false
  } else if (value.includes('tu-') || value.includes('ejemplo')) {
    console.log(`⚠️  ${varName}: VALOR DE EJEMPLO (cambiar por valor real)`)
    allPresent = false
  } else {
    console.log(`✅ ${varName}: CONFIGURADA`)
  }
})

if (allPresent) {
  console.log('\n🎉 ¡Todas las variables están configuradas correctamente!')
} else {
  console.log('\n⚠️  Algunas variables necesitan configuración.')
  process.exit(1)
}
```

### **4.2 Ejecutar Verificación**
```bash
# Instalar dependencias si no están instaladas
npm install

# Ejecutar verificación
node scripts/verify-env.js
```

### **4.3 Verificar Conexión a Supabase**
```bash
# Ejecutar test de conexión
npm run diagnose
```

---

## 🚀 **PASO 5: CONFIGURACIÓN POR ENTORNO**

### **5.1 Desarrollo (.env.local)**
```env
# Configuración para desarrollo local
NODE_ENV=development
LOG_LEVEL=debug
DEBUG_QUERIES=true
ENABLE_DETAILED_LOGGING=true
DEBUG_MODE=true
```

### **5.2 Producción (.env.production)**
```env
# Configuración para producción
NODE_ENV=production
LOG_LEVEL=info
DEBUG_QUERIES=false
ENABLE_DETAILED_LOGGING=false
DEBUG_MODE=false
```

---

## 🔧 **PASO 6: VARIABLES ADICIONALES**

### **6.1 Variables Opcionales (Futuro)**
```env
# Email (cuando implementes notificaciones)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-password-de-aplicacion

# Analytics (cuando implementes tracking)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Webhooks (cuando implementes notificaciones)
WEBHOOK_URL=https://hooks.slack.com/services/tu-webhook
```

### **6.2 Variables de Deployment**
```env
# Para Vercel
VERCEL_URL=https://tu-app.vercel.app
NEXT_PUBLIC_VERCEL_URL=https://tu-app.vercel.app

# Para otros proveedores
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

---

## 🛠️ **PASO 7: COMANDOS ÚTILES**

### **7.1 Scripts de package.json**
```json
{
  "scripts": {
    "env:check": "node scripts/verify-env.js",
    "env:test": "node -e \"console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)\"",
    "diagnose": "npm run type-check && npm run test"
  }
}
```

### **7.2 Comandos de Verificación**
```bash
# Verificar variables
npm run env:check

# Test de conexión
npm run diagnose

# Verificar una variable específica
npm run env:test
```

---

## 🚨 **PROBLEMAS COMUNES Y SOLUCIONES**

### **Problema 1: "Invalid API key"**
```bash
# Verificar que la clave sea correcta
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Regenerar clave en Supabase si es necesario
```

### **Problema 2: "Connection refused"**
```bash
# Verificar URL de Supabase
echo $NEXT_PUBLIC_SUPABASE_URL

# Debe ser: https://tu-proyecto.supabase.co
```

### **Problema 3: Variables no se cargan**
```bash
# Reiniciar servidor de desarrollo
npm run dev

# Verificar que .env.local existe
ls -la .env.local
```

### **Problema 4: Variables en producción**
```bash
# En Vercel, agregar en Settings → Environment Variables
# En otros proveedores, configurar en panel de control
```

---

## 📊 **CHECKLIST DE CONFIGURACIÓN**

### **✅ Variables Críticas**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada
- [ ] `JWT_SECRET` generada y configurada
- [ ] `ENCRYPTION_KEY` generada y configurada

### **✅ Variables de Aplicación**
- [ ] `NEXT_PUBLIC_APP_URL` configurada
- [ ] `NODE_ENV` configurada
- [ ] `NEXT_PUBLIC_APP_VERSION` configurada

### **✅ Variables de Seguridad**
- [ ] `NEXT_PUBLIC_AUTH_REDIRECT_URL` configurada
- [ ] `NEXT_PUBLIC_LOGOUT_REDIRECT_URL` configurada

### **✅ Verificación**
- [ ] Script de verificación ejecutado
- [ ] Conexión a Supabase verificada
- [ ] Servidor de desarrollo funcionando
- [ ] No hay errores en consola

---

## 🎯 **PRÓXIMOS PASOS**

1. **Configurar variables** siguiendo esta guía
2. **Ejecutar migraciones SQL** en Supabase
3. **Probar conexión** con `npm run diagnose`
4. **Implementar autenticación** básica
5. **Probar funcionalidades** principales

---

## 📞 **SOPORTE**

Si tienes problemas:

1. **Verificar variables** con `npm run env:check`
2. **Revisar logs** en consola del navegador
3. **Verificar Supabase** en dashboard
4. **Reiniciar servidor** de desarrollo

---

**¡Con esta configuración tu ERP estará listo para funcionar!** 🚀





