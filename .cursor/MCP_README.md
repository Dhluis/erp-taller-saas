# Configuración MCP (Model Context Protocol)

Este proyecto tiene tres servidores MCP configurados en `.cursor/mcp.json`.

## 1. Supabase — Acceso a la base de datos

- **Estado**: Solo hace falta que Cursor esté conectado.
- **Primera vez**: Al usar herramientas Supabase, Cursor abrirá el navegador para que inicies sesión en Supabase y autorices el acceso.
- **Opcional**: Para limitar a un proyecto o solo lectura, edita la URL en `mcp.json`:
  - Un solo proyecto: `"url": "https://mcp.supabase.com/mcp?project_ref=TU_PROJECT_REF"`
  - Solo lectura: `"url": "https://mcp.supabase.com/mcp?read_only=true"`

## 2. GitHub — Repos, PRs, issues

- **Requisitos**: Docker instalado y en ejecución, o usar la opción remota (sin Docker).
- **Token**: Crea un [Personal Access Token (PAT)](https://github.com/settings/tokens) con permisos `repo`, `read:org` (y los que necesites).
- **Config actual**: Usa Docker. En `.cursor/mcp.json` sustituye `<TU_GITHUB_PAT>` por tu token.

**Si no usas Docker** (servidor remoto de GitHub), sustituye el bloque `"github"` por:

```json
"github": {
  "url": "https://api.githubcopilot.com/mcp/",
  "headers": {
    "Authorization": "Bearer TU_GITHUB_PAT"
  }
}
```

(Necesitas Cursor 0.48+.)

## 3. Filesystem — Manejo de archivos

- **Estado**: Listo; el directorio permitido es la raíz del proyecto (`C:/Users/exclu/erp-taller-saas`).
- **Cambiar carpeta**: Edita la última entrada del array `args` en `mcp.json` y pon la ruta que quieras (usa `/` o `\\`).

## Después de editar

1. Guarda `.cursor/mcp.json`.
2. Reinicia Cursor (o recarga la ventana) para que cargue los MCP.
3. En **Settings → Tools & MCP** deberías ver los servidores; si no, usa el botón de refresco.

## Notas de seguridad

- No subas a Git un `mcp.json` con tokens reales. Usa `.env` o la config global de Cursor (`~/.cursor/mcp.json`) para el PAT de GitHub si prefieres no dejarlo en el repo.
- Si añades `mcp.json` al repo, deja placeholders (`<TU_GITHUB_PAT>`) y documenta los pasos en este README.
