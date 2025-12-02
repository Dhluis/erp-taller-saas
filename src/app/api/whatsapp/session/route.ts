import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { 
  getOrganizationSession, 
  getSessionStatus, 
  getSessionQR,
  logoutSession,
  createOrganizationSession
} from '@/lib/waha-sessions';

// Forzar que este endpoint use Node.js runtime para tener acceso a process.env
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/whatsapp/session
 * Verifica el estado de conexión de WhatsApp para la organización del usuario
 * 
 * Retorna:
 * - Si está conectado: {status: 'WORKING', connected: true, phone, session}
 * - Si necesita QR: {status: 'SCAN_QR', connected: false, qr, session}
 * - Si está iniciando: {status: 'STARTING', connected: false, session}
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Obtener contexto del tenant
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado - contexto de tenant no encontrado'
      }, { status: 401 });
    }

    const organizationId = tenantContext.organizationId;
    console.log(`[WhatsApp Session] 🔍 Verificando estado para organización: ${organizationId}`);

    // 2. Obtener o crear sesión para esta organización
    const sessionName = await getOrganizationSession(organizationId);
    console.log(`[WhatsApp Session] 📝 Sesión: ${sessionName}`);

    // 3. Obtener estado de la sesión (pasar organizationId para usar su configuración)
    const status = await getSessionStatus(sessionName, organizationId);
    
    // Verificar que status existe y tiene status
    if (!status || !status.status) {
      console.error('[WhatsApp Session] ❌ No se pudo obtener estado de sesión');
      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener estado de sesión',
        details: status?.error || 'Estado indefinido'
      }, { status: 500 });
    }

    console.log(`[WhatsApp Session] 📊 Estado: ${status.status}`);

    // 4. Si la sesión está conectada (WORKING), devolver estado
    if (status.status === 'WORKING') {
      const phone = status.me?.id?.split('@')[0] || status.me?.phone || null;
      const name = status.me?.name || null;

      console.log(`[WhatsApp Session] ✅ Conectado: ${phone || 'N/A'}`);

      return NextResponse.json({
        success: true,
        status: 'WORKING',
        connected: true,
        session: sessionName,
        phone,
        name,
        sessionStatus: status.status
      });
    }

    // 5. Si necesita QR, obtenerlo
    if (status.status === 'SCAN_QR_CODE' || status.status === 'SCAN_QR' || status.status === 'STARTING') {
      try {
        const qr = await getSessionQR(sessionName, organizationId);
        
        // El QR puede venir en formato { value: "..." } o { data: "...", mimetype: "..." }
        const qrValue = qr.value || qr.data || null;
        
        console.log(`[WhatsApp Session] 📱 QR obtenido:`, {
          hasValue: !!qr.value,
          hasData: !!qr.data,
          format: qr.value ? 'value' : (qr.data ? 'data' : 'unknown')
        });

        return NextResponse.json({
          success: true,
          status: 'SCAN_QR',
          connected: false,
          session: sessionName,
          qr: qrValue,
          expiresIn: 60 // QR codes expiran en ~60 segundos
        });
      } catch (qrError: any) {
        console.warn(`[WhatsApp Session] ⚠️ Error obteniendo QR:`, qrError.message);
        
        // Si el error es que ya está conectado, verificar estado nuevamente
        if (qrError.message?.includes('already connected') || qrError.message?.includes('ya conectado')) {
          const newStatus = await getSessionStatus(sessionName, organizationId);
          if (newStatus && newStatus.status === 'WORKING') {
            const phone = newStatus.me?.id?.split('@')[0] || newStatus.me?.phone || null;
            return NextResponse.json({
              success: true,
              status: 'WORKING',
              connected: true,
              session: sessionName,
              phone
            });
          }
        }

        return NextResponse.json({
          success: true,
          status: (status && status.status) ? status.status : 'STARTING',
          connected: false,
          session: sessionName,
          message: 'Esperando QR...'
        });
      }
    }

    // 6. Sesión no existe o error
    if (!status.exists) {
      console.log(`[WhatsApp Session] 📝 Sesión no existe, creando nueva...`);
      // Crear nueva sesión
      await createOrganizationSession(organizationId);
      return NextResponse.json({
        success: true,
        status: 'STARTING',
        connected: false,
        session: sessionName,
        message: 'Iniciando sesión...'
      });
    }

    // 7. Otro estado (STOPPED, FAILED, ERROR, etc.)
    const currentStatus = (status && status.status) ? status.status : 'UNKNOWN';
    
    // Si es un error de configuración, proporcionar más información
    if (currentStatus === 'ERROR' && status?.error) {
      console.error(`[WhatsApp Session] ❌ Error de configuración:`, status.error);
      return NextResponse.json({
        success: false,
        status: 'ERROR',
        connected: false,
        session: sessionName,
        error: status.error,
        message: 'Error de configuración de WAHA. Verifica que la configuración esté en la base de datos o en variables de entorno.'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      status: currentStatus,
      connected: false,
      session: sessionName,
      message: `Estado: ${currentStatus}`,
      error: status?.error || undefined
    });

  } catch (error: any) {
    console.error('[WhatsApp Session] ❌ Error en GET:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error desconocido al verificar estado de sesión',
      debug: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/session
 * Acciones sobre la sesión: logout, change_number, reconnect
 * 
 * Body:
 * { action: 'logout' | 'change_number' | 'reconnect' }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Obtener contexto del tenant
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado - contexto de tenant no encontrado'
      }, { status: 401 });
    }

    const organizationId = tenantContext.organizationId;
    const { action = 'reconnect' } = await request.json().catch(() => ({}));

    console.log(`[WhatsApp Session] POST - Acción: ${action} para organización: ${organizationId}`);

    // 2. Obtener sesión de la organización
    const sessionName = await getOrganizationSession(organizationId);

    // 3. Procesar acción
    if (action === 'logout' || action === 'change_number') {
      console.log(`[WhatsApp Session] 🔓 Cerrando sesión: ${sessionName}`);
      await logoutSession(sessionName, organizationId);
      
      return NextResponse.json({
        success: true,
        message: 'Sesión cerrada. Escanea el nuevo código QR para conectar un nuevo número.',
        session: sessionName
      });
    }

    if (action === 'reconnect' || action === 'restart') {
      console.log(`[WhatsApp Session] 🔄 Reiniciando sesión: ${sessionName}`);
      
      // Cerrar sesión actual
      try {
        await logoutSession(sessionName);
      } catch (e) {
        // Ignorar error si ya está cerrada
        console.log(`[WhatsApp Session] ℹ️ Sesión ya cerrada o no existe`);
      }

      // Crear nueva sesión
      const newSessionName = await createOrganizationSession(organizationId);
      
      return NextResponse.json({
        success: true,
        message: 'Sesión reiniciada. Escanea el código QR para vincular WhatsApp.',
        session: newSessionName
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Acción no válida. Use: logout, change_number, reconnect' 
    }, { status: 400 });

  } catch (error: any) {
    console.error('[WhatsApp Session] ❌ Error en POST:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error desconocido al procesar acción'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/whatsapp/session
 * Desconecta el número de WhatsApp (hace logout)
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. Obtener contexto del tenant
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado - contexto de tenant no encontrado'
      }, { status: 401 });
    }

    const organizationId = tenantContext.organizationId;
    console.log(`[WhatsApp Session] DELETE - Desconectando para organización: ${organizationId}`);

    // 2. Obtener sesión y cerrarla (pasar organizationId para usar su configuración)
    const sessionName = await getOrganizationSession(organizationId);
    await logoutSession(sessionName, organizationId);

    console.log(`[WhatsApp Session] ✅ Número desconectado`);

    return NextResponse.json({
      success: true,
      message: 'Número de WhatsApp desconectado. Puedes vincular un nuevo número.',
      session: sessionName
    });
  } catch (error: any) {
    console.error('[WhatsApp Session] ❌ Error en DELETE:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error desconocido al desconectar número'
    }, { status: 500 });
  }
}
