/**
 * Tests for withAuth API route wrapper
 * Covers: valid requests, unauthorized, error handling, token sources
 */

import { withAuth } from '../../periodic-tungsten-next/src/api/withAuth';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockVerifyAccessToken = jest.fn();
jest.mock('@periodic/tungsten', () => ({
  verifyAccessToken: (...args: unknown[]) => mockVerifyAccessToken(...args),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeKeyProvider = () => ({
  getSigningKey: jest.fn(),
  getVerificationKey: jest.fn(),
});

function makeRequest(opts: {
  authHeader?: string;
  cookies?: Record<string, string>;
  url?: string;
}): any {
  const { authHeader, cookies = {}, url = 'https://example.com/api/test' } = opts;

  const headers = new Map<string, string>();
  if (authHeader) headers.set('authorization', authHeader);

  return {
    url,
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    cookies: { get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined) },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. Valid requests — Bearer header
// ═════════════════════════════════════════════════════════════════════════════

describe('withAuth — valid Bearer token', () => {
  it('calls handler with user context when Bearer token is valid', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-123', role: 'admin' });

    const handler = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    const wrapped = withAuth(handler, { keyProvider: makeKeyProvider() });
    const req = makeRequest({ authHeader: 'Bearer valid.jwt.token' });
    const res = await wrapped(req);

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      req,
      expect.objectContaining({ userId: 'user-123' })
    );
  });

  it('injects user object into handler context', async () => {
    const payload = { sub: 'user-abc', email: 'x@y.com', role: 'editor' };
    mockVerifyAccessToken.mockResolvedValue(payload);

    let capturedContext: any;
    const handler = jest.fn().mockImplementation(async (_req: any, ctx: any) => {
      capturedContext = ctx;
      return new Response('ok');
    });

    const wrapped = withAuth(handler, { keyProvider: makeKeyProvider() });
    await wrapped(makeRequest({ authHeader: 'Bearer tok' }));

    expect(capturedContext.user).toMatchObject(payload);
    expect(capturedContext.userId).toBe('user-abc');
  });

  it('passes response through unchanged from handler', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'u1' });
    const customResponse = new Response(JSON.stringify({ data: [1, 2, 3] }), {
      status: 200,
      headers: { 'X-Custom': 'header' },
    });

    const wrapped = withAuth(
      async () => customResponse,
      { keyProvider: makeKeyProvider() }
    );

    const res = await wrapped(makeRequest({ authHeader: 'Bearer tok' }));
    expect(res).toBe(customResponse);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. Valid requests — cookie token
// ═════════════════════════════════════════════════════════════════════════════

describe('withAuth — valid cookie token', () => {
  it('reads token from auth_token cookie when no Bearer header', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-cookie' });

    const handler = jest.fn().mockResolvedValue(new Response('ok'));
    const wrapped = withAuth(handler, { keyProvider: makeKeyProvider() });

    const req = makeRequest({ cookies: { auth_token: 'cookie.jwt.token' } });
    await wrapped(req);

    expect(mockVerifyAccessToken).toHaveBeenCalledWith('cookie.jwt.token', expect.any(Object));
    expect(handler).toHaveBeenCalled();
  });

  it('prefers Bearer header over cookie', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-header' });

    const handler = jest.fn().mockResolvedValue(new Response('ok'));
    const wrapped = withAuth(handler, { keyProvider: makeKeyProvider() });

    const req = makeRequest({
      authHeader: 'Bearer header.token',
      cookies: { auth_token: 'cookie.token' },
    });
    await wrapped(req);

    expect(mockVerifyAccessToken).toHaveBeenCalledWith('header.token', expect.any(Object));
  });

  it('uses custom cookieName when specified', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-custom' });

    const handler = jest.fn().mockResolvedValue(new Response('ok'));
    const wrapped = withAuth(handler, {
      keyProvider: makeKeyProvider(),
      cookieName: 'my_session',
    });

    const req = makeRequest({ cookies: { my_session: 'session.token' } });
    await wrapped(req);

    expect(mockVerifyAccessToken).toHaveBeenCalledWith('session.token', expect.any(Object));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. Unauthorized requests
// ═════════════════════════════════════════════════════════════════════════════

describe('withAuth — unauthorized', () => {
  it('returns 401 when no token present', async () => {
    const handler = jest.fn();
    const wrapped = withAuth(handler, { keyProvider: makeKeyProvider() });

    const req = makeRequest({});
    const res = await wrapped(req);

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 401 JSON body when no token', async () => {
    const wrapped = withAuth(jest.fn(), { keyProvider: makeKeyProvider() });
    const res = await wrapped(makeRequest({}));
    const body = await res.json();

    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when token is invalid/expired', async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error('Token expired'));

    const handler = jest.fn();
    const wrapped = withAuth(handler, { keyProvider: makeKeyProvider() });

    const res = await wrapped(makeRequest({ authHeader: 'Bearer expired.token' }));

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 401 when Bearer prefix is malformed (no space)', async () => {
    // "BearerToken" — no space after Bearer
    const wrapped = withAuth(jest.fn(), { keyProvider: makeKeyProvider() });
    const req = makeRequest({ authHeader: 'BearerToken' });
    const res = await wrapped(req);

    // No bearer token extracted, falls back to cookie, no cookie → 401
    expect(res.status).toBe(401);
  });

  it('does not execute handler when auth fails', async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error('Bad token'));

    const handler = jest.fn().mockResolvedValue(new Response('should not reach'));
    const wrapped = withAuth(handler, { keyProvider: makeKeyProvider() });

    await wrapped(makeRequest({ authHeader: 'Bearer bad.token' }));

    expect(handler).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. Error handling — handler throws
// ═════════════════════════════════════════════════════════════════════════════

describe('withAuth — handler errors', () => {
  it('propagates handler errors to caller', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-1' });

    const wrapped = withAuth(
      async () => { throw new Error('Handler crashed'); },
      { keyProvider: makeKeyProvider() }
    );

    await expect(
      wrapped(makeRequest({ authHeader: 'Bearer valid.token' }))
    ).rejects.toThrow('Handler crashed');
  });

  it('does not corrupt state when handler throws', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-1' });

    const wrapped = withAuth(
      async () => { throw new Error('crash'); },
      { keyProvider: makeKeyProvider() }
    );

    // First call crashes
    await expect(
      wrapped(makeRequest({ authHeader: 'Bearer tok' }))
    ).rejects.toThrow();

    // Second call should still work normally
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-2' });
    const handler2 = jest.fn().mockResolvedValue(new Response('ok'));
    const wrapped2 = withAuth(handler2, { keyProvider: makeKeyProvider() });
    const res = await wrapped2(makeRequest({ authHeader: 'Bearer tok2' }));
    expect(res.status).toBe(200);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. Options passthrough
// ═════════════════════════════════════════════════════════════════════════════

describe('withAuth — options', () => {
  it('passes issuer and audience to verifyAccessToken', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'u1' });

    const wrapped = withAuth(
      async () => new Response('ok'),
      {
        keyProvider: makeKeyProvider(),
        issuer: 'https://auth.example.com',
        audience: 'my-api',
      }
    );

    await wrapped(makeRequest({ authHeader: 'Bearer tok' }));

    expect(mockVerifyAccessToken).toHaveBeenCalledWith(
      'tok',
      expect.objectContaining({
        issuer: 'https://auth.example.com',
        audience: 'my-api',
      })
    );
  });

  it('supports async handlers', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'u1' });

    const wrapped = withAuth(
      async (_req, ctx) => {
        await new Promise(r => setTimeout(r, 10));
        return new Response(JSON.stringify({ userId: ctx.userId }));
      },
      { keyProvider: makeKeyProvider() }
    );

    const res = await wrapped(makeRequest({ authHeader: 'Bearer tok' }));
    const body = await res.json();
    expect(body.userId).toBe('u1');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. Security — JWT attack scenarios
// ═════════════════════════════════════════════════════════════════════════════

describe('withAuth — security', () => {
  it('rejects none algorithm attack (verifyAccessToken throws)', async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error('Unsupported algorithm: none'));

    const handler = jest.fn();
    const wrapped = withAuth(handler, { keyProvider: makeKeyProvider() });

    const res = await wrapped(makeRequest({ authHeader: 'Bearer eyAlg.none.token' }));
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects expired token', async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error('Token expired'));

    const handler = jest.fn();
    const wrapped = withAuth(handler, { keyProvider: makeKeyProvider() });

    const res = await wrapped(makeRequest({ authHeader: 'Bearer expired.token' }));
    expect(res.status).toBe(401);
  });

  it('handles extremely large Authorization header gracefully', async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error('Invalid token'));

    const wrapped = withAuth(jest.fn(), { keyProvider: makeKeyProvider() });
    const largeToken = 'x'.repeat(100000);
    const res = await wrapped(makeRequest({ authHeader: `Bearer ${largeToken}` }));

    expect(res.status).toBe(401);
  });
});