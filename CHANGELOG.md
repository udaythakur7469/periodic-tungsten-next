# Changelog — @periodic/tungsten-next

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.0.0] — 2025-01-01

### Added

- `getServerAuth(options)` — reads the auth cookie and verifies in two modes:
  - `'jwt'` mode: verifies access token using `@periodic/tungsten`'s `verifyAccessToken` — no database call
  - `'session'` mode: looks up the session using a `@periodic/tungsten-session` storage adapter
  - Supports App Router (reads from `next/headers`) and Pages Router (accepts `req` parameter)
  - Returns a discriminated `AuthContext` — narrow by `authenticated` to access `userId` and payload
- `tungstenMiddleware(options)` — Edge-compatible route protection middleware
  - Uses only Web APIs — no Node.js dependencies
  - Accepts a `protect` array of path prefixes and a `publicRoutes` array for always-pass-through paths
  - Redirects unauthenticated requests to `redirectTo` with `?returnTo=` preserving the original path
  - Configurable `cookieName` (default: `'access_token'`)
- `withAuth(handler, options)` — typed route handler wrapper for App Router and Pages Router
  - Returns `401 Unauthorized` before the handler runs for unauthenticated requests
  - Handler receives `(request, { user: JWTPayload })` — fully typed, no `unknown` casting
- `getSecureCookieOptions(options?)` — returns cookie options with secure defaults (`HttpOnly`, `Secure`, `SameSite: strict`)
- `createAuthCookie(name, value, options?)` — builds a fully formatted `Set-Cookie` header value for setting the auth cookie
- `deleteAuthCookie(name)` — builds a `Set-Cookie` header value that expires the cookie immediately
- `ServerAuthOptions`, `AuthContext`, `MiddlewareOptions`, `AuthenticatedContext`, `AuthenticatedHandler`, `WithAuthOptions` TypeScript types
- ESM + CJS dual build output
- Jest test suite with >80% coverage

[Unreleased]: https://github.com/udaythakur7469/periodic-tungsten-next/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/udaythakur7469/periodic-tungsten-next/releases/tag/v1.0.0