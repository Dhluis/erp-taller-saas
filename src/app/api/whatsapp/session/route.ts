import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { 
  getOrganizationSession, 
  getSessionStatus, 
  getSessionQR,
  createOrganizationSession,
  startSession,
  logoutSession
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
      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener la organización del usuario'
      }, { status: 400 });
    }

    const body = await request.json();
    const { action } = body;
    
    console.log(`[WhatsApp Session] 🎬 Acción: ${action}`);
    console.log(`[WhatsApp Session] 🏢 Organization: ${organizationId}`);

    const sessionName = await getOrganizationSession(organizationId);
    console.log(`[WhatsApp Session] 📝 Session: ${sessionName}`);

    // LOGOUT o CHANGE_NUMBER
    if (action === 'logout' || action === 'change_number') {
      console.log(`[WhatsApp Session] 🔓 Ejecutando ${action}...`);
      
      try {
        // 1. Obtener estado actual
        const currentStatus = await getSessionStatus(sessionName, organizationId);
        console.log(`1. Estado actual:`, {
          status: currentStatus.status,
          exists: currentStatus.exists,
          error: currentStatus.error
        });
        
        // 2. Si NO está conectado, reiniciar directamente para obtener nuevo QR
        if (currentStatus.status !== 'WORKING') {
          console.log(`2. No está conectado (${currentStatus.status}), reiniciando para nuevo QR...`);
          
          // Eliminar y recrear sesión
          const { url, key } = await (await import('@/lib/waha-sessions')).getWahaConfig(organizationId);
          
          try {
            await fetch(`${url}/api/sessions/${sessionName}`, {
              method: 'DELETE',
              headers: { 'X-Api-Key': key }
            });
            console.log(`3. Sesión eliminada`);
          } catch (deleteError) {
            console.warn(`3. Error eliminando (puede no existir):`, deleteError);
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Crear nueva
          await createOrganizationSession(organizationId);
          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log(`4. Sesión recreada`);
          
          // Obtener QR
          try {
            const qrData = await getSessionQR(sessionName, organizationId);
            const qrValue = qrData?.value || qrData?.data || null;
            
            if (qrValue && typeof qrValue === 'string' && qrValue.length > 20) {
              console.log(`5. QR obtenido: ${qrValue.length} caracteres`);
              return NextResponse.json({
                success: true,
                status: 'SCAN_QR',
                connected: false,
                session: sessionName,
                qr: qrValue,
                message: 'Sesión reiniciada. Escanea el nuevo QR.'
              });
            }
          } catch (qrError: any) {
            console.warn(`5. Error obteniendo QR:`, qrError.message);
          }
          
          return NextResponse.json({
            success: true,
            status: 'STARTING',
            connected: false,
            session: sessionName,
            message: 'Sesión reiniciada. Recarga en unos segundos para el QR.'
          });
        }
        
        // 3. Hacer logout si está conectado
        console.log(`2. Haciendo logout...`);
        await logoutSession(sessionName, organizationId);
        
        // Esperar
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar
        const afterLogout = await getSessionStatus(sessionName, organizationId);
        console.log(`3. Estado después de logout: ${afterLogout.status}`);
        
        // Si sigue WORKING, forzar stop y start
        if (afterLogout.status === 'WORKING') {
          console.log(`4. Forzando stop y start...`);
          const { url, key } = await (await import('@/lib/waha-sessions')).getWahaConfig(organizationId);
          
          // Stop
          await fetch(`${url}/api/sessions/${sessionName}/stop`, {
            method: 'POST',
            headers: { 'X-Api-Key': key }
          });
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Start
          await startSession(sessionName, organizationId);
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.log(`4. Reiniciando sesión...`);
          await startSession(sessionName, organizationId);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        // 3. Obtener QR
        console.log(`5. Obteniendo QR...`);
        const qrData = await getSessionQR(sessionName, organizationId);
        const qrValue = qrData?.value || qrData?.data || null;
        
        if (qrValue && typeof qrValue === 'string' && qrValue.length > 20) {
          console.log(`6. QR obtenido: ${qrValue.length} caracteres`);
          return NextResponse.json({
            success: true,
            status: 'SCAN_QR',
            connected: false,
            session: sessionName,
            qr: qrValue,
            message: action === 'logout' ? 'Sesión cerrada. Escanea el QR para reconectar.' : 'Escanea el QR con el nuevo número.'
          });
        } else {
          console.warn(`6. QR no disponible aún`);
          return NextResponse.json({
            success: true,
            status: 'STARTING',
            connected: false,
            session: sessionName,
            qr: null,
            message: 'Sesión reiniciada. Recarga en unos segundos para obtener el QR.'
          });
        }
        
      } catch (logoutError: any) {
        console.error(`[WhatsApp Session] ❌ Error en ${action}:`, logoutError.message);
        return NextResponse.json({
          success: false,
          error: `Error en ${action}: ${logoutError.message}`
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

