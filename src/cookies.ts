/**
 * Cookie utilities for Next.js
 */

import { serializeCookie, type CookieOptions } from '@periodic/tungsten';

export function getSecureCookieOptions(isProduction: boolean = true): CookieOptions {
  return {
    name: 'auth_token',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };
}

export function createAuthCookie(token: string, options?: Partial<CookieOptions>): string {
  const defaults = getSecureCookieOptions(process.env.NODE_ENV === 'production');
  return serializeCookie('auth_token', token, { ...defaults, ...options });
}

export function deleteAuthCookie(options?: Partial<CookieOptions>): string {
  const defaults = getSecureCookieOptions(process.env.NODE_ENV === 'production');
  return serializeCookie('auth_token', '', { ...defaults, ...options, maxAge: 0 });
}
