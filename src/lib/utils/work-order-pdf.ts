import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface WorkOrderPDFData {
  order: any;
  company: any;
}

/**
 * Genera un PDF profesional para una orden de trabajo.
 */
export const generateWorkOrderPDF = async ({ order, company }: WorkOrderPDFData) => {
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
  let currentY = 20;

  // --- HEADER: Empresa ---
  if (company?.logo_url) {
    try {
      // Intentar cargar el logo si es una URL base64 o accesible
      doc.addImage(company.logo_url, 'PNG', margin, currentY - 5, 30, 30);
    } catch (e) {
      console.warn('Could not add logo to PDF:', e);
    }
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(company?.company_name || 'Mi Taller', margin + 35, currentY + 5);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(company?.address || '', margin + 35, currentY + 12);
  doc.text(`Tel: ${company?.phone || ''} | Email: ${company?.email || ''}`, margin + 35, currentY + 17);
  
  // Título del documento a la derecha
  doc.setFontSize(22);
  doc.setTextColor(0, 51, 153); // Azul corporativo
  doc.text('ORDEN DE TRABAJO', pageWidth - margin, currentY + 5, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setTextColor(255, 0, 0); // Rojo para el número de orden
  doc.text(`#${order.id?.slice(0, 8).toUpperCase()}`, pageWidth - margin, currentY + 15, { align: 'right' });
  
  currentY += 40;

  // --- INFO CLIENTE Y VEHÍCULO ---
  doc.setDrawColor(200);
  doc.setLineWidth(0.1);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('CLIENTE:', margin, currentY);
  doc.text('VEHÍCULO:', pageWidth / 2, currentY);
  
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(order.customer?.name || 'Venta de Mostrador', margin, currentY);
  doc.text(`${order.vehicle?.brand || ''} ${order.vehicle?.model || ''}`, pageWidth / 2, currentY);
  
  currentY += 5;
  if (order.customer?.phone) doc.text(`Tel: ${order.customer.phone}`, margin, currentY);
  doc.text(`Placa: ${order.vehicle?.license_plate || 'N/A'}`, pageWidth / 2, currentY);
  
  currentY += 5;
  if (order.customer?.email) doc.text(`Email: ${order.customer.email}`, margin, currentY);
  doc.text(`Color: ${order.vehicle?.color || 'N/A'} | VIN: ${order.vehicle?.vin || 'N/A'}`, pageWidth / 2, currentY);

  currentY += 15;

  // --- DETALLES DE LA ORDEN (FECHAS, ESTADO) ---
  const entryDate = format(new Date(order.created_at), "PPP", { locale: es });
  
  doc.autoTable({
    startY: currentY,
    head: [['Fecha Ingreso', 'Estado', 'Kilometraje', 'Combustible']],
    body: [[
      entryDate,
      order.status?.toUpperCase() || 'PENDIENTE',
      order.vehicle?.mileage ? `${order.vehicle.mileage} KM` : 'N/A',
      order.fuel_level || 'N/A'
    ]],
    theme: 'grid',
    headStyles: { fillStyle: [0, 51, 153], textColor: 255 },
    margin: { left: margin, right: margin }
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // --- DESCRIPCIÓN DEL SERVICIO ---
  doc.setFont('helvetica', 'bold');
  doc.text('SOLICITUD / SÍNTOMAS:', margin, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  const splitDesc = doc.splitTextToSize(order.description || 'Sin descripción', pageWidth - (margin * 2));
  doc.text(splitDesc, margin, currentY);
  currentY += splitDesc.length * 5 + 10;

  // --- SERVICIOS Y REFACCIONES (ITEMS) ---
  if (order.order_items && order.order_items.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE CARGOS:', margin, currentY);
    currentY += 5;
    
    doc.autoTable({
      startY: currentY,
      head: [['Descripción', 'Cant', 'Precio Unit.', 'Total']],
      body: order.order_items.map((item: any) => [
        item.item_name,
        item.quantity,
        `$${Number(item.unit_price).toFixed(2)}`,
        `$${Number(item.total_price || item.quantity * item.unit_price).toFixed(2)}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [100, 100, 100] },
      margin: { left: margin, right: margin }
    });
    
    currentY = doc.lastAutoTable.finalY + 10;
    
    // Totales
    doc.setFont('helvetica', 'bold');
    doc.text(`SUBTOTAL: $${Number(order.subtotal || 0).toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 6;
    doc.text(`IVA: $${Number(order.tax_amount || 0).toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 10;
    doc.setFontSize(14);
    doc.text(`TOTAL: $${Number(order.total_amount || 0).toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 15;
  }

  // --- TÉRMINOS Y CONDICIONES ---
  if (order.terms_text || company?.terms_text) {
    const terms = order.terms_text || company?.terms_text;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TÉRMINOS Y CONDICIONES:', margin, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    const splitTerms = doc.splitTextToSize(terms, pageWidth - (margin * 2));
    doc.text(splitTerms, margin, currentY);
    currentY += splitTerms.length * 4 + 10;
  }

  // --- FIRMAS ---
  const signatureY = Math.max(currentY, doc.internal.pageSize.height - 60);
  
  // Líneas de firma
  doc.setDrawColor(0);
  doc.line(margin, signatureY, margin + 60, signatureY);
  doc.line(pageWidth - margin - 60, signatureY, pageWidth - margin, signatureY);
  
  doc.setFontSize(9);
  doc.text('Firma del Responsable', margin + 30, signatureY + 5, { align: 'center' });
  doc.text('Firma del Cliente', pageWidth - margin - 30, signatureY + 5, { align: 'center' });

  // Poner la firma real si existe
  if (order.customer_signature) {
    try {
      // La firma suele venir como dataURL (base64)
      doc.addImage(order.customer_signature, 'PNG', pageWidth - margin - 55, signatureY - 35, 50, 30);
    } catch (e) {
      console.warn('Error adding signature image:', e);
    }
  }

  // --- FOOTER ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${totalPages} - Generado por Eagles AI Assistant`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  return doc;
};

/**
 * Descarga el PDF generado.
 */
export const downloadWorkOrderPDF = async (order: any, company: any) => {
  const doc = await generateWorkOrderPDF({ order, company });
  doc.save(`Orden_${order.id?.slice(0, 8).toUpperCase()}.pdf`);
};
