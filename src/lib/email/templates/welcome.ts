interface WelcomeEmailData {
  userName: string;
  organizationName: string;
  loginUrl: string;
}

export function getWelcomeEmailTemplate(data: WelcomeEmailData): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a Eagles ERP</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🦅 ¡Bienvenido a Eagles ERP!
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">
                ¡Hola ${data.userName}!
              </h2>
              
              <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                Tu cuenta en Eagles ERP ha sido creada exitosamente.
              </p>
              
              <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                Ahora formas parte de <strong>${data.organizationName}</strong> y puedes comenzar a gestionar 
                tu taller de manera más eficiente.
              </p>
              
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">
                  ¿Qué puedes hacer con Eagles ERP?
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 15px; line-height: 1.8;">
                  <li>Gestionar órdenes de trabajo</li>
                  <li>Administrar inventario de refacciones</li>
                  <li>Registrar clientes y vehículos</li>
                  <li>Crear cotizaciones profesionales</li>
                  <li>Generar reportes y estadísticas</li>
                  <li>Y mucho más...</li>
                </ul>
              </div>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.loginUrl}" 
                       style="display: inline-block; padding: 15px 40px; background-color: #0ea5e9; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      Iniciar Sesión
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 25px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
                Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.
              </p>
              
              <p style="margin: 15px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
                ¡Bienvenido al equipo! 🚗
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                © ${new Date().getFullYear()} Eagles ERP. Todos los derechos reservados.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

