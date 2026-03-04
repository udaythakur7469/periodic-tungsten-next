# 🔺 Periodic Tungsten Next

[![npm version](https://img.shields.io/npm/v/@periodic/tungsten-next.svg)](https://www.npmjs.com/package/@periodic/tungsten-next)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

**Official Next.js integration for `@periodic/tungsten` — App Router, Pages Router, Middleware, and Edge all covered**

Part of the **Periodic** series of Node.js packages by Uday Thakur.

---

## 💡 Why Tungsten Next?

**`@periodic/tungsten-next`** is the Next.js integration layer for the `@periodic/tungsten` authentication family. While `@periodic/tungsten` handles cryptographic primitives, `@periodic/tungsten-session` handles session orchestration, and `@periodic/tungsten-client` handles browser token state — this library makes all of it idiomatic in Next.js: reading auth state in Server Components, protecting routes in Middleware, guarding API routes, and managing cookies correctly across all runtimes.

Next.js introduces unique authentication challenges that generic auth libraries don't account for. JWT verification in Server Components requires reading cookies from the incoming request. Middleware runs on the Edge and can't use Node.js APIs. API route protection needs a clean wrapper that types the handler with the authenticated context. Cookie handling differs between App Router and Pages Router. **Tungsten Next handles all of it with a consistent API that works identically across every Next.js surface.**

The name represents:
- **Coverage**: Every Next.js runtime and routing system is supported
- **Correctness**: JWT verification, session lookup, and cookie handling done right in each context
- **Simplicity**: One package, one import, regardless of which Next.js feature you're using
- **Safety**: Edge-compatible, SSR-safe, and typed throughout

Just as `@periodic/tungsten` handles cryptographic primitives without shortcuts, **@periodic/tungsten-next** handles Next.js authentication integration without workarounds.

---

## 🎯 Why Choose Tungsten Next?

Next.js authentication has more surface area than any other framework — and generic solutions break in at least one place:

- **Server Components** can't use client-side token state — they need cookie-based JWT or session verification at render time
- **Middleware** runs on the Edge runtime — no Node.js crypto, no `fs`, no database connections
- **API route protection** needs a typed wrapper — unprotected handlers leak `user` as `unknown`
- **Pages Router and App Router** have different cookie and request APIs — code that works in one often breaks in the other
- **Cookie configuration** for auth is security-critical — wrong `SameSite`, missing `HttpOnly`, wrong `Path` are common mistakes

**Periodic Tungsten Next** provides the perfect solution:

✅ **App Router** — `getServerAuth()` reads and verifies auth in Server Components and Route Handlers  
✅ **Pages Router** — works identically in `getServerSideProps` and API routes  
✅ **Middleware** — `tungstenMiddleware()` protects routes at the Edge with zero Node.js dependencies  
✅ **`withAuth`** — typed API route wrapper, handler receives `{ user }` with no `unknown` casting  
✅ **JWT mode** — verify access tokens directly, no database lookup needed  
✅ **Session mode** — look up server-side sessions via your `@periodic/tungsten-session` storage adapter  
✅ **Edge runtime safe** — no Node.js APIs in Middleware  
✅ **Cookie utilities** — `getSecureCookieOptions`, `createAuthCookie`, `deleteAuthCookie` with correct defaults  
✅ **Type-safe** — strict TypeScript throughout, zero `any`  
✅ **No global state** — no side effects on import  
✅ **Production-ready** — non-blocking, never crashes your app

---

## 📦 Installation

```bash
npm install @periodic/tungsten-next @periodic/tungsten @periodic/tungsten-session next
```

Or with yarn:

```bash
yarn add @periodic/tungsten-next @periodic/tungsten @periodic/tungsten-session next
```

---

## 🚀 Quick Start

```tsx
// app/dashboard/page.tsx — Server Component
import { getServerAuth } from '@periodic/tungsten-next';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const auth = await getServerAuth({ mode: 'jwt', keyProvider });

  if (!auth.authenticated) redirect('/login');

  return <div>Welcome back, {auth.userId}</div>;
}
```

```typescript
// middleware.ts — Edge-compatible route protection
import { tungstenMiddleware } from '@periodic/tungsten-next';

export default tungstenMiddleware({
  protect: ['/dashboard', '/settings'],
  keyProvider,
  redirectTo: '/login',
});

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*'],
};
```

```typescript
// app/api/me/route.ts — Typed API route protection
import { withAuth } from '@periodic/tungsten-next';

export const GET = withAuth(
  async (request, { user }) => {
    return Response.json({ userId: user.sub });
  },
  { keyProvider }
);
```

---

## 🧠 Core Concepts

### `getServerAuth`

- **The primary function for server-side auth** — works in Server Components, Route Handlers, and `getServerSideProps`
- Reads the auth cookie from the incoming request automatically
- Supports two modes: `'jwt'` (verify access token, no DB call) and `'session'` (look up session via your storage adapter)
- Returns `{ authenticated: true, userId, ... }` or `{ authenticated: false }` — a discriminated union, always safe to check

```typescript
const auth = await getServerAuth({ mode: 'jwt', keyProvider });
if (auth.authenticated) {
  auth.userId; // string — typed, only present when authenticated
}
```

### `tungstenMiddleware`

- **Edge-compatible route protection** — runs in Next.js Middleware before any page renders
- Uses only Web APIs — no Node.js crypto, no database connections
- Accepts an array of protected path prefixes — unmatched paths pass through untouched
- Redirects unauthenticated requests to your login page with the return URL preserved

```typescript
// middleware.ts
export default tungstenMiddleware({
  protect: ['/dashboard', '/api/protected'],
  keyProvider,
  redirectTo: '/login',
});
```

### `withAuth`

- **Typed API route wrapper** — eliminates `unknown` user casting in every handler
- The wrapped handler receives `(request, { user })` where `user` is the verified JWT payload
- Returns a `405 Method Not Allowed` automatically for uncovered methods

**Design principle:**
> Auth should be enforced at the boundary, not checked inside the handler. `withAuth` is that boundary.

### Cookie Utilities

- **`getSecureCookieOptions`** — returns cookie options with secure defaults (`HttpOnly`, `Secure`, `SameSite: strict`)
- **`createAuthCookie`** — builds a `Set-Cookie` header value for setting the auth cookie
- **`deleteAuthCookie`** — builds a `Set-Cookie` header value that expires the auth cookie immediately

---

## ✨ Features

### 🖥️ Server Components (App Router)

Read and verify auth at render time — no client-side state, no useEffect:

```tsx
// app/profile/page.tsx
import { getServerAuth } from '@periodic/tungsten-next';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const auth = await getServerAuth({ mode: 'jwt', keyProvider });
  if (!auth.authenticated) redirect('/login');

  return <Profile userId={auth.userId} />;
}
```

### 🔐 Session Mode

Use server-side sessions instead of JWTs — `getServerAuth` looks up the session via your storage adapter:

```tsx
import { getServerAuth } from '@periodic/tungsten-next';

export default async function DashboardPage() {
  const auth = await getServerAuth({
    mode: 'session',
    storage: sessionStorage, // your SessionStorage adapter
  });

  if (!auth.authenticated) redirect('/login');
  return <Dashboard userId={auth.userId} />;
}
```

### 🛣️ Route Handlers (App Router)

```typescript
// app/api/orders/route.ts
import { withAuth } from '@periodic/tungsten-next';

export const GET = withAuth(
  async (request, { user }) => {
    const orders = await db.orders.findAll({ userId: user.sub });
    return Response.json(orders);
  },
  { keyProvider }
);

export const POST = withAuth(
  async (request, { user }) => {
    const body = await request.json();
    const order = await db.orders.create({ ...body, userId: user.sub });
    return Response.json(order, { status: 201 });
  },
  { keyProvider }
);
```

### 🔀 Middleware

Protect entire route groups at the Edge:

```typescript
// middleware.ts
import { tungstenMiddleware } from '@periodic/tungsten-next';

export default tungstenMiddleware({
  protect: ['/dashboard', '/settings', '/api/protected'],
  keyProvider,
  redirectTo: '/login',
});

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/api/protected/:path*'],
};
```

### 📄 Pages Router

Works identically in `getServerSideProps` and Pages Router API routes:

```typescript
// pages/dashboard.tsx
import { getServerAuth } from '@periodic/tungsten-next';
import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const auth = await getServerAuth({ mode: 'jwt', keyProvider, req });
  if (!auth.authenticated) return { redirect: { destination: '/login', permanent: false } };
  return { props: { userId: auth.userId } };
};
```

```typescript
// pages/api/me.ts
import { withAuth } from '@periodic/tungsten-next';

export default withAuth(
  async (req, res, { user }) => {
    res.json({ userId: user.sub });
  },
  { keyProvider }
);
```

### 🍪 Cookie Utilities

Manage auth cookies with correct security defaults:

```typescript
import { getSecureCookieOptions, createAuthCookie, deleteAuthCookie } from '@periodic/tungsten-next';

// On login — set the auth cookie
const cookieValue = createAuthCookie('access_token', token, {
  maxAge: 15 * 60, // 15 minutes
});
response.headers.set('Set-Cookie', cookieValue);

// On logout — expire the cookie
const deleteCookie = deleteAuthCookie('access_token');
response.headers.set('Set-Cookie', deleteCookie);

// For manual use — get the options object
const options = getSecureCookieOptions({ maxAge: 900 });
// { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 900 }
```

---

## 📚 Common Patterns

### 1. Protected Server Component

```tsx
import { getServerAuth } from '@periodic/tungsten-next';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const auth = await getServerAuth({ mode: 'jwt', keyProvider });
  if (!auth.authenticated) redirect('/login');
  return <ProtectedContent userId={auth.userId} />;
}
```

### 2. Login Route Handler

```typescript
import { verifyPassword, signAccessToken } from '@periodic/tungsten';
import { createAuthCookie } from '@periodic/tungsten-next';

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

### 3. Logout Route Handler

```typescript
import { deleteAuthCookie } from '@periodic/tungsten-next';

export async function POST() {
  const cookie = deleteAuthCookie('access_token');
  return new Response(null, { status: 204, headers: { 'Set-Cookie': cookie } });
}
```

### 4. Middleware with Public Routes

```typescript
// middleware.ts
import { tungstenMiddleware } from '@periodic/tungsten-next';

export default tungstenMiddleware({
  protect: ['/dashboard', '/settings', '/api/me'],
  publicRoutes: ['/login', '/register', '/api/auth'],
  keyProvider,
  redirectTo: '/login',
});

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
```

### 5. getServerSideProps Auth Check

```typescript
import { getServerAuth } from '@periodic/tungsten-next';
import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const auth = await getServerAuth({ mode: 'jwt', keyProvider, req });

  if (!auth.authenticated) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const data = await fetchDataForUser(auth.userId);
  return { props: { data } };
};
```

### 6. Session-Based Auth in Server Components

```tsx
import { getServerAuth } from '@periodic/tungsten-next';
import { createSession, revokeSession } from '@periodic/tungsten-session';

export default async function AccountPage() {
  const auth = await getServerAuth({
    mode: 'session',
    storage: redisSessionStorage,
  });

  if (!auth.authenticated) redirect('/login');
  return <Account userId={auth.userId} />;
}
```

### 7. Structured Logging Integration

```typescript
import { withAuth } from '@periodic/tungsten-next';
import { createLogger, ConsoleTransport, JsonFormatter } from '@periodic/iridium';

const logger = createLogger({
  transports: [new ConsoleTransport({ formatter: new JsonFormatter() })],
});

export const GET = withAuth(
  async (request, { user }) => {
    logger.info('api.request', { userId: user.sub, path: new URL(request.url).pathname });
    const data = await fetchData(user.sub);
    return Response.json(data);
  },
  { keyProvider }
);
```

### 8. Production Configuration

```typescript
// lib/auth.ts
import { getServerAuth, withAuth, tungstenMiddleware } from '@periodic/tungsten-next';
import { RotatingKeyProvider } from '@periodic/tungsten';

export const keyProvider = new RotatingKeyProvider({
  kid: process.env.JWT_KEY_ID!,
  secret: process.env.JWT_KEY_SECRET!,
  algorithm: 'HS256',
});

export const serverAuth = () =>
  getServerAuth({ mode: 'jwt', keyProvider });

export const protect = (handler: Parameters<typeof withAuth>[0]) =>
  withAuth(handler, { keyProvider });

export const authMiddleware = tungstenMiddleware({
  protect: ['/dashboard', '/settings', '/api/me'],
  keyProvider,
  redirectTo: '/login',
});
```

---

## 🎛️ Configuration Options

### `getServerAuth` Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'jwt' \| 'session'` | required | Verification strategy |
| `keyProvider` | `KeyProvider` | required (jwt mode) | Key provider from `@periodic/tungsten` |
| `storage` | `SessionStorage` | required (session mode) | Session storage adapter |
| `req` | `IncomingMessage` | — | Pages Router request (App Router reads cookies automatically) |
| `cookieName` | `string` | `'access_token'` | Name of the auth cookie to read |

### `tungstenMiddleware` Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `protect` | `string[]` | required | Path prefixes that require authentication |
| `keyProvider` | `KeyProvider` | required | Key provider for JWT verification |
| `redirectTo` | `string` | required | Path to redirect unauthenticated requests |
| `publicRoutes` | `string[]` | `[]` | Paths that always pass through |
| `cookieName` | `string` | `'access_token'` | Name of the auth cookie to read |

### `withAuth` Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `keyProvider` | `KeyProvider` | required | Key provider for JWT verification |
| `cookieName` | `string` | `'access_token'` | Name of the auth cookie to read |

### `getSecureCookieOptions` Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxAge` | `number` | — | Cookie max age in seconds |
| `sameSite` | `'strict' \| 'lax' \| 'none'` | `'strict'` | SameSite policy |
| `path` | `string` | `'/'` | Cookie path |

---

## 📋 API Reference

### Server

```typescript
getServerAuth(options: ServerAuthOptions): Promise<AuthContext>
```

### Middleware

```typescript
tungstenMiddleware(options: MiddlewareOptions): NextMiddleware
```

### API Route Protection

```typescript
withAuth(handler: AuthenticatedHandler, options: WithAuthOptions): RouteHandler
```

### Cookies

```typescript
getSecureCookieOptions(options?: CookieOptions): CookieOptionsResult
createAuthCookie(name: string, value: string, options?: CookieOptions): string
deleteAuthCookie(name: string): string
```

### Types

```typescript
import type {
  ServerAuthOptions,
  AuthContext,
  MiddlewareOptions,
  AuthenticatedContext,
  AuthenticatedHandler,
  WithAuthOptions,
} from '@periodic/tungsten-next';
```

---

## 🧩 Architecture

```
@periodic/tungsten-next/
├── src/
│   ├── server/
│   │   └── auth.ts            # getServerAuth() — App Router + Pages Router
│   ├── middleware/
│   │   └── index.ts           # tungstenMiddleware() — Edge-compatible
│   ├── api/
│   │   └── withAuth.ts        # withAuth() — typed route handler wrapper
│   ├── cookies/
│   │   └── index.ts           # getSecureCookieOptions, createAuthCookie, deleteAuthCookie
│   ├── types.ts               # All shared TypeScript interfaces
│   └── index.ts               # Public API
```

**Design Philosophy:**
- **No opinions on auth strategy** — JWT and session modes are equal citizens
- **Router-agnostic internals** — App Router and Pages Router share the same core verification logic
- **Edge-first Middleware** — `tungstenMiddleware` uses only Web APIs, no Node.js dependencies
- **Typed boundaries** — `withAuth` gives handlers a typed `user` rather than `unknown`
- **Cookie utilities** handle the security-critical details — `HttpOnly`, `Secure`, `SameSite` correctly set

---

## 📈 Performance

- **`getServerAuth` is a single async call** — one cookie read and one JWT verify or storage lookup, nothing more
- **`tungstenMiddleware` runs at the Edge** — zero cold start overhead from Node.js runtime
- **`withAuth` adds a single wrapper** — one JWT verify call, no extra round trips
- **No global state** — every call is isolated, safe for concurrent server requests
- **No monkey-patching** — pure functions only, no prototype mutation

---

## 🚫 Explicit Non-Goals

This package **intentionally does not** include:

❌ JWT signing or password hashing (use `@periodic/tungsten`)  
❌ Session creation or rotation (use `@periodic/tungsten-session`)  
❌ Browser token state management (use `@periodic/tungsten-client`)  
❌ React hooks or components (use `@periodic/tungsten-react`)  
❌ OAuth / OpenID Connect flows — bring your own login page  
❌ Magic or implicit behavior on import  
❌ Configuration files (configure in code)

Focus on doing one thing well: **idiomatic Next.js integration for the `@periodic/tungsten` authentication family**.

---

## 🎨 TypeScript Support

Full TypeScript support with complete type safety:

```typescript
import type { AuthContext, ServerAuthOptions } from '@periodic/tungsten-next';

// AuthContext is a discriminated union — narrow by authenticated
const auth = await getServerAuth({ mode: 'jwt', keyProvider });
if (auth.authenticated) {
  auth.userId;   // string — only present when authenticated
  auth.payload;  // JWT payload — only present in jwt mode
}

// withAuth handler is fully typed
export const GET = withAuth(
  async (request, { user }) => {
    user.sub;    // string — typed JWT subject
    return Response.json({ id: user.sub });
  },
  { keyProvider }
);
```

---

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

**Note:** All tests achieve >80% code coverage.

---

## 🤝 Related Packages

Part of the **Periodic** series by Uday Thakur:

- [**@periodic/tungsten-react**](https://www.npmjs.com/package/@periodic/tungsten-react) - React hooks and components
- [**@periodic/tungsten-session**](https://www.npmjs.com/package/@periodic/tungsten-session) - Server-side session management
- [**@periodic/tungsten-client**](https://www.npmjs.com/package/@periodic/tungsten-client) - Browser token state management
- [**@periodic/tungsten**](https://www.npmjs.com/package/@periodic/tungsten) - Authentication primitives (JWT, Argon2, TOTP, HMAC)
- [**@periodic/iridium**](https://www.npmjs.com/package/@periodic/iridium) - Structured logging
- [**@periodic/arsenic**](https://www.npmjs.com/package/@periodic/arsenic) - Semantic runtime monitoring
- [**@periodic/zirconium**](https://www.npmjs.com/package/@periodic/zirconium) - Environment configuration
- [**@periodic/vanadium**](https://www.npmjs.com/package/@periodic/vanadium) - Idempotency and distributed locks
- [**@periodic/strontium**](https://www.npmjs.com/package/@periodic/strontium) - Resilient HTTP client
- [**@periodic/osmium**](https://www.npmjs.com/package/@periodic/osmium) - Redis caching

Build complete, production-ready APIs with the Periodic series!

---

## 📖 Documentation

- [Quick Start Guide](QUICKSTART.md)
- [Installation Guide](INSTALLATION.md)
- [Setup Guide](SETUP.md)
- [Project Structure](PROJECT_STRUCTURE.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

---

## 🛠️ Production Recommendations

### Environment Variables

```bash
JWT_KEY_ID=key-2025-01
JWT_KEY_SECRET=your-256-bit-secret
JWT_PREV_KEY_ID=key-2024-12
JWT_PREV_KEY_SECRET=previous-secret
NODE_ENV=production
```

### Log Aggregation

Pair with `@periodic/iridium` for structured JSON output:

```typescript
import { createLogger, ConsoleTransport, JsonFormatter } from '@periodic/iridium';

const logger = createLogger({
  transports: [new ConsoleTransport({ formatter: new JsonFormatter() })],
});

export const GET = withAuth(
  async (request, { user }) => {
    logger.info('api.authenticated_request', { userId: user.sub });
    return Response.json({ ok: true });
  },
  { keyProvider }
);

// Pipe to Elasticsearch, Datadog, CloudWatch, etc.
```

### Security Monitoring

```typescript
export const POST = withAuth(
  async (request, { user }) => {
    try {
      return Response.json(await handleRequest(user.sub, request));
    } catch (err) {
      Sentry.captureException(err, { extra: { userId: user.sub } });
      return Response.json({ error: 'Internal error' }, { status: 500 });
    }
  },
  { keyProvider }
);
```

---

## 📝 License

MIT © [Uday Thakur](LICENSE)

---

## 🙏 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on:

- Code of conduct
- Development setup
- Pull request process
- Coding standards
- Architecture principles

---

## 📞 Support

- 📧 **Email:** udaythakurwork@gmail.com
- 🐛 **Issues:** [GitHub Issues](https://github.com/udaythakur7469/periodic-tungsten-next/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/udaythakur7469/periodic-tungsten-next/discussions)

---

## 🌟 Show Your Support

Give a ⭐️ if this project helped you build better applications!

---

**Built with ❤️ by Uday Thakur for production-grade Node.js applications**