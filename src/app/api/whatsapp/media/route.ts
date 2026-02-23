import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getWahaConfig } from '@/lib/waha-sessions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/whatsapp/media?url=<encoded_waha_url>
 * Proxy autenticado para archivos multimedia de WAHA.
 * WAHA sirve archivos con X-Api-Key, el browser no puede agregar ese header
 * directamente al cargar una imagen. Este proxy lo agrega por el cliente autenticado.
 */
export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await getTenantContext(request);
    if (!organizationId) {
      return new NextResponse('No autorizado', { status: 401 });
    }

    const rawUrl = request.nextUrl.searchParams.get('url');
    if (!rawUrl) {
      return new NextResponse('Parámetro url requerido', { status: 400 });
    }

    let decodedUrl: string;
    let parsedMedia: URL;
    try {
      decodedUrl = decodeURIComponent(rawUrl);
      parsedMedia = new URL(decodedUrl);
    } catch {
      return new NextResponse('URL inválida', { status: 400 });
    }

    // Seguridad: validar que la URL pertenece al host WAHA de la organización
    const { url: wahaApiUrl, key } = await getWahaConfig(organizationId);
    const wahaHost = new URL(wahaApiUrl).hostname;
    if (parsedMedia.hostname !== wahaHost) {
      console.warn('[Media Proxy] ⚠️ URL rechazada — host no corresponde a WAHA:', parsedMedia.hostname, '!==', wahaHost);
      return new NextResponse('URL no permitida', { status: 403 });
    }

    const mediaResponse = await fetch(decodedUrl, {
      headers: { 'X-Api-Key': key },
      signal: AbortSignal.timeout(15000),
    });

    if (!mediaResponse.ok) {
      console.warn('[Media Proxy] ⚠️ WAHA respondió:', mediaResponse.status, decodedUrl.substring(0, 80));
      return new NextResponse('Archivo no disponible', { status: mediaResponse.status });
    }

    const contentType = mediaResponse.headers.get('content-type') || 'application/octet-stream';
    const buffer = await mediaResponse.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch (error: any) {
    console.error('[Media Proxy] ❌ Error:', error?.message || error);
    return new NextResponse('Error interno', { status: 500 });
  }
}
