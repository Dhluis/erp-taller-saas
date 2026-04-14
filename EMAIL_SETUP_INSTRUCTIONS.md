# 📧 CONFIGURACIÓN DE EMAIL - VARIABLES DE ENTORNO

## 🔧 Variables Requeridas

Agregar las siguientes variables a tu archivo `.env.local`:

```env
# Email Configuration (Hostinger SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=servicio@Confia Drivesystem.io
SMTP_PASS=Confia Drive26@%
SMTP_FROM_NAME=Confia Drive
SMTP_FROM_EMAIL=servicio@Confia Drivesystem.io

# App URL (para links en emails)
NEXT_PUBLIC_APP_URL=https://Confia Drivesystem.io
```

## 📝 Instrucciones

### Local (.env.local)

1. Abre el archivo `.env.local` en la raíz del proyecto
2. Agrega las variables de arriba
3. Guarda el archivo
4. Reinicia el servidor de desarrollo (`npm run dev`)

### Producción (Vercel)

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega cada variable:
   - `SMTP_HOST` = `smtp.hostinger.com`
   - `SMTP_PORT` = `587`
   - `SMTP_SECURE` = `false`
   - `SMTP_USER` = `servicio@Confia Drivesystem.io`
   - `SMTP_PASS` = `Confia Drive26@%`
   - `SMTP_FROM_NAME` = `Confia Drive`
   - `SMTP_FROM_EMAIL` = `servicio@Confia Drivesystem.io`
   - `NEXT_PUBLIC_APP_URL` = `https://Confia Drivesystem.io`
4. Guarda y redeploya

## ✅ Verificación

Después de configurar, verifica que:

1. El servidor SMTP se conecta correctamente (verás en logs: "✅ Servidor SMTP listo para enviar emails")
2. Los emails de invitación se envían correctamente
3. Los emails de cotización se envían correctamente
4. Los links en los emails apuntan a `https://Confia Drivesystem.io`

## 🔍 Troubleshooting

### Error: "Servidor SMTP no listo"
- Verifica que las credenciales SMTP sean correctas
- Verifica que el puerto 587 esté abierto
- Verifica que `SMTP_SECURE=false` (para STARTTLS)

### Error: "No se pudo enviar email"
- Revisa los logs del servidor para ver el error específico
- Verifica que `NEXT_PUBLIC_APP_URL` esté configurada
- Verifica que el email del destinatario sea válido

### Links rotos en emails
- Verifica que `NEXT_PUBLIC_APP_URL` tenga el valor correcto
- No debe terminar con `/`
- Debe ser `https://` o `http://` según corresponda

