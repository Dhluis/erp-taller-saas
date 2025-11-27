import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import {
  createSession,
  getSession,
  getQRCode,
  checkConnectionStatus,
  disconnectSession,
  deleteSession,
  getSessionName
} from '@/integrations/whatsapp/services/waha-service';

/**
 * GET /api/whatsapp/session
 * Verifica el estado de conexión de WhatsApp
 * 
 * Si está conectado: retorna {status: 'connected', phone, name}
 * Si no está conectado: obtiene QR y retorna {status: 'pending', qr}
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
    console.log(`[WhatsApp Session] Verificando estado para organización: ${organizationId}`);

    // 2. Verificar estado de conexión
    const connectionStatus = await checkConnectionStatus(organizationId);

    // 3. Si está conectado, retornar información
    if (connectionStatus.connected) {
      console.log(`[WhatsApp Session] ✅ Conectado: ${connectionStatus.phone}`);
      return NextResponse.json({
        success: true,
        data: {
          status: 'connected',
          phone: connectionStatus.phone,
          name: connectionStatus.name,
          sessionStatus: connectionStatus.status
        }
      });
    }

    // 4. Si no está conectado, obtener QR
    console.log(`[WhatsApp Session] ⏳ No conectado (${connectionStatus.status}), obteniendo QR...`);
    
    try {
      const qrData = await getQRCode(organizationId);
      
      return NextResponse.json({
        success: true,
        data: {
          status: 'pending',
          qr: qrData.qrCode,
          sessionName: qrData.sessionName,
          expiresIn: qrData.expiresIn
        }
      });
    } catch (qrError: any) {
      // Si el error es que ya está conectado, retornar estado conectado
      if (qrError.message?.includes('ya conectado') || qrError.message?.includes('already connected')) {
        const status = await checkConnectionStatus(organizationId);
        return NextResponse.json({
          success: true,
          data: {
            status: 'connected',
            phone: status.phone,
            name: status.name,
            sessionStatus: status.status
          }
        });
      }
      
      // Si el error es que la sesión no existe, crear una nueva
      if (qrError.message?.includes('no encontrada') || qrError.message?.includes('not found')) {
        console.log(`[WhatsApp Session] Sesión no existe, creando nueva...`);
        await createSession(organizationId);
        // Esperar un momento para que se inicialice
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Intentar obtener QR nuevamente
        const qrData = await getQRCode(organizationId);
        return NextResponse.json({
          success: true,
          data: {
            status: 'pending',
            qr: qrData.qrCode,
            sessionName: qrData.sessionName,
            expiresIn: qrData.expiresIn
          }
        });
      }
      
      throw qrError;
    }
  } catch (error) {
    console.error('[WhatsApp Session] ❌ Error en GET:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al verificar estado de sesión'
    }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/session
 * Crea o reinicia una sesión de WhatsApp
 * 
 * Body:
 * {
 *   action?: 'start' | 'restart'  // Por defecto: 'start'
 * }
 * 
 * - start: Crea/inicia la sesión
 * - restart: Elimina la sesión existente y crea una nueva
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
    
    // 2. Parsear body
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'start';
    
    console.log(`[WhatsApp Session] POST - Acción: ${action} para organización: ${organizationId}`);

    // 3. Si es restart, eliminar sesión existente primero
    if (action === 'restart') {
      console.log(`[WhatsApp Session] Reiniciando sesión (eliminando existente)...`);
      try {
        await deleteSession(organizationId);
        // Esperar un momento para que se elimine completamente
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`[WhatsApp Session] ✅ Sesión anterior eliminada`);
      } catch (error: any) {
        // Si no existe, está bien, continuamos
        if (!error.message?.includes('no encontrada') && !error.message?.includes('not found')) {
          console.warn(`[WhatsApp Session] Advertencia al eliminar sesión:`, error.message);
        }
      }
    }

    // 4. Crear/iniciar sesión
    console.log(`[WhatsApp Session] Creando/iniciando sesión...`);
    const session = await createSession(organizationId);
    
    // 5. Obtener QR para vincular
    console.log(`[WhatsApp Session] Obteniendo QR...`);
    const qrData = await getQRCode(organizationId);
    
    console.log(`[WhatsApp Session] ✅ Sesión ${action === 'restart' ? 'reiniciada' : 'creada'}`);
    
    return NextResponse.json({
      success: true,
      data: {
        sessionName: session.name,
        status: session.status,
        qr: qrData.qrCode,
        expiresIn: qrData.expiresIn,
        message: action === 'restart' 
          ? 'Sesión reiniciada. Escanea el nuevo código QR para vincular WhatsApp.'
          : 'Sesión creada. Escanea el código QR para vincular WhatsApp.'
      }
    });
  } catch (error) {
    console.error('[WhatsApp Session] ❌ Error en POST:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al crear/reiniciar sesión'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/whatsapp/session
 * Desconecta o elimina una sesión de WhatsApp
 * 
 * Query params:
 * - permanent=true: Elimina la sesión completamente
 * - permanent=false o sin param: Solo desconecta (detiene)
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
    
    // 2. Obtener query params
    const searchParams = request.nextUrl.searchParams;
    const permanent = searchParams.get('permanent') === 'true';
    
    console.log(`[WhatsApp Session] DELETE - ${permanent ? 'Eliminando' : 'Desconectando'} sesión para organización: ${organizationId}`);

    // 3. Desconectar o eliminar según el parámetro
    if (permanent) {
      await deleteSession(organizationId);
      console.log(`[WhatsApp Session] ✅ Sesión eliminada completamente`);
      
      return NextResponse.json({
        success: true,
        data: {
          message: 'Sesión eliminada completamente',
          sessionName: getSessionName(organizationId)
        }
      });
    } else {
      await disconnectSession(organizationId);
      console.log(`[WhatsApp Session] ✅ Sesión desconectada (puede reiniciarse)`);
      
      return NextResponse.json({
        success: true,
        data: {
          message: 'Sesión desconectada. Puedes reiniciarla con POST /api/whatsapp/session',
          sessionName: getSessionName(organizationId)
        }
      });
    }
  } catch (error: any) {
    // Si la sesión no existe, no es un error crítico
    if (error.message?.includes('no encontrada') || error.message?.includes('not found')) {
      console.log(`[WhatsApp Session] Sesión no encontrada (ya eliminada o no existe)`);
      return NextResponse.json({
        success: true,
        data: {
          message: 'Sesión no encontrada (ya eliminada o no existe)',
          sessionName: getSessionName((await getTenantContext())?.organizationId || '')
        }
      });
    }
    
    console.error('[WhatsApp Session] ❌ Error en DELETE:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al desconectar/eliminar sesión'
    }, { status: 500 });
  }
}

