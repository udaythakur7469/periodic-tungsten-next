# Contributing — @periodic/tungsten-next

Thank you for your interest in contributing! This document covers everything you need to get started.

---

## Code of Conduct

Be respectful, constructive, and kind. We welcome contributors of all experience levels.

---

## Development Setup

### Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0

### Clone and Install

```bash
git clone https://github.com/udaythakur7469/periodic-tungsten-next.git
cd periodic-tungsten-next
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test                # run all tests
npm run test:watch      # watch mode
npm run test:coverage   # with coverage report
```

### Lint and Format

```bash
npm run lint            # check for lint errors
npm run lint:fix        # auto-fix lint errors
npm run format          # format with prettier
npm run format:check    # check formatting without writing
npm run typecheck       # TypeScript type check
```

---

## Pull Request Process

1. **Fork** the repository and create a branch from `main`
2. **Name your branch** descriptively: `fix/middleware-edge-compat`, `feat/session-mode-pages-router`
3. **Write tests** for any new behaviour — coverage should not decrease
4. **Update documentation** — README, CHANGELOG, and any affected `.md` files
5. **Run the full suite** before opening a PR: `npm run format && npm run build && npm test`
6. **Open a PR** with a clear description of what changed and why

---

## Coding Standards

- **TypeScript strict mode** — no `any`, no `@ts-ignore` without comment
- **`tungstenMiddleware` must remain Edge-compatible** — no Node.js API imports, no `node:*` imports
- **`getServerAuth` must support both App Router and Pages Router** — test both `req`-based and `next/headers`-based cookie reading
- **`withAuth` must return `401`, not redirect** — API routes are not browser navigation
- **Cookie utilities must use secure defaults** — `HttpOnly: true`, `Secure: true`, `SameSite: strict` in all generated options
- **No global state** — all functions accept their configuration as arguments

---

## Architecture Principles

- **Middleware stays Edge-only** — web APIs only, no Node.js dependencies
- **Server functions support both routers** — the `req` parameter bridges Pages Router; App Router uses `next/headers`
- **`withAuth` is a typed boundary** — handlers receive `{ user: JWTPayload }`, never `unknown`
- **Cookie utilities encode security policy** — don't make callers guess the right options

---

## Reporting Bugs

Please open an issue on [GitHub Issues](https://github.com/udaythakur7469/periodic-tungsten-next/issues) with:

- A minimal reproduction (Next.js version, App Router vs Pages Router, JWT vs session mode)
- Expected behaviour
- Actual behaviour
- Node.js version

---

## Changelog

All notable changes go in [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]`. Follow the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.