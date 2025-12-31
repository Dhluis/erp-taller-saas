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
  updateSessionWebhook,
  updateWebhookForOrganization,
  verifyWebhookConfiguration
} from '@/lib/waha-sessions';

/**
 * Cache simple para QRs por sesión
 * Evita obtener el QR repetidamente durante el polling
 */
const qrCache = new Map<string, { qr: string; timestamp: number }>();
const QR_CACHE_TTL = 50000; // 50 segundos (los QRs de WhatsApp expiran en ~60s, dejamos margen)

/**
 * Obtener QR con cache
 */
async function getCachedQR(sessionName: string, organizationId: string): Promise<string | null> {
  const cacheKey = `${sessionName}_${organizationId}`;
  const cached = qrCache.get(cacheKey);
  
  // Si tenemos un QR cacheado y no ha expirado, retornarlo
  if (cached && (Date.now() - cached.timestamp) < QR_CACHE_TTL) {
    console.log(`[/api/whatsapp/session] 💾 QR obtenido de cache (edad: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
    return cached.qr;
  }
  
  // Obtener nuevo QR
  console.log(`[/api/whatsapp/session] 🔍 Obteniendo nuevo QR de WAHA...`);
  try {
    const qrData = await getSessionQR(sessionName, organizationId);
    const qrValue = qrData?.value || qrData?.data || null;
    
    if (qrValue && typeof qrValue === 'string' && qrValue.length > 20) {
      // Guardar en cache
      qrCache.set(cacheKey, { qr: qrValue, timestamp: Date.now() });
      console.log(`[/api/whatsapp/session] ✅ QR obtenido y cacheado (${qrValue.length} caracteres)`);
      return qrValue;
    }
  } catch (error: any) {
    console.warn(`[/api/whatsapp/session] ⚠️ Error obteniendo QR:`, error.message);
    // Si hay error pero tenemos cache antiguo, retornarlo (mejor que nada)
    if (cached) {
      console.log(`[/api/whatsapp/session] 💾 Usando QR cacheado aunque sea antiguo debido a error`);
      return cached.qr;
    }
  }
  
  return null;
}

/**
 * Limpiar cache de QR para una sesión
 */
function clearQRCache(sessionName: string, organizationId: string): void {
  const cacheKey = `${sessionName}_${organizationId}`;
  qrCache.delete(cacheKey);
  console.log(`[/api/whatsapp/session] 🗑️ Cache de QR limpiado para ${sessionName}`);
}

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
 * Helper para ejecutar operaciones con retry automático
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  operationName: string = 'Operation'
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[/api/whatsapp/session] 🔄 [Retry] ${operationName} - Intento ${attempt}/${maxRetries}`);
      const result = await operation();
      if (attempt > 1) {
        console.log(`[/api/whatsapp/session] ✅ [Retry] ${operationName} exitoso en intento ${attempt}`);
      }
      return result;
    } catch (error: any) {
      lastError = error;
      console.warn(`[/api/whatsapp/session] ⚠️ [Retry] ${operationName} falló en intento ${attempt}:`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`[/api/whatsapp/session] ⏳ [Retry] Esperando ${delayMs}ms antes de reintentar...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  console.error(`[/api/whatsapp/session] ❌ [Retry] ${operationName} falló después de ${maxRetries} intentos`);
  throw lastError;
}

/**
 * GET /api/whatsapp/session
 * Obtiene el estado actual de la sesión de WhatsApp para la organización
 * CON RETRY AUTOMÁTICO para manejar race conditions en primera carga
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

    // 2. Obtener o crear nombre de sesión CON RETRY
    let sessionName: string;
    try {
      console.log('[/api/whatsapp/session] 🔍 Obteniendo/creando nombre de sesión...');
      sessionName = await withRetry(
        () => getOrganizationSession(organizationId),
        3,
        1000,
        'getOrganizationSession'
      );
      console.log(`[/api/whatsapp/session] ✅ Session Name: ${sessionName}`);
    } catch (sessionError: any) {
      console.error('[/api/whatsapp/session] ❌ Error obteniendo sesión después de retries:', {
        message: sessionError.message,
        stack: sessionError.stack
      });
      return NextResponse.json({
        success: false,
        error: `Error obteniendo sesión: ${sessionError.message}`,
        details: process.env.NODE_ENV === 'development' ? sessionError.stack : undefined
      }, { status: 500 });
    }

    // 3. Obtener estado de la sesión CON RETRY
    let status;
    try {
      console.log('[/api/whatsapp/session] 🔍 Obteniendo estado de sesión...');
      status = await withRetry(
        () => getSessionStatus(sessionName, organizationId),
        3,
        1000,
        'getSessionStatus'
      );
      console.log(`[/api/whatsapp/session] 📊 Estado de sesión:`, {
        exists: status.exists,
        status: status.status,
        error: status.error
      });
    } catch (statusError: any) {
      console.error('[/api/whatsapp/session] ❌ Error obteniendo estado después de retries:', {
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
      
      // ✅ Limpiar cache de QR cuando está conectado (ya no necesitamos el QR)
      clearQRCache(sessionName, organizationId);
      
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
      
      // Si es STARTING, esperar un poco solo la primera vez (cuando no hay cache)
      const cacheKey = `${sessionName}_${organizationId}`;
      const cached = qrCache.get(cacheKey);
      if (status.status === 'STARTING' && !cached) {
        console.log(`[/api/whatsapp/session] ⏳ Estado STARTING sin cache, esperando inicialización (2s)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // ✅ Usar cache para evitar obtener QR repetidamente
      const qrValue = await getCachedQR(sessionName, organizationId);
      
      if (qrValue && typeof qrValue === 'string' && qrValue.length > 20) {
        console.log(`[/api/whatsapp/session] ✅ QR disponible: ${qrValue.length} caracteres`);
        
        return NextResponse.json({
          success: true,
          status: 'SCAN_QR',
          connected: false,
          session: sessionName,
          qr: qrValue,
          expiresIn: 60
        });
      } else {
        // Si no hay QR cacheado y no se pudo obtener, devolver estado sin QR
        console.warn(`[/api/whatsapp/session] ⚠️ QR no disponible`);
        return NextResponse.json({
          success: true,
          status: status.status || 'STARTING',
          connected: false,
          session: sessionName,
          qr: null,
          message: 'Sesión iniciando. Recarga en unos segundos para obtener el QR.'
        });
      }
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
          // ✅ Limpiar cache al reiniciar (necesitamos un QR nuevo)
          clearQRCache(sessionName, organizationId);
          
          // ✅ Usar cache (pero acabamos de limpiarlo, así que obtendrá uno nuevo)
          const qrValue = await getCachedQR(sessionName, organizationId);
          
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
            
            // ✅ Configurar webhook con Organization ID dinámico después de recrear sesión
            console.log(`[/api/whatsapp/session] 🔧 Configurando webhook para org: ${organizationId}`);
            try {
              await updateWebhookForOrganization(sessionName, organizationId);
              console.log(`[/api/whatsapp/session] ✅ Webhook actualizado con X-Organization-ID: ${organizationId}`);
            } catch (webhookError: any) {
              console.warn(`[/api/whatsapp/session] ⚠️ Error actualizando webhook (continuando):`, webhookError.message);
            }
            
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
      
      // ✅ Configurar webhook con Organization ID dinámico después de crear sesión
      console.log(`[/api/whatsapp/session] 🔧 Configurando webhook para org: ${organizationId}`);
      try {
        await updateWebhookForOrganization(sessionName, organizationId);
        console.log(`[/api/whatsapp/session] ✅ Webhook actualizado con X-Organization-ID: ${organizationId}`);
      } catch (webhookError: any) {
        console.warn(`[/api/whatsapp/session] ⚠️ Error actualizando webhook (continuando):`, webhookError.message);
      }
      
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
        // ✅ Limpiar cache al crear nueva sesión (necesitamos un QR nuevo)
        clearQRCache(sessionName, organizationId);
        
        // ✅ Usar cache (pero acabamos de limpiarlo, así que obtendrá uno nuevo)
        const qrValue = await getCachedQR(sessionName, organizationId);
        
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
        
        // ✅ SOLUCIÓN: Reutilizar sesión existente (NO eliminar, NO crear nueva)
        console.log('[WhatsApp Session POST] 🔄 Reiniciando sesión existente (sin eliminar)...');
        
        // 3. Reiniciar la MISMA sesión (para nuevo QR)
        try {
          await startSession(sessionName, organizationId);
          console.log('[WhatsApp Session POST] ✅ Sesión reiniciada');
        } catch (startError: any) {
          console.warn('[WhatsApp Session POST] ⚠️ Error reiniciando sesión (ignorando):', startError.message);
        }
        
        // 4. Actualizar webhook
        console.log(`[WhatsApp Session POST] 🔧 Configurando webhook para org: ${organizationId}`);
        try {
          await updateWebhookForOrganization(sessionName, organizationId);
          console.log(`[WhatsApp Session POST] ✅ Webhook actualizado con X-Organization-ID: ${organizationId}`);
        } catch (webhookError: any) {
          console.warn(`[WhatsApp Session POST] ⚠️ Error actualizando webhook (continuando):`, webhookError.message);
        }
        
        console.log('[WhatsApp Session POST] ✅ Sesión reutilizada:', sessionName);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 7. Obtener QR
        console.log('[WhatsApp Session POST] 6. Obteniendo QR...');
        // ✅ Limpiar cache después de logout/change_number (necesitamos un QR nuevo)
        clearQRCache(sessionName, organizationId);
        
        // ✅ Usar cache (pero acabamos de limpiarlo, así que obtendrá uno nuevo)
        const qrValue = await getCachedQR(sessionName, organizationId);
        
        if (qrValue && typeof qrValue === 'string' && qrValue.length > 20) {
          console.log(`[WhatsApp Session POST] ✅ QR obtenido: ${qrValue.length} caracteres`);
          
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
        await updateWebhookForOrganization(sessionName, organizationId);
        console.log(`[/api/whatsapp/session] ✅ Webhook actualizado con X-Organization-ID: ${organizationId}`);
        return NextResponse.json({
          success: true,
          message: 'Webhook actualizado con soporte multimedia y Organization ID dinámico'
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

    // FORCE_UPDATE_WEBHOOK - Forzar actualización del webhook (útil para migración)
    if (action === 'force_update_webhook') {
      console.log(`[/api/whatsapp/session] 🔧 Forzando actualización de webhook para org: ${organizationId}`);
      try {
        await updateWebhookForOrganization(sessionName, organizationId);
        console.log(`[/api/whatsapp/session] ✅ Webhook actualizado con X-Organization-ID: ${organizationId}`);
        
        // Verificar después de actualizar
        const verification = await verifyWebhookConfiguration(sessionName, organizationId);
        
        return NextResponse.json({
          success: true,
          message: 'Webhook actualizado exitosamente',
          webhook: verification.webhook,
          isCorrect: verification.isCorrect,
          expectedOrgId: verification.expectedOrgId,
          actualOrgId: verification.actualOrgId
        });
      } catch (error: any) {
        console.error(`[/api/whatsapp/session] ❌ Error forzando actualización de webhook:`, {
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

    // VERIFY_WEBHOOK - Verificar configuración del webhook
    if (action === 'verify_webhook') {
      console.log(`[/api/whatsapp/session] 🔍 Verificando configuración de webhook para org: ${organizationId}`);
      try {
        const verification = await verifyWebhookConfiguration(sessionName, organizationId);
        console.log(`[/api/whatsapp/session] 📊 Verificación completada:`, {
          isConfigured: verification.isConfigured,
          isCorrect: verification.isCorrect,
          expectedOrgId: verification.expectedOrgId,
          actualOrgId: verification.actualOrgId
        });
        
        return NextResponse.json({
          success: true,
          webhook: verification.webhook,
          isConfigured: verification.isConfigured,
          isCorrect: verification.isCorrect,
          expectedOrgId: verification.expectedOrgId,
          actualOrgId: verification.actualOrgId
        });
      } catch (error: any) {
        console.error(`[/api/whatsapp/session] ❌ Error verificando webhook:`, {
          message: error.message,
          stack: error.stack
        });
        return NextResponse.json({
          success: false,
          error: `Error verificando webhook: ${error.message}`,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
      }
    }

    // RECONNECT
    if (action === 'reconnect') {
      console.log(`[/api/whatsapp/session] 🔄 Reconnect solicitado`);
      try {
        // ✅ Limpiar cache al reconectar (necesitamos un QR nuevo)
        clearQRCache(sessionName, organizationId);
        
        await startSession(sessionName, organizationId);
        
        // ✅ Actualizar webhook con Organization ID dinámico después de reconectar
        console.log(`[/api/whatsapp/session] 🔧 Configurando webhook para org: ${organizationId}`);
        try {
          await updateWebhookForOrganization(sessionName, organizationId);
          console.log(`[/api/whatsapp/session] ✅ Webhook actualizado con X-Organization-ID: ${organizationId}`);
        } catch (webhookError: any) {
          console.warn(`[/api/whatsapp/session] ⚠️ Error actualizando webhook (continuando):`, webhookError.message);
        }
        
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

    // RESTART
    if (action === 'restart') {
      console.log(`[/api/whatsapp/session] 🔄 Restart solicitado`);
      try {
        // ✅ Limpiar cache al reiniciar
        clearQRCache(sessionName, organizationId);
        
        await startSession(sessionName, organizationId);
        
        // ✅ Actualizar webhook con Organization ID dinámico después de reiniciar
        console.log(`[/api/whatsapp/session] 🔧 Configurando webhook para org: ${organizationId}`);
        try {
          await updateWebhookForOrganization(sessionName, organizationId);
          console.log(`[/api/whatsapp/session] ✅ Webhook actualizado con X-Organization-ID: ${organizationId}`);
        } catch (webhookError: any) {
          console.warn(`[/api/whatsapp/session] ⚠️ Error actualizando webhook (continuando):`, webhookError.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return NextResponse.json({
          success: true,
          message: 'Sesión reiniciada exitosamente'
        });
      } catch (restartError: any) {
        console.error(`[/api/whatsapp/session] ❌ Error reiniciando:`, {
          message: restartError.message,
          stack: restartError.stack
        });
        return NextResponse.json({
          success: false,
          error: `Error al reiniciar: ${restartError.message}`,
          details: process.env.NODE_ENV === 'development' ? restartError.stack : undefined
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

