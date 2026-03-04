/**
 * Server-side authentication for Next.js
 */

import { cookies } from 'next/headers';
import { verifyAccessToken, type KeyProvider } from '@periodic/tungsten';
import { validateSession, type SessionStorage } from '@periodic/tungsten-session';

export interface ServerAuthOptions {
  mode: 'jwt' | 'session';
  keyProvider?: KeyProvider;
  sessionStorage?: SessionStorage;
  cookieName?: string;
  issuer?: string;
  audience?: string;
}

export interface AuthContext<TUser = unknown> {
  user: TUser | null;
  userId?: string;
  authenticated: boolean;
}

export async function getServerAuth<TUser = unknown>(
  options: ServerAuthOptions
): Promise<AuthContext<TUser>> {
  const {
    mode,
    keyProvider,
    sessionStorage,
    cookieName = 'auth_token',
    issuer,
    audience,
  } = options;

  try {
    const cookieStore = cookies();
    const token = cookieStore.get(cookieName)?.value;

    if (!token) {
      return { user: null, authenticated: false };
    }

    if (mode === 'jwt') {
      if (!keyProvider) {
        throw new Error('keyProvider required for JWT mode');
      }

      const payload = await verifyAccessToken(token, {
        keyProvider,
        issuer,
        audience,
      });

      return {
        user: payload as TUser,
        userId: payload.sub,
        authenticated: true,
      };
    } else {
      if (!sessionStorage) {
        throw new Error('sessionStorage required for session mode');
      }

      const result = await validateSession(token, { storage: sessionStorage });

      if (!result.valid || !result.session) {
        return { user: null, authenticated: false };
      }

      return {
        user: result.session as TUser,
        userId: result.session.userId,
        authenticated: true,
      };
    }
  } catch {
    return { user: null, authenticated: false };
  }
}
