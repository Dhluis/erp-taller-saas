# 🔐 Configuración de Supabase CLI con Access Token

## 📋 Pasos para obtener y configurar el Access Token

### Opción 1: Login interactivo (Recomendado para primera vez)

1. **Abre PowerShell o Terminal** en el directorio del proyecto:
   ```powershell
   cd C:\Users\exclu\erp-taller-saas
   ```

2. **Ejecuta el comando de login**:
   ```powershell
   supabase login
   ```

3. **Se abrirá tu navegador** automáticamente:
   - Te pedirá autorizar la aplicación Supabase CLI
   - Haz clic en "Authorize" o "Permitir"
   - El token se guardará automáticamente en tu sistema

4. **Verifica que funcionó**:
   ```powershell
   supabase projects list
   ```
   Deberías ver la lista de tus proyectos.

---

### Opción 2: Token manual desde Dashboard

1. **Ve al Dashboard de Supabase**:
   - https://supabase.com/dashboard/account/tokens

2. **Crea un nuevo Access Token**:
   - Haz clic en "Generate new token"
   - Dale un nombre descriptivo (ej: "CLI Development")
   - Copia el token (solo se muestra una vez)

3. **Configura el token en tu sistema**:

   **Windows PowerShell:**
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN = "tu-token-aqui"
   ```

   **Windows CMD:**
   ```cmd
   set SUPABASE_ACCESS_TOKEN=tu-token-aqui
   ```

   **Para hacerlo permanente** (recomendado):
   - Abre "Variables de entorno" en Windows
   - Agrega una nueva variable de sistema:
     - Nombre: `SUPABASE_ACCESS_TOKEN`
     - Valor: `tu-token-aqui`

---

### Opción 3: Usar archivo de configuración

1. **Crea un archivo `.env.local`** en la raíz del proyecto (si no existe):
   ```env
   SUPABASE_ACCESS_TOKEN=tu-token-aqui
   ```

2. **O agrega a tu `.env.local` existente**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://igshgleciwknpupbmvhn.supabase.co
   SUPABASE_ACCESS_TOKEN=tu-token-aqui
   ```

---

## 🔗 Vincular proyecto

Una vez autenticado, vincula tu proyecto:

```powershell
supabase link --project-ref igshgleciwknpupbmvhn
```

Esto creará un archivo `supabase/.temp/project-ref` con la referencia del proyecto.

---

## ✅ Verificar configuración

Ejecuta estos comandos para verificar que todo está bien:

```powershell
# Verificar autenticación
supabase projects list

# Verificar proyecto vinculado
supabase status

# Ver migraciones pendientes
supabase migration list
```

---

## 🚀 Comandos útiles después de configurar

### Aplicar migraciones:
```powershell
supabase db push
```

### Ejecutar SQL directamente:
```powershell
supabase db execute "SELECT * FROM plan_limits WHERE plan_tier = 'free';" --project-ref igshgleciwknpupbmvhn
```

### Ver logs:
```powershell
supabase logs --project-ref igshgleciwknpupbmvhn
```

---

## 🔒 Seguridad

⚠️ **IMPORTANTE:**
- **NUNCA** subas el token a Git
- Agrega `SUPABASE_ACCESS_TOKEN` a tu `.gitignore`
- Si el token se compromete, revócalo inmediatamente en:
  https://supabase.com/dashboard/account/tokens

---

## 📝 Notas

- El token tiene permisos completos en tu proyecto
- Los tokens no expiran automáticamente
- Puedes crear múltiples tokens para diferentes propósitos
- Revoca tokens que ya no uses

---

## 🆘 Troubleshooting

### Error: "Access token not provided"
- Verifica que `SUPABASE_ACCESS_TOKEN` esté configurado
- En PowerShell: `$env:SUPABASE_ACCESS_TOKEN`
- Reinicia la terminal después de configurar variables de entorno

### Error: "Cannot use automatic login flow"
- Usa la Opción 2 (token manual) en lugar de login interactivo
- O ejecuta `supabase login` en una terminal interactiva (no desde scripts)

### Error: "Project not found"
- Verifica el `project-ref` correcto
- Ejecuta `supabase projects list` para ver tus proyectos
