/**
 * API route wrapper with authentication
 */

import { NextRequest } from 'next/server';
import { verifyAccessToken, type KeyProvider } from '@periodic/tungsten';

export interface AuthenticatedContext<TUser = unknown> {
  user: TUser;
  userId: string;
}

export type AuthenticatedHandler<TUser = unknown> = (
  request: NextRequest,
  context: AuthenticatedContext<TUser>
) => Promise<Response> | Response;

export interface WithAuthOptions {
  keyProvider: KeyProvider;
  cookieName?: string;
  headerName?: string;
  issuer?: string;
  audience?: string;
}

export function withAuth<TUser = unknown>(
  handler: AuthenticatedHandler<TUser>,
  options: WithAuthOptions
) {
  const { keyProvider, cookieName = 'auth_token', headerName = 'authorization', issuer, audience } = options;

  return async function authenticatedHandler(request: NextRequest): Promise<Response> {
    let token: string | undefined;

    const authHeader = request.headers.get(headerName);
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      token = request.cookies.get(cookieName)?.value;
    }

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const payload = await verifyAccessToken(token, {
        keyProvider,
        issuer,
        audience,
      });

      const context: AuthenticatedContext<TUser> = {
        user: payload as TUser,
        userId: payload.sub,
      };

      return handler(request, context);
    } catch {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}
