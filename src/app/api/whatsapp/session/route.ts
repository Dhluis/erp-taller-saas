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
 * GET /api/whatsapp/session
 * Obtiene el estado actual de la sesión de WhatsApp para la organización
 */
export async function GET(request: NextRequest) {
  try {
    console.log('\n=== [WhatsApp Session GET] Iniciando ===');
    
    // 1. Obtener contexto del usuario
    const { organizationId, userId } = await getTenantContext(request);
    
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener la organización del usuario'
      }, { status: 400 });
    }

    console.log(`[WhatsApp Session] 🏢 Organization ID: ${organizationId}`);
    console.log(`[WhatsApp Session] 👤 User ID: ${userId}`);

    // 2. Obtener o crear nombre de sesión
    const sessionName = await getOrganizationSession(organizationId);
    console.log(`[WhatsApp Session] 📝 Session Name: ${sessionName}`);

    // 3. Obtener estado de la sesión
    const status = await getSessionStatus(sessionName, organizationId);
    console.log(`[WhatsApp Session] 📊 Estado de sesión:`, {
      exists: status.exists,
      status: status.status,
      error: status.error
    });

    // 4. CASO: Sesión conectada (WORKING)
    if (status.status === 'WORKING') {
      const phone = status.me?.id?.split('@')[0] || status.me?.phone || null;
      console.log(`[WhatsApp Session] ✅ Sesión conectada: ${phone || 'N/A'}`);
      
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
      console.log(`[WhatsApp Session] 📱 Estado requiere QR: ${status.status}`);
      
      // Si es STARTING, esperar un poco
      if (status.status === 'STARTING') {
        console.log(`[WhatsApp Session] ⏳ Esperando inicialización (2s)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      try {
        const qrData = await getSessionQR(sessionName, organizationId);
        const qrValue = qrData?.value || qrData?.data || null;
        
        if (qrValue && typeof qrValue === 'string' && qrValue.length > 20) {
          console.log(`[WhatsApp Session] ✅ QR obtenido: ${qrValue.length} caracteres`);
          
          return NextResponse.json({
            success: true,
            status: 'SCAN_QR',
            connected: false,
            session: sessionName,
            qr: qrValue,
            expiresIn: 60
          });
        } else {
          console.warn(`[WhatsApp Session] ⚠️ QR vacío o inválido`);
        }
      } catch (qrError: any) {
        console.warn(`[WhatsApp Session] ⚠️ Error obteniendo QR:`, qrError.message);
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
      console.log(`[WhatsApp Session] ⚠️ Sesión en estado ${status.status}, reiniciando de inmediato...`);
      
      try {
        await startSession(sessionName, organizationId);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const newStatus = await getSessionStatus(sessionName, organizationId);
        console.log(`[WhatsApp Session] 📊 Nuevo estado después de reinicio: ${newStatus.status}`);
        
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
            const qrData = await getSessionQR(sessionName, organizationId);
            const qrValue = qrData?.value || qrData?.data || null;
            
            if (qrValue && typeof qrValue === 'string' && qrValue.length > 20) {
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
            console.warn(`[WhatsApp Session] ⚠️ Error obteniendo QR:`, qrError.message);
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
          console.log(`[WhatsApp Session] ❌ Sesión sigue FAILED, eliminando y recreando...`);
          const { url, key } = await (await import('@/lib/waha-sessions')).getWahaConfig(organizationId);
          
          // Eliminar sesión
          await fetch(`${url}/api/sessions/${sessionName}`, {
            method: 'DELETE',
            headers: { 'X-Api-Key': key }
          });
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Crear nueva
          await createOrganizationSession(organizationId);
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          return NextResponse.json({
            success: true,
            status: 'STARTING',
            connected: false,
            session: sessionName,
            message: 'Sesión recreada. Recarga para obtener el QR.'
          });
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
        console.error(`[WhatsApp Session] ❌ Error reiniciando:`, restartError.message);
        return NextResponse.json({
          success: false,
          status: 'ERROR',
          error: `Error al reiniciar: ${restartError.message}`
        }, { status: 500 });
      }
    }

    // 7. CASO: Sesión no existe - Crear nueva
    console.log(`[WhatsApp Session] 🔄 Sesión requiere creación: exists=${status.exists}`);
    
    try {
      console.log(`[WhatsApp Session] 📝 Creando nueva sesión...`);
      await createOrganizationSession(organizationId);
      
      // Esperar y verificar
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newStatus = await getSessionStatus(sessionName, organizationId);
      console.log(`[WhatsApp Session] 📊 Nuevo estado: ${newStatus.status}`);
      
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
          const qrData = await getSessionQR(sessionName, organizationId);
          const qrValue = qrData?.value || qrData?.data || null;
          
          if (qrValue && typeof qrValue === 'string' && qrValue.length > 20) {
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
          console.warn(`[WhatsApp Session] ⚠️ Error obteniendo QR después de reinicio:`, qrError.message);
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
      console.error(`[WhatsApp Session] ❌ Error creando/reiniciando sesión:`, createError.message);
      return NextResponse.json({
        success: false,
        status: 'ERROR',
        error: `Error al iniciar sesión: ${createError.message}`
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[WhatsApp Session] ❌ Error general:', error);
    return NextResponse.json({
      success: false,
      error: error.message
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
          await fetch(`${url}/api/sessions/${sessionName}/stop`, {
            method: 'POST',
            headers: { 'X-Api-Key': key }
          });
          console.log('[WhatsApp Session POST] ✅ Sesión detenida');
        } catch (stopError: any) {
          console.warn('[WhatsApp Session POST] ⚠️ Error deteniendo (ignorando):', stopError.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 5. Eliminar la sesión
        console.log('[WhatsApp Session POST] 4. Eliminando sesión...');
        try {
          await fetch(`${url}/api/sessions/${sessionName}`, {
            method: 'DELETE',
            headers: { 'X-Api-Key': key }
          });
          console.log('[WhatsApp Session POST] ✅ Sesión eliminada');
        } catch (deleteError: any) {
          console.warn('[WhatsApp Session POST] ⚠️ Error eliminando (ignorando):', deleteError.message);
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
      console.log(`[WhatsApp Session] 🔄 Actualizando webhook con soporte multimedia...`);
      try {
        await updateSessionWebhook(sessionName, organizationId);
        return NextResponse.json({
          success: true,
          message: 'Webhook actualizado con soporte multimedia'
        });
      } catch (error: any) {
        console.error(`[WhatsApp Session] ❌ Error actualizando webhook:`, error);
        return NextResponse.json({
          success: false,
          error: `Error actualizando webhook: ${error.message}`
        }, { status: 500 });
      }
    }

    // RECONNECT
    if (action === 'reconnect') {
      console.log(`[WhatsApp Session] 🔄 Reconnect solicitado`);
      try {
        await startSession(sessionName, organizationId);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return NextResponse.json({
          success: true,
          message: 'Sesión reiniciada. Recarga para obtener el QR.'
        });
      } catch (reconnectError: any) {
        return NextResponse.json({
          success: false,
          error: `Error al reconectar: ${reconnectError.message}`
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Acción no válida'
    }, { status: 400 });

  } catch (error: any) {
    console.error('[WhatsApp Session POST] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

