import { NextRequest } from 'next/server';
import type { ClientInfo } from '../rate-limit/types';

/**
 * Extraer la IP real del cliente desde los headers
 * Considera proxies como Vercel, Cloudflare, etc.
 * 
 * @param request - Next.js request object
 * @returns IP address del cliente
 */
export function getClientIp(request: NextRequest): string {
  // Headers en orden de prioridad
  const ipHeaders = [
    'x-real-ip',           // Nginx
    'x-forwarded-for',     // Proxies estándar
    'cf-connecting-ip',    // Cloudflare
    'x-vercel-forwarded-for', // Vercel
    'true-client-ip',      // Cloudflare Enterprise
    'x-client-ip',         // Otros proxies
  ];

  // Intentar obtener IP de cada header
  for (const header of ipHeaders) {
    const value = request.headers.get(header);
    
    if (value) {
      // x-forwarded-for puede tener múltiples IPs separadas por comas
      // Tomamos la primera (la del cliente original)
      const ip = value.split(',')[0].trim();
      
      if (isValidIp(ip)) {
        return ip;
      }
    }
  }

  // Fallback: usar IP por defecto
  const fallbackIp = '127.0.0.1';
  
  console.warn(
    `[Client Info] ⚠️ No valid IP found in headers, using fallback: ${fallbackIp}`
  );
  
  return fallbackIp;
}

/**
 * Validar si una string es una IP válida (v4 o v6)
 */
function isValidIp(ip: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 (simplificado)
  const ipv6Regex = /^([\da-f]{1,4}:){7}[\da-f]{1,4}$/i;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Obtener User Agent del cliente
 */
export function getUserAgent(request: NextRequest): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

/**
 * Obtener país/región del cliente (si está disponible)
 * Vercel y Cloudflare añaden estos headers automáticamente
 */
export function getClientCountry(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    undefined
  );
}

/**
 * Obtener información completa del cliente
 * 
 * @param request - Next.js request object
 * @returns ClientInfo object con toda la información disponible
 */
export function getClientInfo(request: NextRequest): ClientInfo {
  return {
    ip: getClientIp(request),
    userAgent: getUserAgent(request),
    country: getClientCountry(request)
  };
}

/**
 * Generar un fingerprint único del cliente
 * Útil para rate limiting cuando no tienes organization_id
 * 
 * @param request - Next.js request object
 * @returns String único que identifica al cliente
 */
export function getClientFingerprint(request: NextRequest): string {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request) || 'unknown';
  
  // Crear un hash simple (NO es para seguridad, solo para identificación)
  const fingerprint = `${ip}-${hashString(userAgent)}`;
  
  return fingerprint;
}

/**
 * Hash simple de un string (para fingerprinting)
 * NO usar para seguridad, solo para identificación
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Normalizar una IP para almacenamiento
 * Útil para anonimización parcial
 * 
 * @param ip - IP address
 * @param maskLastOctet - Si true, enmascara el último octeto (ej: 192.168.1.xxx)
 * @returns IP normalizada
 */
export function normalizeIp(ip: string, maskLastOctet: boolean = false): string {
  if (!maskLastOctet) {
    return ip;
  }

  // Para IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    parts[3] = 'xxx';
    return parts.join('.');
  }

  // Para IPv6 (simplificado)
  if (ip.includes(':')) {
    const parts = ip.split(':');
    parts[parts.length - 1] = 'xxxx';
    return parts.join(':');
  }

  return ip;
}

/**
 * Verificar si el request viene de un bot conocido
 * Útil para excluir bots de rate limiting estricto
 */
export function isKnownBot(request: NextRequest): boolean {
  const userAgent = getUserAgent(request);
  
  if (!userAgent) {
    return false;
  }

  const botPatterns = [
    'bot',
    'crawler',
    'spider',
    'scraper',
    'googlebot',
    'bingbot',
    'slackbot',
    'facebookbot',
    'twitterbot',
    'linkedinbot'
  ];

  const lowerUserAgent = userAgent.toLowerCase();
  
  return botPatterns.some(pattern => lowerUserAgent.includes(pattern));
}

/**
 * Obtener el path del request sin query params
 */
export function getRequestPath(request: NextRequest): string {
  const url = new URL(request.url);
  return url.pathname;
}

/**
 * Verificar si el request viene de localhost/desarrollo
 */
export function isLocalhost(request: NextRequest): boolean {
  const ip = getClientIp(request);
  return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.');
}

/**
 * Log detallado de información del cliente
 * Útil para debugging
 */
export function logClientInfo(
  request: NextRequest,
  prefix: string = '[Client Info]'
): void {
  const info = getClientInfo(request);
  const path = getRequestPath(request);
  const method = request.method;
  
  console.log(
    `${prefix} ${method} ${path} | ` +
    `IP: ${info.ip} | ` +
    `Country: ${info.country || 'unknown'} | ` +
    `UA: ${info.userAgent?.substring(0, 50) || 'unknown'}...`
  );
}

