import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

// Forzar que este endpoint use Node.js runtime para tener acceso a process.env
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import {
  createSession,
  getSession,
  getQRCode,
  checkConnectionStatus,
  logoutSession,
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
    // 1. Obtener contexto del tenant PRIMERO (necesario para leer de BD)
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado - contexto de tenant no encontrado'
      }, { status: 401 });
    }

    const organizationId = tenantContext.organizationId;
    console.log(`[WhatsApp Session] Verificando estado para organización: ${organizationId}`);
    
    // 2. Verificar variables de entorno (solo para logging, NO fallar si no existen)
    const wahaUrl = process.env.WAHA_API_URL;
    const wahaKey = process.env.WAHA_API_KEY;
    
    if (!wahaUrl || !wahaKey) {
      console.log('[WhatsApp Session] ⚠️ Variables de entorno no disponibles, el servicio intentará leer de BD...');
      console.log('[WhatsApp Session] Organization ID:', organizationId);
    } else {
      console.log('[WhatsApp Session] ✅ Variables de entorno disponibles');
    }

    // 3. Verificar estado de conexión
    // El servicio WAHA intentará leer de variables de entorno primero,
    // y si no están disponibles, leerá de la base de datos automáticamente
    let connectionStatus;
    try {
      connectionStatus = await checkConnectionStatus(organizationId);
    } catch (error: any) {
      // Si el error es por configuración faltante, dar mensaje amigable (sin mencionar WAHA)
      if (error.message?.includes('Configuración del servidor') || 
          error.message?.includes('WAHA_API_URL') || 
          error.message?.includes('WAHA_API_KEY') || 
          error.message?.includes('no están configuradas')) {
        console.error('[WhatsApp Session] ❌ Configuración del servidor no encontrada:', error.message);
        console.error('[WhatsApp Session] 🔍 Organization ID usado:', organizationId);
        console.error('[WhatsApp Session] 🔍 Detalles técnicos (solo para logs):', {
          hasEnvVars: !!(process.env.WAHA_API_URL && process.env.WAHA_API_KEY),
          organizationId
        });
        
        return NextResponse.json({
          success: false,
          error: 'Configuración del servidor de WhatsApp no encontrada',
          hint: 'Por favor, contacta al administrador del sistema para configurar la conexión con WhatsApp.',
          userFriendlyMessage: 'No se pudo conectar con el servidor de WhatsApp. Por favor, contacta al soporte técnico.',
          // Detalles técnicos solo en debug (no se muestran al usuario)
          debug: process.env.NODE_ENV === 'development' ? {
            organizationId,
            checkEndpoint: '/api/whatsapp/diagnose'
          } : undefined
        }, { status: 500 });
      }
      throw error;
    }

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
        
        // Log para diagnóstico
        const isQRString = qrData.qrCode && 
          !qrData.qrCode.startsWith('data:image') && 
          !qrData.qrCode.match(/^[A-Za-z0-9+/=]+$/) &&
          qrData.qrCode.length > 0;
        
        console.log('[WhatsApp Session] 📱 QR obtenido:', {
          hasQR: !!qrData.qrCode,
          qrLength: qrData.qrCode?.length || 0,
          qrPreview: qrData.qrCode?.substring(0, 50) || 'NO QR',
          hasDataPrefix: qrData.qrCode?.startsWith('data:image') || false,
          isQRString: isQRString || false,
          format: isQRString ? 'value (string-to-qr)' : (qrData.qrCode?.startsWith('data:image') ? 'image-base64' : 'unknown'),
          sessionName: qrData.sessionName
        });
        
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
    
    // Log detallado del error
    if (error instanceof Error) {
      console.error('[WhatsApp Session] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al verificar estado de sesión',
      debug: error instanceof Error ? {
        name: error.name,
        message: error.message
      } : undefined
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
    // 1. Obtener contexto del tenant PRIMERO (necesario para leer de BD)
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

    // 3. Si es restart, hacer logout de la sesión "default" (WAHA Core)
    if (action === 'restart') {
      console.log(`[WhatsApp Session] Reiniciando sesión (haciendo logout para cambiar número)...`);
      try {
        // Para WAHA Core, hacer logout en lugar de eliminar la sesión
        // Esto desconecta el número actual pero mantiene la sesión "default"
        await logoutSession(organizationId);
        // Esperar un momento para que el logout se complete
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log(`[WhatsApp Session] ✅ Logout exitoso, sesión lista para nuevo número`);
      } catch (error: any) {
        // Si no existe o ya está desconectada, está bien, continuamos
        if (!error.message?.includes('no encontrada') && !error.message?.includes('not found')) {
          console.warn(`[WhatsApp Session] Advertencia al hacer logout:`, error.message);
          // Continuar de todas formas para intentar obtener QR
        }
      }
    }

    // 4. Verificar estado de la sesión e iniciarla si es necesario
    const sessionName = getSessionName(organizationId);
    let session;
    try {
      session = await getSession(sessionName, organizationId);
      console.log(`[WhatsApp Session] Sesión encontrada: ${sessionName}, estado: ${session.status}`);
      
      // Si la sesión está STOPPED o FAILED, iniciarla
      if (session.status === 'STOPPED' || session.status === 'FAILED') {
        console.log(`[WhatsApp Session] Sesión ${session.status}, iniciando...`);
        // Usar createSession que maneja la iniciación internamente
        session = await createSession(organizationId);
        // Esperar un momento para que la sesión esté lista
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log(`[WhatsApp Session] ✅ Sesión iniciada`);
      }
    } catch (error: any) {
      // Si la sesión no existe, crearla
      if (error.message?.includes('no encontrada') || error.message?.includes('not found')) {
        console.log(`[WhatsApp Session] Sesión no existe, creando...`);
        session = await createSession(organizationId);
      } else {
        throw error;
      }
    }
    
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
 * Desconecta el número de WhatsApp (hace logout)
 * 
 * IMPORTANTE: En WAHA Core, NUNCA eliminamos la sesión "default".
 * Solo hacemos logout para desconectar el número actual.
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. Obtener contexto del tenant PRIMERO (necesario para leer de BD)
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado - contexto de tenant no encontrado'
      }, { status: 401 });
    }

    const organizationId = tenantContext.organizationId;
    
    console.log(`[WhatsApp Session] DELETE - Desconectando número de WhatsApp para organización: ${organizationId}`);

    // 2. Hacer logout (desconecta el número pero mantiene la sesión "default")
    // NUNCA eliminamos la sesión en WAHA Core
    await logoutSession(organizationId);
    console.log(`[WhatsApp Session] ✅ Número desconectado (logout exitoso)`);
    
    return NextResponse.json({
      success: true,
      data: {
        message: 'Número de WhatsApp desconectado. Puedes vincular un nuevo número.',
        sessionName: getSessionName(organizationId)
      }
    });
  } catch (error: any) {
    // Si la sesión no existe o ya está desconectada, no es un error crítico
    if (error.message?.includes('no encontrada') || error.message?.includes('not found')) {
      console.log(`[WhatsApp Session] Sesión no encontrada o ya desconectada`);
      return NextResponse.json({
        success: true,
        data: {
          message: 'Sesión no encontrada o ya desconectada',
          sessionName: getSessionName((await getTenantContext())?.organizationId || '')
        }
      });
    }
    
    console.error('[WhatsApp Session] ❌ Error en DELETE:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al desconectar número'
    }, { status: 500 });
  }
}

