interface QuotationEmailData {
  customerName: string;
  quotationNumber: string;
  vehicleInfo: string;
  organizationName: string;
  quotationLink?: string;
  totalAmount: string;
  items: Array<{
    description: string;
    quantity: number;
    price: string;
  }>;
}

export function getQuotationEmailTemplate(data: QuotationEmailData): string {
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">
        ${item.description}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #475569; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #475569; text-align: right;">
        ${item.price}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización ${data.quotationNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); padding: 40px 30px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🦅 ${data.organizationName}
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">
                Cotización #${data.quotationNumber}
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">
                Hola ${data.customerName},
              </h2>
              
              <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                Adjunto encontrarás la cotización para los servicios solicitados para tu vehículo:
              </p>
              
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; color: #64748b; font-size: 14px;">
                  <strong style="color: #1e293b;">Vehículo:</strong> ${data.vehicleInfo}
                </p>
              </div>
              
              <!-- Items Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 12px; text-align: left; color: #1e293b; font-size: 14px; border-bottom: 2px solid #e2e8f0;">
                      Descripción
                    </th>
                    <th style="padding: 12px; text-align: center; color: #1e293b; font-size: 14px; border-bottom: 2px solid #e2e8f0;">
                      Cantidad
                    </th>
                    <th style="padding: 12px; text-align: right; color: #1e293b; font-size: 14px; border-bottom: 2px solid #e2e8f0;">
                      Precio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr style="background-color: #f8fafc;">
                    <td colspan="2" style="padding: 15px; text-align: right; color: #1e293b; font-weight: bold; font-size: 16px;">
                      Total:
                    </td>
                    <td style="padding: 15px; text-align: right; color: #0ea5e9; font-weight: bold; font-size: 18px;">
                      ${data.totalAmount}
                    </td>
                  </tr>
                </tfoot>
              </table>
              
              ${data.quotationLink ? `
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 30px 0 20px 0;">
                    <a href="${data.quotationLink}" 
                       style="display: inline-block; padding: 15px 40px; background-color: #0ea5e9; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      Ver cotización completa
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <p style="margin: 25px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
                Si tienes alguna pregunta sobre esta cotización, no dudes en contactarnos.
              </p>
              
              <p style="margin: 15px 0 0 0; color: #475569; font-size: 16px; line-height: 1.6;">
                ¡Esperamos trabajar contigo pronto!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                © ${new Date().getFullYear()} ${data.organizationName}
              </p>
              <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 12px;">
                Powered by Eagles System
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

