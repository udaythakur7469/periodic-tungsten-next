# Installation — @periodic/tungsten-next

---

## Requirements

- Node.js >= 16.0.0
- Next.js >= 14.0.0
- `@periodic/tungsten` >= 1.0.0
- `@periodic/tungsten-session` >= 1.0.0 (required for session mode)
- TypeScript >= 5.0 (for development)

---

## npm

```bash
npm install @periodic/tungsten-next @periodic/tungsten @periodic/tungsten-session next
```

## yarn

```bash
yarn add @periodic/tungsten-next @periodic/tungsten @periodic/tungsten-session next
```

## pnpm

```bash
pnpm add @periodic/tungsten-next @periodic/tungsten @periodic/tungsten-session next
```

---

## Module Formats

The package ships both ESM and CJS builds:

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

Works out of the box with Next.js's webpack bundler in both App Router and Pages Router.

---

## TypeScript

No additional type packages required. Definitions are bundled:

```typescript
import { getServerAuth, withAuth, tungstenMiddleware } from '@periodic/tungsten-next';
import type { ServerAuthOptions, AuthContext, WithAuthOptions } from '@periodic/tungsten-next';
```

---

## Environment Variables

```bash
# Required for JWT mode
JWT_KEY_ID=key-2025-01
JWT_KEY_SECRET=your-256-bit-secret-at-least-32-chars

# Optional — for key rotation
JWT_PREV_KEY_ID=key-2024-12
JWT_PREV_KEY_SECRET=previous-secret

# Optional — if using session mode with Redis
REDIS_URL=redis://localhost:6379
```

---

## Next.js Compatibility

| Next.js Version | App Router | Pages Router | Middleware | Edge |
|----------------|-----------|-------------|-----------|------|
| 14.x | ✅ | ✅ | ✅ | ✅ |
| 13.x | ✅ | ✅ | ✅ | ✅ |

---

## Next Steps

- [Quick Start](QUICKSTART.md) — up and running in 5 minutes
- [Setup Guide](SETUP.md) — detailed setup for App Router, Pages Router, and session mode