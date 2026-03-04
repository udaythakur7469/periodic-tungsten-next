/**
 * Next.js middleware for route protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, type KeyProvider } from '@periodic/tungsten';
import { validateSession, type SessionStorage } from '@periodic/tungsten-session';

export interface MiddlewareOptions {
  protect?: string[];
  publicRoutes?: string[];
  mode?: 'jwt' | 'session';
  keyProvider?: KeyProvider;
  sessionStorage?: SessionStorage;
  cookieName?: string;
  redirectTo?: string;
}

export function tungstenMiddleware(options: MiddlewareOptions) {
  const {
    protect = [],
    publicRoutes = [],
    mode = 'jwt',
    keyProvider,
    sessionStorage,
    cookieName = 'auth_token',
    redirectTo = '/login',
  } = options;

  return async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
    if (isPublicRoute) {
      return NextResponse.next();
    }

    const isProtectedRoute = protect.some((route) => pathname.startsWith(route));
    if (!isProtectedRoute) {
      return NextResponse.next();
    }

    const token = request.cookies.get(cookieName)?.value;

    if (!token) {
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    try {
      if (mode === 'jwt' && keyProvider) {
        await verifyAccessToken(token, { keyProvider });
      } else if (mode === 'session' && sessionStorage) {
        const result = await validateSession(token, { storage: sessionStorage });
        if (!result.valid) {
          throw new Error('Invalid session');
        }
      }

      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
  };
}
