import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface InvoicePDFData {
  invoice: any;
  company?: any;
}

/**
 * Helper to fetch an image and convert it to base64
 */
const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Error fetching image for PDF:', e);
    return null;
  }
};

/**
 * Genera un PDF profesional para una Factura o Recibo de Pago.
 */
export const generateInvoicePDF = async ({ invoice, company }: InvoicePDFData) => {
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  let currentY = 20;

  // Helper para asegurar URLs absolutas
  const ensureAbsoluteUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://igshgleciwknpupbmvhn.supabase.co';
    return `${supabaseUrl}/storage/v1/object/public/images/${url}`;
  };

  // --- HEADER: Empresa ---
  const logoUrl = ensureAbsoluteUrl(company?.logo_url);
  if (logoUrl) {
    try {
      const logoBase64 = await fetchImageAsBase64(logoUrl);
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin, currentY - 5, 30, 30);
      }
    } catch (e) {
      console.warn('Could not add logo to PDF:', e);
    }
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(company?.company_name || 'Confia Drive', margin + 35, currentY + 5);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(company?.address || '', margin + 35, currentY + 12);
  doc.text(`Tel: ${company?.phone || ''} | RFC: ${company?.tax_id || 'N/A'}`, margin + 35, currentY + 17);
  
  // Título del documento
  doc.setFontSize(22);
  doc.setTextColor(0, 51, 153);
  doc.text('FACTURA / RECIBO', pageWidth - margin, currentY + 5, { align: 'right' });
  
  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38);
  doc.text(`#${invoice.invoice_number}`, pageWidth - margin, currentY + 15, { align: 'right' });
  
  currentY += 40;

  // --- INFO CLIENTE Y FACTURA ---
  autoTable(doc, {
    startY: currentY,
    head: [['RECEPTOR', 'DETALLES']],
    body: [[
      {
        content: `Cliente: ${invoice.customer?.name || 'Cliente General'}\nRFC: ${invoice.customer?.tax_id || 'N/A'}\nEmail: ${invoice.customer?.email || 'N/A'}`,
        styles: { halign: 'left' }
      },
      {
        content: `Fecha Emisión: ${format(new Date(invoice.created_at), "PPP", { locale: es })}\nFecha Vencimiento: ${invoice.due_date ? format(new Date(invoice.due_date), "PPP", { locale: es }) : 'N/A'}\nEstado: ${invoice.status?.toUpperCase()}`,
        styles: { halign: 'left' }
      }
    ]],
    theme: 'plain',
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
    styles: { cellPadding: 5, fontSize: 9 },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // --- ITEMS ---
  const items = invoice.invoice_items || [];
  autoTable(doc, {
    startY: currentY,
    head: [['Descripción', 'Cantidad', 'Precio Unit.', 'Importe']],
    body: items.map((item: any) => [
      item.description || 'Servicio/Producto',
      item.quantity,
      `$${Number(item.unit_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      `$${Number(item.total_amount || item.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
    ]),
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85] },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // --- TOTALES ---
  const subtotal = Number(invoice.subtotal || 0);
  const tax = Number(invoice.tax_amount || 0);
  const total = Number(invoice.total_amount || invoice.total || 0);
  const paid = Number(invoice.paid_amount || 0);
  const pending = total - paid;

  const summaryX = pageWidth - margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`SUBTOTAL:`, summaryX - 40, currentY, { align: 'left' });
  doc.text(`$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, summaryX, currentY, { align: 'right' });
  currentY += 6;

  doc.text(`IVA (16%):`, summaryX - 40, currentY, { align: 'left' });
  doc.text(`$${tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, summaryX, currentY, { align: 'right' });
  currentY += 8;

  doc.setFontSize(14);
  doc.setTextColor(0, 51, 153);
  doc.text(`TOTAL:`, summaryX - 40, currentY, { align: 'left' });
  doc.text(`$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, summaryX, currentY, { align: 'right' });
  currentY += 10;

  if (paid > 0) {
    doc.setFontSize(10);
    doc.setTextColor(34, 197, 94); // Green 500
    doc.text(`PAGADO:`, summaryX - 40, currentY, { align: 'left' });
    doc.text(`$${paid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, summaryX, currentY, { align: 'right' });
    currentY += 6;

    doc.setTextColor(pending > 0 ? [220, 38, 38] : [71, 85, 105]);
    doc.text(`PENDIENTE:`, summaryX - 40, currentY, { align: 'left' });
    doc.text(`$${pending.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, summaryX, currentY, { align: 'right' });
  }

  // --- FIRMAS ---
  const signatureY = pageHeight - 40;
  
  // Firma del taller (Si existe)
  const workshopSig = ensureAbsoluteUrl(company?.signature_url);
  if (workshopSig) {
    try {
      const sigBase64 = await fetchImageAsBase64(workshopSig);
      if (sigBase64) {
        doc.addImage(sigBase64, 'PNG', margin, signatureY - 20, 50, 20);
      }
    } catch (e) {}
  }
  
  doc.setDrawColor(200);
  doc.line(margin, signatureY, margin + 60, signatureY);
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('FIRMA RESPONSABLE', margin + 30, signatureY + 5, { align: 'center' });

  // --- FOOTER ---
  doc.setFontSize(8);
  doc.text('Gracias por su confianza. Este documento no representa un CFDI oficial a menos que se indique lo contrario.', pageWidth / 2, pageHeight - 15, { align: 'center' });

  return doc;
};

/**
 * Descarga el PDF generado.
 */
export const downloadInvoicePDF = async (invoice: any, company: any) => {
  const doc = await generateInvoicePDF({ invoice, company });
  doc.save(`Factura_${invoice.invoice_number}.pdf`);
};

