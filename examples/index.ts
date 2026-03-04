/**
 * @periodic/tungsten-next — Examples
 *
 * Eight patterns covering the most common Next.js authentication scenarios.
 * These are illustrative — adapt paths, variable names, and imports to your project.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shared setup — create this file once and import from your routes
// lib/auth.ts
// ─────────────────────────────────────────────────────────────────────────────

import { RotatingKeyProvider } from '@periodic/tungsten';
import { getServerAuth, withAuth, tungstenMiddleware } from '@periodic/tungsten-next';

export const keyProvider = new RotatingKeyProvider({
  kid: process.env.JWT_KEY_ID!,
  secret: process.env.JWT_KEY_SECRET!,
  algorithm: 'HS256',
});

// Pre-bound helpers — import these in your routes
export const serverAuth = () => getServerAuth({ mode: 'jwt', keyProvider });
export const protect = (handler: Parameters<typeof withAuth>[0]) =>
  withAuth(handler, { keyProvider });

// ─────────────────────────────────────────────────────────────────────────────
// Example 1: Protected Server Component (App Router)
// app/dashboard/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

// import { redirect } from 'next/navigation';
// import { serverAuth } from '@/lib/auth';
//
// export default async function DashboardPage() {
//   const auth = await serverAuth();
//   if (!auth.authenticated) redirect('/login');
//   return <h1>Dashboard — {auth.userId}</h1>;
// }

// Runnable approximation (not JSX):
export async function dashboardExample() {
  const auth = await serverAuth();
  if (!auth.authenticated) {
    console.log('Not authenticated — would redirect to /login');
    return;
  }
  console.log('Authenticated userId:', auth.userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 2: Protected API Route Handler (App Router)
// app/api/me/route.ts
// ─────────────────────────────────────────────────────────────────────────────

export const GET = withAuth(
  async (request, { user }) => {
    return Response.json({ userId: user.sub });
  },
  { keyProvider }
);

// ─────────────────────────────────────────────────────────────────────────────
// Example 3: Login Route Handler
// app/api/auth/login/route.ts
// ─────────────────────────────────────────────────────────────────────────────

import { verifyPassword, signAccessToken } from '@periodic/tungsten';
import { createAuthCookie } from '@periodic/tungsten-next';

export async function loginRouteExample(request: Request) {
  const { email, password } = await request.json();

  // In production: const user = await db.users.findOne({ email });
  const user = { id: 'user_123', passwordHash: 'hashed' };
  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await signAccessToken({ sub: user.id }, { expiresIn: '15m', keyProvider });
  const cookie = createAuthCookie('access_token', token, { maxAge: 900 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 4: Logout Route Handler
// app/api/auth/logout/route.ts
// ─────────────────────────────────────────────────────────────────────────────

import { deleteAuthCookie } from '@periodic/tungsten-next';

export async function logoutRouteExample() {
  const cookie = deleteAuthCookie('access_token');
  return new Response(null, { status: 204, headers: { 'Set-Cookie': cookie } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 5: Middleware
// middleware.ts
// ─────────────────────────────────────────────────────────────────────────────

export const authMiddleware = tungstenMiddleware({
  protect: ['/dashboard', '/settings', '/api/me', '/api/orders'],
  publicRoutes: ['/login', '/register', '/api/auth'],
  keyProvider,
  redirectTo: '/login',
});

// In your actual middleware.ts:
// export default authMiddleware;
// export const config = {
//   matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
// };

// ─────────────────────────────────────────────────────────────────────────────
// Example 6: getServerSideProps (Pages Router)
// pages/dashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────

import type { GetServerSidePropsContext } from 'next';

export async function getServerSidePropsExample({ req }: GetServerSidePropsContext) {
  const auth = await getServerAuth({ mode: 'jwt', keyProvider, req });

  if (!auth.authenticated) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  return { props: { userId: auth.userId } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 7: Structured Logging Integration
// app/api/orders/route.ts
// ─────────────────────────────────────────────────────────────────────────────

// Replace with @periodic/iridium in production
const logger = {
  info: (msg: string, data?: object) => console.log(`[INFO] ${msg}`, data ?? ''),
  warn: (msg: string, data?: object) => console.warn(`[WARN] ${msg}`, data ?? ''),
};

export const loggedGET = withAuth(
  async (request, { user }) => {
    logger.info('api.request', { userId: user.sub, path: new URL(request.url).pathname });

    // In production: const orders = await db.orders.findAll({ userId: user.sub });
    const orders: unknown[] = [];
    return Response.json(orders);
  },
  { keyProvider }
);

// ─────────────────────────────────────────────────────────────────────────────
// Example 8: Production Configuration Factory
// lib/auth.ts (extended)
// ─────────────────────────────────────────────────────────────────────────────

import { getSecureCookieOptions } from '@periodic/tungsten-next';

const isDevelopment = process.env.NODE_ENV === 'development';

export const cookieOptions = getSecureCookieOptions({
  maxAge: isDevelopment ? 60 * 60 : 15 * 60, // 1h dev, 15m prod
  sameSite: isDevelopment ? 'lax' : 'strict', // lax for localhost dev
});

// Register previous key for zero-downtime key rotation
if (process.env.JWT_PREV_KEY_ID && process.env.JWT_PREV_KEY_SECRET) {
  keyProvider.addKey(
    process.env.JWT_PREV_KEY_ID,
    process.env.JWT_PREV_KEY_SECRET,
    'HS256'
  );
}

export const productionMiddleware = tungstenMiddleware({
  protect: ['/dashboard', '/settings', '/api/me'],
  publicRoutes: ['/login', '/register', '/api/auth', '/api/health'],
  keyProvider,
  redirectTo: '/login',
  cookieName: 'access_token',
});