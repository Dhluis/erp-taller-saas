import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { 
  getOrganizationSession, 
  getSessionStatus, 
  getSessionQR,
  logoutSession,
  createOrganizationSession,
  startSession,
  getWahaConfig
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
    let tenantContext;
    try {
      tenantContext = await getTenantContext(request);
    } catch (authError: any) {
      // Si el error es de autenticación, devolver 401
      if (authError.message?.includes('no autenticado') || 
          authError.message?.includes('Usuario no autenticado') ||
          authError.message?.includes('Perfil de usuario no encontrado')) {
        console.warn('[WhatsApp Session] ⚠️ Error de autenticación:', authError.message);
        return NextResponse.json({
          success: false,
          error: 'Usuario no autenticado'
        }, { status: 401 });
      }
      // Re-lanzar otros errores
      throw authError;
    }
    
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
      console.log(`[WhatsApp Session] 📱 Datos de conexión:`, {
        phone,
        name,
        me: status.me
      });

      // IMPORTANTE: Devolver en el nivel raíz, no dentro de data
      return NextResponse.json({
        success: true,
        status: 'WORKING',
        connected: true,
        session: sessionName,
        phone,
        name,
        sessionStatus: status.status,
        // También incluir en data para compatibilidad
        data: {
          status: 'connected',
          connected: true,
          phone,
          name,
          sessionStatus: 'WORKING'
        }
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

    // 7. Si la sesión está en estado FAILED o STOPPED, intentar reiniciarla
    if (status.status === 'FAILED' || status.status === 'STOPPED') {
      console.log(`[WhatsApp Session] 🔄 Sesión en estado ${status.status}, intentando reiniciar...`);
      try {
        await startSession(sessionName, organizationId);
        // Esperar un momento y verificar el estado nuevamente
        await new Promise(resolve => setTimeout(resolve, 2000));
        const newStatus = await getSessionStatus(sessionName, organizationId);
        
        if (newStatus.status === 'WORKING') {
          const phone = newStatus.me?.id?.split('@')[0] || newStatus.me?.phone || null;
          return NextResponse.json({
            success: true,
            status: 'WORKING',
            connected: true,
            session: sessionName,
            phone
          });
        }
        
        return NextResponse.json({
          success: true,
          status: newStatus.status || 'STARTING',
          connected: false,
          session: sessionName,
          message: `Sesión reiniciada, estado: ${newStatus.status || 'STARTING'}`
        });
      } catch (restartError: any) {
        console.error(`[WhatsApp Session] ❌ Error reiniciando sesión:`, restartError.message);
        return NextResponse.json({
          success: true,
          status: status.status,
          connected: false,
          session: sessionName,
          message: `Sesión en estado ${status.status}. Error al reiniciar: ${restartError.message}`,
          error: restartError.message
        });
      }
    }

    // 8. Otro estado (STOPPED, FAILED, UNKNOWN, etc.)
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
    
    // Normalizar estados que requieren configuración/QR a 'PENDING' para el frontend
    // Estos estados deben mostrar el botón "Vincular WhatsApp" para generar un nuevo QR
    const statesNeedingSetup = ['STOPPED', 'FAILED', 'UNKNOWN', 'NOT_FOUND', 'PENDING', 'NEEDS_SETUP'];
    const normalizedStatus = statesNeedingSetup.includes(currentStatus) ? 'PENDING' : currentStatus;
    
    console.log(`[WhatsApp Session] 📊 Estado normalizado:`, {
      original: currentStatus,
      normalized: normalizedStatus,
      needsSetup: statesNeedingSetup.includes(currentStatus)
    });
    
    return NextResponse.json({
      success: true,
      status: normalizedStatus,  // Normalizar a PENDING para el frontend
      originalStatus: currentStatus,  // Guardar el original para debug
      connected: false,
      session: sessionName,
      message: statesNeedingSetup.includes(currentStatus) 
        ? `Sesión requiere configuración. Estado original: ${currentStatus}. Haz clic en "Vincular WhatsApp" para generar un nuevo QR.`
        : `Estado: ${currentStatus}`,
      error: status?.error || undefined
    });

  } catch (error: any) {
    console.error('[WhatsApp Session] ❌ Error en GET:', error);
    
    // Detectar errores de autenticación
    if (error.message?.includes('no autenticado') || 
        error.message?.includes('Usuario no autenticado') ||
        error.message?.includes('Perfil de usuario no encontrado')) {
      return NextResponse.json({
        success: false,
        error: 'Usuario no autenticado'
      }, { status: 401 });
    }
    
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
    let tenantContext;
    try {
      tenantContext = await getTenantContext(request);
    } catch (authError: any) {
      // Si el error es de autenticación, devolver 401
      if (authError.message?.includes('no autenticado') || 
          authError.message?.includes('Usuario no autenticado') ||
          authError.message?.includes('Perfil de usuario no encontrado')) {
        console.warn('[WhatsApp Session] ⚠️ Error de autenticación:', authError.message);
        return NextResponse.json({
          success: false,
          error: 'Usuario no autenticado'
        }, { status: 401 });
      }
      // Re-lanzar otros errores
      throw authError;
    }
    
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
      console.log('=== LOGOUT/CHANGE_NUMBER ===');
      console.log(`[WhatsApp Session] 🔓 Acción: ${action} para organización: ${organizationId}`);
      
      // Obtener configuración WAHA
      const { url, key } = await getWahaConfig(organizationId);
      const sessionName = await getOrganizationSession(organizationId);
      
      console.log('1. Config:', { 
        url: url.substring(0, 50) + '...', 
        sessionName,
        hasKey: !!key,
        keyLength: key?.length || 0
      });
      
      // Primero verificar estado actual
      let statusBeforeData: any = null;
      try {
        const statusBefore = await fetch(`${url}/api/sessions/${sessionName}`, {
          headers: { 'X-Api-Key': key }
        });
        
        if (statusBefore.ok) {
          statusBeforeData = await statusBefore.json();
          console.log('2. Estado ANTES del logout:', {
            status: statusBeforeData.status,
            connected: statusBeforeData.status === 'WORKING',
            phone: statusBeforeData.me?.id || statusBeforeData.me?.phone || 'N/A'
          });
        } else {
          const errorText = await statusBefore.text();
          console.warn('2. Error obteniendo estado antes:', statusBefore.status, errorText);
        }
      } catch (statusError: any) {
        console.error('2. Excepción obteniendo estado antes:', statusError.message);
      }
      
      // Hacer logout
      const logoutUrl = `${url}/api/${sessionName}/auth/logout`;
      console.log('3. Llamando logout:', logoutUrl);
      
      const logoutResponse = await fetch(logoutUrl, {
        method: 'POST',
        headers: { 'X-Api-Key': key }
      });
      
      const logoutText = await logoutResponse.text();
      console.log('4. Respuesta logout:', {
        status: logoutResponse.status,
        statusText: logoutResponse.statusText,
        body: logoutText.substring(0, 200)
      });
      
      // Si logout falla, intentar con stop + start
      if (!logoutResponse.ok && logoutResponse.status !== 404) {
        console.log('5. Logout falló, intentando stop + start...');
        
        try {
          // Stop session
          const stopResponse = await fetch(`${url}/api/sessions/${sessionName}/stop`, {
            method: 'POST',
            headers: { 'X-Api-Key': key }
          });
          console.log('5a. Stop response:', stopResponse.status);
          
          // Esperar
          await new Promise(r => setTimeout(r, 2000));
          
          // Start session
          const startResponse = await fetch(`${url}/api/sessions/${sessionName}/start`, {
            method: 'POST',
            headers: { 'X-Api-Key': key }
          });
          console.log('5b. Start response:', startResponse.status);
        } catch (fallbackError: any) {
          console.error('5. Error en fallback stop+start:', fallbackError.message);
        }
      }
      
      // Actualizar BD - marcar como desconectado
      const supabase = getSupabaseServiceClient();
      try {
        // Actualizar usando cast para evitar problemas de tipos de TypeScript
        // La columna whatsapp_connected existe en la BD aunque no esté en los tipos generados
        const updateQuery = (supabase as any)
          .from('ai_agent_config')
          .update({ whatsapp_connected: false, updated_at: new Date().toISOString() })
          .eq('organization_id', organizationId);
        
        const { error: updateError } = await updateQuery;
        
        if (updateError) {
          console.warn('[WhatsApp Session] ⚠️ No se pudo actualizar whatsapp_connected:', updateError.message);
        } else {
          console.log('6. BD actualizada: whatsapp_connected = false');
        }
      } catch (updateError: any) {
        // Si la columna no existe, ignorar el error
        console.warn('[WhatsApp Session] ⚠️ Error actualizando whatsapp_connected:', updateError.message);
      }
      
      // Esperar a que WAHA procese
      await new Promise(r => setTimeout(r, 3000));
      console.log('7. Espera completada (3 segundos)');
      
      // Verificar estado después
      let statusAfterData: any = null;
      try {
        const statusAfter = await fetch(`${url}/api/sessions/${sessionName}`, {
          headers: { 'X-Api-Key': key }
        });
        
        if (statusAfter.ok) {
          statusAfterData = await statusAfter.json();
          console.log('8. Estado DESPUÉS del logout:', {
            status: statusAfterData.status,
            connected: statusAfterData.status === 'WORKING',
            phone: statusAfterData.me?.id || statusAfterData.me?.phone || 'N/A'
          });
        } else {
          const errorText = await statusAfter.text();
          console.warn('8. Error obteniendo estado después:', statusAfter.status, errorText);
        }
      } catch (statusError: any) {
        console.error('8. Excepción obteniendo estado después:', statusError.message);
      }
      
      // Si la sesión sigue conectada (WORKING), usar método más agresivo
      if (statusAfterData?.status === 'WORKING') {
        console.log('9. ⚠️ Sesión aún conectada después de logout, forzando desconexión...');
        
        try {
          // Método 1: Intentar stop + delete + create nueva sesión
          console.log('9a. Intentando stop de sesión...');
          const stopResponse = await fetch(`${url}/api/sessions/${sessionName}/stop`, {
            method: 'POST',
            headers: { 'X-Api-Key': key }
          });
          console.log('9a. Stop response:', stopResponse.status);
          
          await new Promise(r => setTimeout(r, 2000));
          
          // Método 2: Eliminar la sesión completamente
          console.log('9b. Eliminando sesión completamente...');
          const deleteResponse = await fetch(`${url}/api/sessions/${sessionName}`, {
            method: 'DELETE',
            headers: { 'X-Api-Key': key }
          });
          console.log('9b. Delete response:', deleteResponse.status);
          
          await new Promise(r => setTimeout(r, 2000));
          
          // Método 3: Crear nueva sesión
          console.log('9c. Creando nueva sesión...');
          const webhookUrl = process.env.NEXT_PUBLIC_APP_URL 
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`
            : 'https://erp-taller-saas.vercel.app/api/webhooks/whatsapp';
          
          const createResponse = await fetch(`${url}/api/sessions`, {
            method: 'POST',
            headers: {
              'X-Api-Key': key,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: sessionName,
              start: true,
              config: {
                webhooks: [{
                  url: webhookUrl,
                  events: ['message', 'message.any', 'session.status']
                }]
              }
            })
          });
          
          console.log('9c. Create response:', createResponse.status);
          
          // Esperar a que la nueva sesión se inicialice
          await new Promise(r => setTimeout(r, 3000));
          
          // Verificar estado de la nueva sesión
          const newStatusResponse = await fetch(`${url}/api/sessions/${sessionName}`, {
            headers: { 'X-Api-Key': key }
          });
          
          if (newStatusResponse.ok) {
            statusAfterData = await newStatusResponse.json();
            console.log('9d. Estado de nueva sesión:', {
              status: statusAfterData.status,
              connected: statusAfterData.status === 'WORKING'
            });
          }
        } catch (forceError: any) {
          console.error('9. Error en método forzado:', forceError.message);
        }
      }
      
      // Intentar obtener QR
      let qrData: any = null;
      const needsQR = !statusAfterData || 
                      statusAfterData.status === 'SCAN_QR' || 
                      statusAfterData.status === 'SCAN_QR_CODE' ||
                      statusAfterData.status === 'STARTING';
      
      if (needsQR) {
        try {
          const qrResponse = await fetch(`${url}/api/${sessionName}/auth/qr?format=raw`, {
            headers: { 'X-Api-Key': key }
          });
          
          if (qrResponse.ok) {
            qrData = await qrResponse.json();
            const qrValue = qrData.value || qrData.data || null;
            console.log('10. QR obtenido:', {
              hasValue: !!qrData?.value,
              hasData: !!qrData?.data,
              qrLength: qrValue?.length || 0
            });
            
            return NextResponse.json({
              success: true,
              status: statusAfterData?.status || 'SCAN_QR',
              connected: false,
              session: sessionName,
              qr: qrValue,
              expiresIn: 60,
              message: 'Escanea el QR para conectar nuevo número',
              debug: {
                statusBefore: statusBeforeData?.status || 'unknown',
                statusAfter: statusAfterData?.status || 'unknown',
                logoutStatus: logoutResponse.status,
                method: statusBeforeData?.status === 'WORKING' && statusAfterData?.status !== 'WORKING' ? 'forced' : 'normal'
              }
            });
          } else {
            const qrErrorText = await qrResponse.text();
            console.log('10. QR no disponible:', qrResponse.status, qrErrorText.substring(0, 200));
          }
        } catch (qrError: any) {
          console.log('10. Error obteniendo QR:', qrError.message);
        }
      } else {
        console.log('10. No se necesita QR, estado actual:', statusAfterData?.status);
      }
      
      // Si no se pudo obtener QR inmediatamente, devolver estado actual
      return NextResponse.json({
        success: true,
        status: statusAfterData?.status || 'SCAN_QR',
        connected: statusAfterData?.status === 'WORKING',
        session: sessionName,
        message: statusAfterData?.status === 'WORKING' 
          ? 'Sesión aún conectada. Intenta nuevamente.' 
          : 'Sesión cerrada. Recarga para ver el nuevo QR.',
        debug: {
          statusBefore: statusBeforeData?.status || 'unknown',
          statusAfter: statusAfterData?.status || 'unknown',
          logoutStatus: logoutResponse.status,
          method: statusBeforeData?.status === 'WORKING' && statusAfterData?.status !== 'WORKING' ? 'forced' : 'normal'
        }
      });
    }

    if (action === 'reconnect' || action === 'restart') {
      console.log(`[WhatsApp Session] 🔄 Reiniciando sesión: ${sessionName}`);
      
      // Primero verificar el estado actual de la sesión
      const currentStatus = await getSessionStatus(sessionName, organizationId);
      
      // Si la sesión está en SCAN_QR_CODE, simplemente devolver el QR actual
      if (currentStatus.status === 'SCAN_QR_CODE' || currentStatus.status === 'SCAN_QR') {
        console.log(`[WhatsApp Session] ℹ️ Sesión ya está esperando QR, obteniendo QR actual...`);
        try {
          const qr = await getSessionQR(sessionName, organizationId);
          const qrValue = qr.value || qr.data || null;
          
          return NextResponse.json({
            success: true,
            status: 'SCAN_QR',
            connected: false,
            session: sessionName,
            qr: qrValue,
            expiresIn: 60,
            message: 'Escanea el código QR para vincular WhatsApp.'
          });
        } catch (qrError: any) {
          console.warn(`[WhatsApp Session] ⚠️ Error obteniendo QR:`, qrError.message);
          // Continuar con el proceso de reinicio
        }
      }
      
      // Si la sesión está conectada, cerrarla primero
      if (currentStatus.status === 'WORKING') {
        console.log(`[WhatsApp Session] 🔓 Sesión conectada, cerrando primero...`);
        try {
          await logoutSession(sessionName, organizationId);
          // Esperar un momento para que se cierre
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verificar que se cerró correctamente
          const statusAfterLogout = await getSessionStatus(sessionName, organizationId);
          if (statusAfterLogout.status === 'WORKING') {
            console.warn(`[WhatsApp Session] ⚠️ Sesión aún conectada después de logout, forzando...`);
            // Intentar cerrar de nuevo
            await logoutSession(sessionName, organizationId);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (e) {
          console.warn(`[WhatsApp Session] ⚠️ Error cerrando sesión:`, e);
        }
      }
      
      // Crear/reiniciar sesión
      try {
        const newSessionName = await createOrganizationSession(organizationId);
        
        // Esperar un momento para que la sesión se inicialice
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar el estado antes de obtener QR
        const newStatus = await getSessionStatus(newSessionName, organizationId);
        
        // Solo obtener QR si la sesión está en estado que requiere QR
        if (newStatus.status === 'SCAN_QR_CODE' || newStatus.status === 'SCAN_QR' || newStatus.status === 'STARTING') {
          try {
            const qr = await getSessionQR(newSessionName, organizationId);
            const qrValue = qr.value || qr.data || null;
            
            return NextResponse.json({
              success: true,
              status: 'SCAN_QR',
              connected: false,
              session: newSessionName,
              qr: qrValue,
              expiresIn: 60,
              message: 'Sesión reiniciada. Escanea el código QR para vincular WhatsApp.'
            });
          } catch (qrError: any) {
            console.warn(`[WhatsApp Session] ⚠️ Error obteniendo QR:`, qrError.message);
            // Si no se puede obtener QR, devolver el estado actual
            return NextResponse.json({
              success: true,
              status: newStatus.status || 'STARTING',
              connected: false,
              session: newSessionName,
              message: `Sesión reiniciada. Estado: ${newStatus.status || 'STARTING'}`
            });
          }
        } else if (newStatus.status === 'WORKING') {
          // Si ya está conectada después de reiniciar
          const phone = newStatus.me?.id?.split('@')[0] || newStatus.me?.phone || null;
          return NextResponse.json({
            success: true,
            status: 'WORKING',
            connected: true,
            session: newSessionName,
            phone,
            message: 'Sesión ya conectada.'
          });
        } else {
          // Otro estado
          return NextResponse.json({
            success: true,
            status: newStatus.status || 'UNKNOWN',
            connected: false,
            session: newSessionName,
            message: `Sesión reiniciada. Estado: ${newStatus.status || 'UNKNOWN'}`
          });
        }
      } catch (createError: any) {
        // Si falla porque la sesión ya existe (422), verificar estado y obtener QR si es necesario
        if (createError.message?.includes('422') || createError.message?.includes('already exists')) {
          console.log(`[WhatsApp Session] ℹ️ Sesión ya existe, verificando estado...`);
          try {
            const existingStatus = await getSessionStatus(sessionName, organizationId);
            
            if (existingStatus.status === 'WORKING') {
              // Ya está conectada, devolver estado conectado
              const phone = existingStatus.me?.id?.split('@')[0] || existingStatus.me?.phone || null;
              return NextResponse.json({
                success: true,
                status: 'WORKING',
                connected: true,
                session: sessionName,
                phone,
                message: 'Sesión ya conectada.'
              });
            } else if (existingStatus.status === 'SCAN_QR_CODE' || existingStatus.status === 'SCAN_QR') {
              // Está esperando QR, obtenerlo
              const qr = await getSessionQR(sessionName, organizationId);
              const qrValue = qr.value || qr.data || null;
              
              return NextResponse.json({
                success: true,
                status: 'SCAN_QR',
                connected: false,
                session: sessionName,
                qr: qrValue,
                expiresIn: 60,
                message: 'Escanea el código QR para vincular WhatsApp.'
              });
            } else {
              // Otro estado
              return NextResponse.json({
                success: true,
                status: existingStatus.status || 'UNKNOWN',
                connected: false,
                session: sessionName,
                message: `Estado actual: ${existingStatus.status || 'UNKNOWN'}`
              });
            }
          } catch (statusError: any) {
            console.error(`[WhatsApp Session] ❌ Error verificando estado de sesión existente:`, statusError);
            throw createError; // Lanzar el error original
          }
        }
        throw createError;
      }
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Acción no válida. Use: logout, change_number, reconnect' 
    }, { status: 400 });

  } catch (error: any) {
    console.error('[WhatsApp Session] ❌ Error en POST:', error);
    
    // Detectar errores de autenticación
    if (error.message?.includes('no autenticado') || 
        error.message?.includes('Usuario no autenticado') ||
        error.message?.includes('Perfil de usuario no encontrado')) {
      return NextResponse.json({
        success: false,
        error: 'Usuario no autenticado'
      }, { status: 401 });
    }
    
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
    let tenantContext;
    try {
      tenantContext = await getTenantContext(request);
    } catch (authError: any) {
      // Si el error es de autenticación, devolver 401
      if (authError.message?.includes('no autenticado') || 
          authError.message?.includes('Usuario no autenticado') ||
          authError.message?.includes('Perfil de usuario no encontrado')) {
        console.warn('[WhatsApp Session] ⚠️ Error de autenticación:', authError.message);
        return NextResponse.json({
          success: false,
          error: 'Usuario no autenticado'
        }, { status: 401 });
      }
      // Re-lanzar otros errores
      throw authError;
    }
    
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
    
    // Detectar errores de autenticación
    if (error.message?.includes('no autenticado') || 
        error.message?.includes('Usuario no autenticado') ||
        error.message?.includes('Perfil de usuario no encontrado')) {
      return NextResponse.json({
        success: false,
        error: 'Usuario no autenticado'
      }, { status: 401 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error desconocido al desconectar número'
    }, { status: 500 });
  }
}
