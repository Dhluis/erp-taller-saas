import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { 
  getOrganizationSession, 
  getSessionStatus, 
  getSessionQR,
  createOrganizationSession,
  startSession,
  logoutSession,
  updateSessionWebhook
} from '@/lib/waha-sessions';

/**
 * Helper para agregar timeout a fetch requests
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Timeout después de ${timeoutMs}ms al llamar a ${url}`);
    }
    throw error;
  }
}

/**
 * GET /api/whatsapp/session
 * Obtiene el estado actual de la sesión de WhatsApp para la organización
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[/api/whatsapp/session] 🔍 Iniciando GET request...');
    console.log('[/api/whatsapp/session] 📋 Request headers:', {
      hasAuth: !!request.headers.get('authorization'),
      hasCookie: !!request.headers.get('cookie'),
      userAgent: request.headers.get('user-agent')?.substring(0, 50)
    });
    
    // 1. Obtener contexto del usuario con manejo robusto de errores
    let tenantContext;
    try {
      console.log('[/api/whatsapp/session] 🔍 Obteniendo tenant context...');
      tenantContext = await getTenantContext(request);
      console.log('[/api/whatsapp/session] ✅ Tenant context obtenido:', {
        hasOrganizationId: !!tenantContext?.organizationId,
        hasUserId: !!tenantContext?.userId,
        organizationId: tenantContext?.organizationId,
        userId: tenantContext?.userId
      });
    } catch (tenantError: any) {
      console.error('[/api/whatsapp/session] ❌ Error obteniendo tenant context:', {
        message: tenantError.message,
        stack: tenantError.stack,
        name: tenantError.name
      });
      return NextResponse.json({ 
        success: false, 
        error: 'No autorizado',
        details: process.env.NODE_ENV === 'development' ? tenantError.message : undefined
      }, { status: 403 });
    }
    
    const { organizationId, userId } = tenantContext || {};
    
    if (!organizationId) {
      console.error('[/api/whatsapp/session] ❌ Sin organizationId en tenant context');
      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener la organización del usuario'
      }, { status: 400 });
    }

    console.log(`[/api/whatsapp/session] 🏢 Organization ID: ${organizationId}`);
    console.log(`[/api/whatsapp/session] 👤 User ID: ${userId || 'N/A'}`);

    // 2. Obtener o crear nombre de sesión
    let sessionName: string;
    try {
      console.log('[/api/whatsapp/session] 🔍 Obteniendo/creando nombre de sesión...');
      sessionName = await getOrganizationSession(organizationId);
      console.log(`[/api/whatsapp/session] ✅ Session Name: ${sessionName}`);
    } catch (sessionError: any) {
      console.error('[/api/whatsapp/session] ❌ Error obteniendo sesión:', {
        message: sessionError.message,
        stack: sessionError.stack
      });
      return NextResponse.json({
        success: false,
        error: `Error obteniendo sesión: ${sessionError.message}`,
        details: process.env.NODE_ENV === 'development' ? sessionError.stack : undefined
      }, { status: 500 });
    }

    // 3. Obtener estado de la sesión
    let status;
    try {
      console.log('[/api/whatsapp/session] 🔍 Obteniendo estado de sesión...');
      status = await getSessionStatus(sessionName, organizationId);
      console.log(`[/api/whatsapp/session] 📊 Estado de sesión:`, {
        exists: status.exists,
        status: status.status,
        error: status.error
      });
    } catch (statusError: any) {
      console.error('[/api/whatsapp/session] ❌ Error obteniendo estado:', {
        message: statusError.message,
        stack: statusError.stack
      });
      return NextResponse.json({
        success: false,
        error: `Error obteniendo estado de sesión: ${statusError.message}`,
        details: process.env.NODE_ENV === 'development' ? statusError.stack : undefined
      }, { status: 500 });
    }

    // 4. CASO: Sesión conectada (WORKING)
    if (status.status === 'WORKING') {
      const phone = status.me?.id?.split('@')[0] || status.me?.phone || null;
      console.log(`[/api/whatsapp/session] ✅ Sesión conectada: ${phone || 'N/A'}`);
      
      return NextResponse.json({
        success: true,
        status: 'WORKING',
        connected: true,
        session: sessionName,
        phone,
        name: status.me?.name
      });
    }

    // 5. CASO: Sesión requiere QR (SCAN_QR, SCAN_QR_CODE, STARTING)
    const needsQR = ['SCAN_QR', 'SCAN_QR_CODE', 'STARTING'].includes(status.status);
    
    if (needsQR && status.exists) {
      console.log(`[/api/whatsapp/session] 📱 Estado requiere QR: ${status.status}`);
      
      // Si es STARTING, esperar un poco
      if (status.status === 'STARTING') {
        console.log(`[/api/whatsapp/session] ⏳ Esperando inicialización (2s)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      try {
        console.log('[/api/whatsapp/session] 🔍 Obteniendo QR de sesión...');
        const qrData = await getSessionQR(sessionName, organizationId);
        const qrValue = qrData?.value || qrData?.data || null;
        
        if (qrValue && typeof qrValue === 'string' && qrValue.length > 20) {
          console.log(`[/api/whatsapp/session] ✅ QR obtenido: ${qrValue.length} caracteres`);
          
          return NextResponse.json({
            success: true,
            status: 'SCAN_QR',
            connected: false,
            session: sessionName,
            qr: qrValue,
            expiresIn: 60
          });
        } else {
          console.warn(`[/api/whatsapp/session] ⚠️ QR vacío o inválido:`, {
            hasValue: !!qrValue,
            valueType: typeof qrValue,
            valueLength: qrValue?.length || 0
          });
        }
      } catch (qrError: any) {
        console.warn(`[/api/whatsapp/session] ⚠️ Error obteniendo QR:`, {
          message: qrError.message,
          stack: qrError.stack
        });
      }
      
      // Si no se pudo obtener QR, devolver estado sin QR
      return NextResponse.json({
        success: true,
        status: 'STARTING',
        connected: false,
        session: sessionName,
        qr: null,
        message: 'Sesión iniciando. Recarga en unos segundos para obtener el QR.'
      });
    }

    // 6. CASO: Sesión FAILED, STOPPED, ERROR - Reiniciar de inmediato
    if (['FAILED', 'STOPPED', 'ERROR'].includes(status.status) && status.exists) {
      console.log(`[/api/whatsapp/session] ⚠️ Sesión en estado ${status.status}, reiniciando de inmediato...`);
      
      try {
        console.log('[/api/whatsapp/session] 🔄 Iniciando sesión...');
        await startSession(sessionName, organizationId);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('[/api/whatsapp/session] 🔍 Verificando nuevo estado...');
        const newStatus = await getSessionStatus(sessionName, organizationId);
        console.log(`[/api/whatsapp/session] 📊 Nuevo estado después de reinicio: ${newStatus.status}`);
        
        // Si está conectada después de reiniciar
        if (newStatus.status === 'WORKING') {
          const phone = newStatus.me?.id?.split('@')[0] || null;
          return NextResponse.json({
            success: true,
            status: 'WORKING',
            connected: true,
            session: sessionName,
            phone
          });
        }
        
        // Si necesita QR después de reiniciar
        if (['SCAN_QR', 'SCAN_QR_CODE', 'STARTING'].includes(newStatus.status)) {
          try {
            console.log('[/api/whatsapp/session] 🔍 Obteniendo QR después de reinicio...');
            const qrData = await getSessionQR(sessionName, organizationId);
            const qrValue = qrData?.value || qrData?.data || null;
            
            if (qrValue && typeof qrValue === 'string' && qrValue.length > 20) {
              console.log(`[/api/whatsapp/session] ✅ QR obtenido después de reinicio: ${qrValue.length} caracteres`);
              return NextResponse.json({
                success: true,
                status: 'SCAN_QR',
                connected: false,
                session: sessionName,
                qr: qrValue,
                expiresIn: 60,
                message: 'Sesión reiniciada. Escanea el código QR.'
              });
            }
          } catch (qrError: any) {
            console.warn(`[/api/whatsapp/session] ⚠️ Error obteniendo QR después de reinicio:`, {
              message: qrError.message,
              stack: qrError.stack
            });
          }
          
          // QR no disponible aún, pero sesión iniciando
          return NextResponse.json({
            success: true,
            status: 'STARTING',
            connected: false,
            session: sessionName,
            qr: null,
            message: 'Sesión reiniciada. Espera unos segundos para el QR.'
          });
        }
        
        // Si sigue en FAILED después de reiniciar, necesitamos eliminar y recrear
        if (newStatus.status === 'FAILED') {
          console.log(`[/api/whatsapp/session] ❌ Sesión sigue FAILED, eliminando y recreando...`);
          try {
            const { url, key } = await (await import('@/lib/waha-sessions')).getWahaConfig(organizationId);
            console.log('[/api/whatsapp/session] 🔍 Configuración WAHA obtenida para eliminar sesión');
            
            // Eliminar sesión con timeout
            console.log('[/api/whatsapp/session] 🗑️ Eliminando sesión de WAHA...');
            const deleteResponse = await fetchWithTimeout(
              `${url}/api/sessions/${sessionName}`,
              {
                method: 'DELETE',
                headers: { 'X-Api-Key': key }
              },
              10000
            );
            
            if (!deleteResponse.ok) {
              const errorText = await deleteResponse.text().catch(() => 'Error desconocido');
              console.error('[/api/whatsapp/session] ❌ WAHA error eliminando sesión:', {
                status: deleteResponse.status,
                statusText: deleteResponse.statusText,
                body: errorText
              });
              // Continuar de todas formas, puede que la sesión ya no exista
            } else {
              console.log('[/api/whatsapp/session] ✅ Sesión eliminada de WAHA');
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Crear nueva
            console.log('[/api/whatsapp/session] 🔄 Creando nueva sesión...');
            await createOrganizationSession(organizationId);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            return NextResponse.json({
              success: true,
              status: 'STARTING',
              connected: false,
              session: sessionName,
              message: 'Sesión recreada. Recarga para obtener el QR.'
            });
          } catch (recreateError: any) {
            console.error('[/api/whatsapp/session] ❌ Error recreando sesión:', {
              message: recreateError.message,
              stack: recreateError.stack
            });
            return NextResponse.json({
              success: false,
              error: `Error recreando sesión: ${recreateError.message}`,
              details: process.env.NODE_ENV === 'development' ? recreateError.stack : undefined
            }, { status: 500 });
          }
        }
        
        // Otro estado
        return NextResponse.json({
          success: true,
          status: newStatus.status || 'STARTING',
          connected: false,
          session: sessionName,
          message: `Sesión en estado ${newStatus.status}. Recarga para actualizar.`
        });
        
      } catch (restartError: any) {
        console.error(`[/api/whatsapp/session] ❌ Error reiniciando:`, {
          message: restartError.message,
          stack: restartError.stack,
          name: restartError.name
        });
        return NextResponse.json({
          success: false,
          status: 'ERROR',
          error: `Error al reiniciar: ${restartError.message}`,
          details: process.env.NODE_ENV === 'development' ? restartError.stack : undefined
        }, { status: 500 });
      }
    }

    // 7. CASO: Sesión no existe - Crear nueva
    console.log(`[/api/whatsapp/session] 🔄 Sesión requiere creación: exists=${status.exists}`);
    
    try {
      console.log(`[/api/whatsapp/session] 📝 Creando nueva sesión...`);
      await createOrganizationSession(organizationId);
      
      // Esperar y verificar
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('[/api/whatsapp/session] 🔍 Verificando estado después de crear...');
      const newStatus = await getSessionStatus(sessionName, organizationId);
      console.log(`[/api/whatsapp/session] 📊 Nuevo estado: ${newStatus.status}`);
      
      // Si está conectada
      if (newStatus.status === 'WORKING') {
        const phone = newStatus.me?.id?.split('@')[0] || null;
        return NextResponse.json({
          success: true,
          status: 'WORKING',
          connected: true,
          session: sessionName,
          phone
        });
      }
      
      // Si necesita QR
      if (['SCAN_QR', 'SCAN_QR_CODE', 'STARTING'].includes(newStatus.status)) {
        try {
          console.log('[/api/whatsapp/session] 🔍 Obteniendo QR después de crear sesión...');
          const qrData = await getSessionQR(sessionName, organizationId);
          const qrValue = qrData?.value || qrData?.data || null;
          
          if (qrValue && typeof qrValue === 'string' && qrValue.length > 20) {
            console.log(`[/api/whatsapp/session] ✅ QR obtenido después de crear: ${qrValue.length} caracteres`);
            return NextResponse.json({
              success: true,
              status: 'SCAN_QR',
              connected: false,
              session: sessionName,
              qr: qrValue,
              expiresIn: 60,
              message: 'Sesión iniciada. Escanea el código QR.'
            });
          }
        } catch (qrError: any) {
          console.warn(`[/api/whatsapp/session] ⚠️ Error obteniendo QR después de crear:`, {
            message: qrError.message,
            stack: qrError.stack
          });
        }
      }
      
      // Estado desconocido
      return NextResponse.json({
        success: true,
        status: newStatus.status || 'STARTING',
        connected: false,
        session: sessionName,
        message: `Sesión en estado ${newStatus.status || 'STARTING'}. Recarga para actualizar.`
      });
      
    } catch (createError: any) {
      console.error(`[/api/whatsapp/session] ❌ Error creando/reiniciando sesión:`, {
        message: createError.message,
        stack: createError.stack,
        name: createError.name
      });
      return NextResponse.json({
        success: false,
        status: 'ERROR',
        error: `Error al iniciar sesión: ${createError.message}`,
        details: process.env.NODE_ENV === 'development' ? createError.stack : undefined
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[/api/whatsapp/session] ❌ Error general en GET:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json({
      success: false,
      error: error.message || 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/session
 * Acciones: logout, change_number, reconnect
 */
export async function POST(request: NextRequest) {
  try {
    console.log('\n=== [WhatsApp Session POST] Iniciando ===');
    
    const { organizationId, userId } = await getTenantContext(request);
    
    if (!organizationId) {
      console.error('[WhatsApp Session POST] ❌ No hay organizationId');
      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener la organización del usuario'
      }, { status: 400 });
    }

    const body = await request.json().catch((e) => {
      console.error('[WhatsApp Session POST] ❌ Error parseando body:', e);
      return {};
    });
    const { action } = body;
    
    console.log(`[WhatsApp Session POST] 🎬 Acción: ${action}`);
    console.log(`[WhatsApp Session POST] 🏢 Organization: ${organizationId}`);

    if (!action) {
      console.error('[WhatsApp Session POST] ❌ No se proporcionó acción');
      return NextResponse.json({
        success: false,
        error: 'Acción no especificada'
      }, { status: 400 });
    }

    const sessionName = await getOrganizationSession(organizationId).catch((e) => {
      console.error('[WhatsApp Session POST] ❌ Error obteniendo session name:', e);
      throw e;
    });
    console.log(`[WhatsApp Session POST] 📝 Session: ${sessionName}`);

    // LOGOUT o CHANGE_NUMBER
    if (action === 'logout' || action === 'change_number') {
      console.log(`[WhatsApp Session POST] 🔓 Ejecutando ${action}...`);
      
      try {
        // 1. Obtener configuración de WAHA
        console.log('[WhatsApp Session POST] 1. Obteniendo configuración WAHA...');
        const { url, key } = await (await import('@/lib/waha-sessions')).getWahaConfig(organizationId);
        console.log('[WhatsApp Session POST] ✅ Config obtenida');
        
        // 2. Hacer logout de la sesión actual
        console.log('[WhatsApp Session POST] 2. Haciendo logout...');
        try {
          await logoutSession(sessionName, organizationId);
          console.log('[WhatsApp Session POST] ✅ Logout exitoso');
        } catch (logoutError: any) {
          console.warn('[WhatsApp Session POST] ⚠️ Error en logout (ignorando):', logoutError.message);
        }
        
        // 3. Esperar un momento
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 4. Stop de la sesión
        console.log('[WhatsApp Session POST] 3. Deteniendo sesión...');
        try {
          const stopResponse = await fetchWithTimeout(
            `${url}/api/sessions/${sessionName}/stop`,
            {
              method: 'POST',
              headers: { 'X-Api-Key': key }
            },
            10000
          );
          
          if (!stopResponse.ok) {
            const errorText = await stopResponse.text().catch(() => 'Error desconocido');
            console.error('[WhatsApp Session POST] ❌ WAHA error deteniendo sesión:', {
              status: stopResponse.status,
              statusText: stopResponse.statusText,
              body: errorText
            });
          } else {
            console.log('[WhatsApp Session POST] ✅ Sesión detenida');
          }
        } catch (stopError: any) {
          console.warn('[WhatsApp Session POST] ⚠️ Error deteniendo (ignorando):', {
            message: stopError.message,
            stack: stopError.stack
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 5. Eliminar la sesión
        console.log('[WhatsApp Session POST] 4. Eliminando sesión...');
        try {
          const deleteResponse = await fetchWithTimeout(
            `${url}/api/sessions/${sessionName}`,
            {
              method: 'DELETE',
              headers: { 'X-Api-Key': key }
            },
            10000
          );
          
          if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text().catch(() => 'Error desconocido');
            console.error('[WhatsApp Session POST] ❌ WAHA error eliminando sesión:', {
              status: deleteResponse.status,
              statusText: deleteResponse.statusText,
              body: errorText
            });
          } else {
            console.log('[WhatsApp Session POST] ✅ Sesión eliminada');
          }
        } catch (deleteError: any) {
          console.warn('[WhatsApp Session POST] ⚠️ Error eliminando (ignorando):', {
            message: deleteError.message,
            stack: deleteError.stack
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 6. Crear nueva sesión
        console.log('[WhatsApp Session POST] 5. Creando nueva sesión...');
        await createOrganizationSession(organizationId);
        console.log('[WhatsApp Session POST] ✅ Sesión creada');
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 7. Obtener QR
        console.log('[WhatsApp Session POST] 6. Obteniendo QR...');
        try {
          const qrData = await getSessionQR(sessionName, organizationId);
          const qrValue = qrData?.value || qrData?.data || null;
          
          if (qrValue && typeof qrValue === 'string' && qrValue.length > 20) {
            console.log(`[WhatsApp Session POST] ✅ QR obtenido: ${qrValue.length} caracteres`);
            
            // TODO: Actualizar whatsapp_connected en BD (requiere migración de tipos)
            
            return NextResponse.json({
              success: true,
              status: 'SCAN_QR',
              connected: false,
              session: sessionName,
              qr: qrValue,
              message: action === 'logout' 
                ? 'Sesión cerrada correctamente. Escanea el QR para reconectar.' 
                : 'Escanea el QR con el nuevo número.'
            });
          } else {
            console.warn(`[WhatsApp Session POST] ⚠️ QR no disponible aún`);
            return NextResponse.json({
              success: true,
              status: 'STARTING',
              connected: false,
              session: sessionName,
              qr: null,
              message: 'Sesión reiniciada. Recarga la página en unos segundos para obtener el QR.'
            });
          }
        } catch (qrError: any) {
          console.error('[WhatsApp Session POST] ❌ Error obteniendo QR:', qrError.message);
          return NextResponse.json({
            success: true,
            status: 'STARTING',
            connected: false,
            session: sessionName,
            qr: null,
            message: 'Sesión reiniciada pero QR no disponible aún. Recarga la página en unos segundos.'
          });
        }
        
      } catch (error: any) {
        console.error(`[WhatsApp Session POST] ❌ Error crítico en ${action}:`, error.message, error.stack);
        return NextResponse.json({
          success: false,
          error: `Error en ${action}: ${error.message}`,
          details: error.stack
        }, { status: 500 });
      }
    }

    // UPDATE_WEBHOOK - Actualizar webhook con soporte multimedia
    if (action === 'update_webhook') {
      console.log(`[/api/whatsapp/session] 🔄 Actualizando webhook con soporte multimedia...`);
      try {
        await updateSessionWebhook(sessionName, organizationId);
        return NextResponse.json({
          success: true,
          message: 'Webhook actualizado con soporte multimedia'
        });
      } catch (error: any) {
        console.error(`[/api/whatsapp/session] ❌ Error actualizando webhook:`, {
          message: error.message,
          stack: error.stack
        });
        return NextResponse.json({
          success: false,
          error: `Error actualizando webhook: ${error.message}`,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
      }
    }

    // RECONNECT
    if (action === 'reconnect') {
      console.log(`[/api/whatsapp/session] 🔄 Reconnect solicitado`);
      try {
        await startSession(sessionName, organizationId);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return NextResponse.json({
          success: true,
          message: 'Sesión reiniciada. Recarga para obtener el QR.'
        });
      } catch (reconnectError: any) {
        console.error(`[/api/whatsapp/session] ❌ Error reconectando:`, {
          message: reconnectError.message,
          stack: reconnectError.stack
        });
        return NextResponse.json({
          success: false,
          error: `Error al reconectar: ${reconnectError.message}`,
          details: process.env.NODE_ENV === 'development' ? reconnectError.stack : undefined
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Acción no válida'
    }, { status: 400 });

  } catch (error: any) {
    console.error('[/api/whatsapp/session] ❌ Error general en POST:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json({
      success: false,
      error: error.message || 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

