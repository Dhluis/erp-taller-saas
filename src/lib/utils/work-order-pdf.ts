import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface WorkOrderPDFData {
  order: any;
  company?: any;
}

/**
 * Helper to fetch an image and convert it to base64 to avoid CORS/loading issues in jsPDF
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
 * Genera un PDF profesional y MUY completo para una orden de trabajo.
 */
export const generateWorkOrderPDF = async ({ order, company: providedCompany }: WorkOrderPDFData) => {
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  let currentY = 20;

  // Priorizar empresa de la orden (refrescada por API) sobre el prop inyectado
  const company = order.company || providedCompany;

  // Helper para asegurar que las URLs sean absolutas (especialmente para Supabase Storage)
  const ensureAbsoluteUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    
    // Si es un path relativo de Supabase Storage, construir la URL completa
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://igshgleciwknpupbmvhn.supabase.co';
    // Asumimos que los archivos están en el bucket 'company-assets' o 'images'
    const bucket = url.includes('terms') ? 'company-assets' : 'images';
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${url}`;
  };

  // --- HEADER: Empresa ---
  const logoUrl = ensureAbsoluteUrl(company?.logo_url);
  if (logoUrl) {
    try {
      // Intentar convertir logo a base64 para evitar problemas de carga asíncrona en jspdf
      const logoBase64 = await fetchImageAsBase64(logoUrl);
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin, currentY - 5, 30, 30);
      } else {
        doc.addImage(logoUrl, 'PNG', margin, currentY - 5, 30, 30);
      }
    } catch (e) {
      console.warn('Could not add logo to PDF:', e);
    }
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(company?.company_name || 'Confia Drive', margin + 35, currentY + 5);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(company?.address || '', margin + 35, currentY + 12);
  doc.text(`Tel: ${company?.phone || ''} | Email: ${company?.email || ''}`, margin + 35, currentY + 17);
  
  // Título del documento
  doc.setFontSize(22);
  doc.setTextColor(0, 51, 153); // Azul corporativo
  doc.text('ORDEN DE TRABAJO', pageWidth - margin, currentY + 5, { align: 'right' });
  
  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38); // Rojo
  const orderLabel = order.order_number ? `#${order.order_number}` : `#${order.id?.slice(0, 8).toUpperCase()}`;
  doc.text(orderLabel, pageWidth - margin, currentY + 15, { align: 'right' });
  
  currentY += 40;

  // --- ESCANEAR PARA TRACKING (QR Superior Derecha) ---
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://confiadrive.io';
  const trackingUrl = `${origin}/tracking/${order.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(trackingUrl)}&size=150x150`;
  
  try {
    const qrBase64 = await fetchImageAsBase64(qrUrl);
    if (qrBase64) {
      // Render QR un poco más a la izquierda y abajo para no tapar el # de orden. Tamaño aumentado para escaneo fácil.
      doc.addImage(qrBase64, 'PNG', pageWidth - margin - 25, currentY - 25, 25, 25);
      doc.setFontSize(6);
      doc.setTextColor(150);
      doc.text('Seguimiento en línea', pageWidth - margin - 12.5, currentY + 3, { align: 'center' });
    }
  } catch (e) {
    console.warn('Could not add Tracking QR to PDF:', e);
  }

  // --- INFO CLIENTE Y VEHÍCULO ---
  autoTable(doc, {
    startY: currentY + 5,
    head: [['DATOS DEL CLIENTE', 'DATOS DEL VEHÍCULO']],
    body: [[
      {
        content: `Nombre: ${order.customer?.name || 'Cliente General'}\nTel: ${order.customer?.phone || 'N/A'}\nEmail: ${order.customer?.email || 'N/A'}`,
        styles: { halign: 'left' }
      },
      {
        content: `Vehículo: ${order.vehicle?.brand || ''} ${order.vehicle?.model || ''} (${order.vehicle?.year || ''})\nPlacas: ${order.vehicle?.license_plate || 'N/A'}\nVIN: ${order.vehicle?.vin || 'N/A'}\nColor: ${order.vehicle?.color || 'N/A'}`,
        styles: { halign: 'left' }
      }
    ]],
    theme: 'plain',
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 10 },
    styles: { cellPadding: 5, fontSize: 9, lineColor: [226, 232, 240], lineWidth: 0.1 },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // --- INSPECCIÓN Y ESTADO ---
  const inspection = order.inspection || (order.vehicle_inspections && order.vehicle_inspections[0]);
  const entryDateRaw = order.entry_date || order.created_at;
  const entryDate = entryDateRaw ? format(new Date(entryDateRaw), "PPP", { locale: es }) : 'N/A';

  autoTable(doc, {
    startY: currentY,
    head: [['Fecha Ingreso', 'Estado Actual', 'Kilometraje', 'Nivel Combustible']],
    body: [[
      entryDate,
      order.status?.replace('_', ' ').toUpperCase() || 'RECEPCIÓN',
      order.vehicle?.mileage ? `${order.vehicle.mileage} KM` : 'N/A',
      inspection?.fuel_level === 'full' ? 'Lleno' : 
      inspection?.fuel_level === 'three_quarters' ? '3/4' :
      inspection?.fuel_level === 'half' ? '1/2' :
      inspection?.fuel_level === 'quarter' ? '1/4' :
      inspection?.fuel_level === 'empty' ? 'Vacío' : 'N/A'
    ]],
    theme: 'grid',
    headStyles: { fillColor: [0, 51, 153], textColor: 255 },
    styles: { fontSize: 9, halign: 'center' },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // --- REVISIÓN DE FLUIDOS Y OBJETOS ---
  if (inspection) {
    const fluids = inspection.fluids_check || {};
    const fluidLabels: Record<string, string> = {
      aceite_motor: 'Aceite Motor',
      aceite_transmision: 'Aceite Transm.',
      liquido_frenos: 'Liq. Frenos',
      refrigerante: 'Refrigerante',
      limpia_parabrisas: 'Limpia Parabrisas'
    };

    const checkedFluids = Object.entries(fluids)
      .filter(([key, val]) => val === true && fluidLabels[key])
      .map(([key]) => fluidLabels[key])
      .join(', ');

    autoTable(doc, {
      startY: currentY,
      head: [['REVISIÓN DE FLUIDOS (OK)', 'OBJETOS DE VALOR REPORTADOS']],
      body: [[
        checkedFluids || 'Ninguno marcado',
        inspection.valuable_items || 'Sin objetos reportados'
      ]],
      theme: 'grid',
      headStyles: { fillColor: [100, 116, 139], textColor: 255 },
      styles: { fontSize: 8 },
      margin: { left: margin, right: margin }
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // --- MOTIVO DE INGRESO ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('MOTIVO DE INGRESO / SÍNTOMAS:', margin, currentY);
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const splitDesc = doc.splitTextToSize(order.description || inspection?.entry_reason || 'Sin detalles', pageWidth - (margin * 2));
  doc.text(splitDesc, margin, currentY);
  currentY += splitDesc.length * 5 + 5;

  // --- PROCEDIMIENTOS / DIAGNÓSTICO ---
  if (inspection?.procedures || order.diagnosis) {
    doc.setFont('helvetica', 'bold');
    doc.text('DIAGNÓSTICO / TRABAJOS A REALIZAR:', margin, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    const diagText = order.diagnosis || inspection?.procedures || '';
    const splitDiag = doc.splitTextToSize(diagText, pageWidth - (margin * 2));
    doc.text(splitDiag, margin, currentY);
    currentY += splitDiag.length * 5 + 10;
  }

  // --- ITEMS Y COSTOS ---
  const items = order.order_items || order.items || [];
  if (items.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Descripción del Servicio / Parte', 'Cant', 'P. Unit', 'Total']],
      body: items.map((item: any) => [
        item.item_name,
        item.quantity,
        `$${Number(item.unit_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        `$${Number(item.total_price || item.quantity * item.unit_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: margin, right: margin }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 5;
    
    // Totales resumidos
    // Totales resumidos (Premium Style) con desglose de impuestos
    const subtotal = Number(order.subtotal || 0);
    const tax = Number(order.tax_amount || 0);
    const discount = Number(order.discount_amount || 0);
    const total = Number(order.total_amount || 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`SUBTOTAL:`, pageWidth - margin - 40, currentY, { align: 'left' });
    doc.text(`$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;

    if (discount > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text(`DESCUENTO:`, pageWidth - margin - 40, currentY, { align: 'left' });
      doc.text(`-$${discount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, pageWidth - margin, currentY, { align: 'right' });
      currentY += 5;
    }

    doc.setTextColor(100);
    doc.text(`IVA (16%):`, pageWidth - margin - 40, currentY, { align: 'left' });
    doc.text(`$${tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 7;

    doc.setFontSize(14);
    doc.setTextColor(0, 51, 153);
    doc.text(`TOTAL:`, pageWidth - margin - 40, currentY, { align: 'left' });
    doc.text(`$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 15;
  } else if (order.estimated_cost || order.total_amount) {
    const cost = order.total_amount || order.estimated_cost;
    doc.setFont('helvetica', 'bold');
    doc.text(`COSTO ESTIMADO: $${Number(cost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 15;
  }

  // --- TÉRMINOS Y CONDICIONES ---
  const termsText = order.terms_text || company?.terms_text;
  const termsPdfUrl = ensureAbsoluteUrl(order.terms_file_url || company?.terms_pdf_url);

  if (termsText || termsPdfUrl) {
    if (currentY > pageHeight - 80) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('TÉRMINOS Y CONDICIONES:', margin, currentY);
    currentY += 5;

    if (termsText) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      const splitTerms = doc.splitTextToSize(termsText, pageWidth - (margin * 2));
      doc.text(splitTerms, margin, currentY);
      currentY += splitTerms.length * 3 + 5;
    }

    if (termsPdfUrl) {
      const termsQrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(termsPdfUrl)}&size=120x120`;
      try {
        const termsQrBase64 = await fetchImageAsBase64(termsQrUrl);
        if (termsQrBase64) {
          doc.addImage(termsQrBase64, 'PNG', margin, currentY, 22, 22);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'italic');
          doc.text('Escanea para ver T&C en PDF', margin + 25, currentY + 11);
          currentY += 28;
        }
      } catch (e) {
        console.warn('Could not add Terms QR:', e);
      }
    }
  }

  // --- LEYENDA LEGAL FINAL ---
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150);
  const legalLegend = 'Al firmar, el cliente acepta el presupuesto y autoriza los trabajos descritos bajo los términos del taller.';
  doc.text(legalLegend, pageWidth / 2, pageHeight - 50, { align: 'center' });

  // --- FIRMAS ---
  const signatureY = pageHeight - 35;
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(margin, signatureY, margin + 65, signatureY);
  doc.line(pageWidth - margin - 65, signatureY, pageWidth - margin, signatureY);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('RESPONSABLE TALLER', margin + 32.5, signatureY + 5, { align: 'center' });
  doc.text('FIRMA DEL CLIENTE', pageWidth - margin - 32.5, signatureY + 5, { align: 'center' });

  // Firma del responsable (del taller)
  const workshopSignatureUrl = ensureAbsoluteUrl((company as any).signature_url);
  if (workshopSignatureUrl) {
    try {
      const wSigBase64 = await fetchImageAsBase64(workshopSignatureUrl);
      if (wSigBase64) {
        doc.addImage(wSigBase64, 'PNG', margin + 5, signatureY - 25, 55, 20);
      }
    } catch (e) {
      console.warn('Error adding workshop signature:', e);
    }
  }

  // Firma del cliente (Ingreso)
  const signatureData = order.customer_signature || order.signature;
  if (signatureData) {
    try {
      doc.addImage(signatureData, 'PNG', pageWidth - margin - 60, signatureY - 25, 55, 20);
    } catch (e) {
      console.warn('Error adding signature image:', e);
    }
  }

  // Firma de Conformidad (Salida) - NUEVO
  if (order.exit_signature_url) {
    const exitSignatureUrl = ensureAbsoluteUrl(order.exit_signature_url);
    if (exitSignatureUrl) {
      try {
        const exitSigBase64 = await fetchImageAsBase64(exitSignatureUrl);
        if (exitSigBase64) {
          // Si hay firma de salida, la ponemos en una nueva sección o encima si es entrega final
          // Para no romper el layout actual, si existe firma de salida, añadimos una página o sección extra
          if (currentY > pageHeight - 60) doc.addPage();
          
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59);
          doc.text('CONFORMIDAD DE ENTREGA:', margin, signatureY - 35);
          doc.addImage(exitSigBase64, 'PNG', margin + 10, signatureY - 30, 50, 15);
          doc.setFontSize(7);
          doc.text(`Fecha: ${order.exit_signature_date ? format(new Date(order.exit_signature_date), "PPP p", { locale: es }) : 'N/A'}`, margin + 10, signatureY - 15);
        }
      } catch (e) {
        console.warn('Error adding exit signature:', e);
      }
    }
  }

  // --- FOOTER ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(180);
    doc.text(
      `Página ${i} de ${totalPages} - Generado por Confia Drive - ${company?.company_name || ''}`,
      pageWidth / 2,
      pageHeight - 10,
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
  doc.save(`Orden_${order.order_number || order.id?.slice(0, 8).toUpperCase()}.pdf`);
};


