interface InvitationEmailData {
  invitedEmail: string;
  invitedByName: string;
  organizationName: string;
  invitationLink: string;
}

export function getInvitationEmailTemplate(data: InvitationEmailData): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación a Eagles System</title>
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
                🦅 Eagles System
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">
                Has sido invitado a unirte a Eagles System
              </h2>
              
              <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                Hola,
              </p>
              
              <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                <strong>${data.invitedByName}</strong> te ha invitado a unirte a 
                <strong>${data.organizationName}</strong> en Eagles System.
              </p>
              
              <p style="margin: 0 0 25px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                Eagles System es un sistema completo de gestión para talleres automotrices que te permitirá 
                gestionar órdenes de trabajo, inventario, clientes y mucho más.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.invitationLink}" 
                       style="display: inline-block; padding: 15px 40px; background-color: #0ea5e9; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      Aceptar invitación
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 25px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:<br>
                <a href="${data.invitationLink}" style="color: #0ea5e9; word-break: break-all;">
                  ${data.invitationLink}
                </a>
              </p>
              
              <p style="margin: 25px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Esta invitación expirará en 7 días.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                © ${new Date().getFullYear()} Eagles System. Todos los derechos reservados.
              </p>
              <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 12px;">
                Si no solicitaste esta invitación, puedes ignorar este email.
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

