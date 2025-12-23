# Instrucciones para Crear Backup ZIP

## Archivos de Documentación Creados

Se han creado los siguientes archivos de documentación:

1. **README.md** - Documentación principal del proyecto
2. **docs/PROJECT_STATUS.md** - Estado actual del proyecto (versión estable)
3. **docs/WHATSAPP_INTEGRATION_STATUS.md** - Estado de la integración WhatsApp

## Crear ZIP Manualmente

### Opción 1: Desde GitHub Desktop
1. Click derecho en la carpeta del proyecto
2. Seleccionar "Compress" o "Send to" > "Compressed (zipped) folder"
3. Nombrar: `erp-taller-saas-backup-2025.zip`

### Opción 2: Desde PowerShell (en el directorio del proyecto)
```powershell
Compress-Archive -Path * -DestinationPath ../erp-taller-saas-backup-2025.zip -Exclude node_modules,.git,.next,dist,build
```

### Opción 3: Desde Explorador de Archivos
1. Seleccionar todos los archivos y carpetas EXCEPTO:
   - `node_modules/`
   - `.git/`
   - `.next/`
   - `dist/`
   - `build/`
   - `.env.local`
2. Click derecho > "Enviar a" > "Carpeta comprimida (en zip)"
3. Nombrar el archivo

## Archivos a Incluir

✅ **Incluir:**
- Todo el código fuente (`src/`)
- Archivos de configuración (`package.json`, `tsconfig.json`, etc.)
- Documentación (`docs/`, `README.md`)
- Migraciones (`supabase/migrations/`)
- Archivos de configuración del proyecto

❌ **Excluir:**
- `node_modules/` (muy grande, se reinstala con `npm install`)
- `.git/` (historial de git)
- `.next/` (build temporal)
- `dist/`, `build/` (builds temporales)
- `.env.local`, `.env` (variables de entorno sensibles)

## Versión Documentada

- **Commit:** `773cb2a` - "confeti"
- **Fecha:** Enero 2025
- **Estado:** Estable con detalles menores manejables

