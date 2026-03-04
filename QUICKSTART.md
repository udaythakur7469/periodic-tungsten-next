# Quick Start — @periodic/tungsten-next

Get Next.js authentication working in under 5 minutes.

---

## 1. Install

```bash
npm install @periodic/tungsten-next @periodic/tungsten @periodic/tungsten-session next
```

---

## 2. Set Up a Key Provider

```typescript
// lib/auth.ts
import { RotatingKeyProvider } from '@periodic/tungsten';

export const keyProvider = new RotatingKeyProvider({
  kid: process.env.JWT_KEY_ID!,
  secret: process.env.JWT_KEY_SECRET!,
  algorithm: 'HS256',
});
```

---

## 3. Protect a Server Component

```tsx
// app/dashboard/page.tsx
import { getServerAuth } from '@periodic/tungsten-next';
import { redirect } from 'next/navigation';
import { keyProvider } from '@/lib/auth';

export default async function DashboardPage() {
  const auth = await getServerAuth({ mode: 'jwt', keyProvider });

  if (!auth.authenticated) redirect('/login');

  return <h1>Welcome back, {auth.userId}</h1>;
}
```

---

## 4. Add Middleware

```typescript
// middleware.ts
import { tungstenMiddleware } from '@periodic/tungsten-next';
import { keyProvider } from './lib/auth';

export default tungstenMiddleware({
  protect: ['/dashboard', '/settings'],
  keyProvider,
  redirectTo: '/login',
});

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*'],
};
```

---

## 5. Protect an API Route

```typescript
// app/api/me/route.ts
import { withAuth } from '@periodic/tungsten-next';
import { keyProvider } from '@/lib/auth';

export const GET = withAuth(
  async (request, { user }) => {
    return Response.json({ userId: user.sub });
  },
  { keyProvider }
);
```

---

## 6. Issue a Token on Login

```typescript
// app/api/auth/login/route.ts
import { verifyPassword, signAccessToken } from '@periodic/tungsten';
import { createAuthCookie } from '@periodic/tungsten-next';
import { keyProvider } from '@/lib/auth';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const user = await db.users.findOne({ email });
  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) return Response.json({ error: 'Invalid credentials' }, { status: 401 });

  const token = await signAccessToken({ sub: user.id }, { expiresIn: '15m', keyProvider });
  const cookie = createAuthCookie('access_token', token, { maxAge: 900 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' },
  });
}
```

---

## Next Steps

- [Full README](README.md) — all options, patterns, and API reference
- [Setup Guide](SETUP.md) — App Router vs Pages Router, session mode, and Edge notes
- [Examples](examples/) — runnable code examples