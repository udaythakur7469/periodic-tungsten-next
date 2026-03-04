/**
 * Tests for getServerAuth
 * Covers: JWT mode, session mode, error handling, edge cases
 */

import { getServerAuth } from '../../periodic-tungsten-next/src/server/auth';

// ── Mock next/headers ────────────────────────────────────────────────────────
const mockGetCookie = jest.fn();
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: mockGetCookie,
  }),
}));

// ── Mock @periodic/tungsten ───────────────────────────────────────────────────
const mockVerifyAccessToken = jest.fn();
jest.mock('@periodic/tungsten', () => ({
  verifyAccessToken: (...args: unknown[]) => mockVerifyAccessToken(...args),
}));

// ── Mock @periodic/tungsten-session ──────────────────────────────────────────
const mockValidateSession = jest.fn();
jest.mock('@periodic/tungsten-session', () => ({
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeKeyProvider = () => ({
  getSigningKey: jest.fn(),
  getVerificationKey: jest.fn(),
});

const makeSessionStorage = () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. JWT MODE — valid scenarios
// ═════════════════════════════════════════════════════════════════════════════

describe('getServerAuth — JWT mode — valid', () => {
  it('returns authenticated=true with userId when token is valid', async () => {
    mockGetCookie.mockReturnValue({ value: 'valid.jwt.token' });
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-123', email: 'a@b.com' });

    const result = await getServerAuth({
      mode: 'jwt',
      keyProvider: makeKeyProvider(),
    });

    expect(result.authenticated).toBe(true);
    expect(result.userId).toBe('user-123');
    expect(result.user).toMatchObject({ sub: 'user-123', email: 'a@b.com' });
  });

  it('passes issuer and audience to verifyAccessToken', async () => {
    mockGetCookie.mockReturnValue({ value: 'valid.jwt.token' });
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-456' });
    const kp = makeKeyProvider();

    await getServerAuth({
      mode: 'jwt',
      keyProvider: kp,
      issuer: 'https://auth.example.com',
      audience: 'my-app',
    });

    expect(mockVerifyAccessToken).toHaveBeenCalledWith(
      'valid.jwt.token',
      expect.objectContaining({ issuer: 'https://auth.example.com', audience: 'my-app' })
    );
  });

  it('uses custom cookieName when provided', async () => {
    mockGetCookie.mockImplementation((name: string) =>
      name === 'my_custom_cookie' ? { value: 'custom.token' } : undefined
    );
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-789' });

    const result = await getServerAuth({
      mode: 'jwt',
      keyProvider: makeKeyProvider(),
      cookieName: 'my_custom_cookie',
    });

    expect(result.authenticated).toBe(true);
    expect(mockGetCookie).toHaveBeenCalledWith('my_custom_cookie');
  });

  it('handles large JWT payload without error', async () => {
    mockGetCookie.mockReturnValue({ value: 'large.jwt.token' });
    const largePayload = {
      sub: 'user-large',
      data: 'x'.repeat(10000),
      roles: Array(100).fill('role'),
    };
    mockVerifyAccessToken.mockResolvedValue(largePayload);

    const result = await getServerAuth({ mode: 'jwt', keyProvider: makeKeyProvider() });

    expect(result.authenticated).toBe(true);
    expect(result.userId).toBe('user-large');
  });

  it('supports async keyProvider', async () => {
    mockGetCookie.mockReturnValue({ value: 'async.jwt.token' });
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-async' });

    const asyncKeyProvider = {
      getSigningKey: jest.fn().mockResolvedValue({ kid: 'k1', algorithm: 'HS256', key: 'secret' }),
      getVerificationKey: jest.fn().mockResolvedValue({ kid: 'k1', algorithm: 'HS256', key: 'secret' }),
    };

    const result = await getServerAuth({ mode: 'jwt', keyProvider: asyncKeyProvider });
    expect(result.authenticated).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. JWT MODE — missing/invalid token scenarios
// ═════════════════════════════════════════════════════════════════════════════

describe('getServerAuth — JWT mode — invalid/missing', () => {
  it('returns authenticated=false when cookie is missing', async () => {
    mockGetCookie.mockReturnValue(undefined);

    const result = await getServerAuth({ mode: 'jwt', keyProvider: makeKeyProvider() });

    expect(result.authenticated).toBe(false);
    expect(result.user).toBeNull();
    expect(result.userId).toBeUndefined();
  });

  it('returns authenticated=false when verifyAccessToken throws (expired token)', async () => {
    mockGetCookie.mockReturnValue({ value: 'expired.token' });
    mockVerifyAccessToken.mockRejectedValue(new Error('Token expired'));

    const result = await getServerAuth({ mode: 'jwt', keyProvider: makeKeyProvider() });

    expect(result.authenticated).toBe(false);
    expect(result.user).toBeNull();
  });

  it('returns authenticated=false for tampered JWT signature', async () => {
    mockGetCookie.mockReturnValue({ value: 'tampered.jwt.token' });
    mockVerifyAccessToken.mockRejectedValue(new Error('Signature verification failed'));

    const result = await getServerAuth({ mode: 'jwt', keyProvider: makeKeyProvider() });

    expect(result.authenticated).toBe(false);
  });

  it('returns authenticated=false for malformed JWT structure', async () => {
    mockGetCookie.mockReturnValue({ value: 'notajwt' });
    mockVerifyAccessToken.mockRejectedValue(new Error('Invalid JWT format'));

    const result = await getServerAuth({ mode: 'jwt', keyProvider: makeKeyProvider() });

    expect(result.authenticated).toBe(false);
  });

  it('throws (caught) when keyProvider is missing in JWT mode', async () => {
    mockGetCookie.mockReturnValue({ value: 'some.token' });

    const result = await getServerAuth({ mode: 'jwt' } as any);

    expect(result.authenticated).toBe(false);
  });

  it('returns authenticated=false when keyProvider throws', async () => {
    mockGetCookie.mockReturnValue({ value: 'some.token' });
    mockVerifyAccessToken.mockRejectedValue(new Error('Key fetch failed'));

    const result = await getServerAuth({ mode: 'jwt', keyProvider: makeKeyProvider() });

    expect(result.authenticated).toBe(false);
  });

  it('does not leak stack traces — never throws to caller', async () => {
    mockGetCookie.mockReturnValue({ value: 'bad.token' });
    mockVerifyAccessToken.mockRejectedValue(new Error('Internal error with stack'));

    await expect(
      getServerAuth({ mode: 'jwt', keyProvider: makeKeyProvider() })
    ).resolves.toMatchObject({ authenticated: false });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. SESSION MODE — valid scenarios
// ═════════════════════════════════════════════════════════════════════════════

describe('getServerAuth — session mode — valid', () => {
  it('returns authenticated=true with userId when session is valid', async () => {
    mockGetCookie.mockReturnValue({ value: 'session-token-abc' });
    mockValidateSession.mockResolvedValue({
      valid: true,
      session: { userId: 'user-session-1', email: 's@b.com' },
    });

    const result = await getServerAuth({
      mode: 'session',
      sessionStorage: makeSessionStorage(),
    });

    expect(result.authenticated).toBe(true);
    expect(result.userId).toBe('user-session-1');
  });

  it('returns authenticated=false when session is invalid', async () => {
    mockGetCookie.mockReturnValue({ value: 'bad-session-token' });
    mockValidateSession.mockResolvedValue({ valid: false, session: null });

    const result = await getServerAuth({
      mode: 'session',
      sessionStorage: makeSessionStorage(),
    });

    expect(result.authenticated).toBe(false);
    expect(result.user).toBeNull();
  });

  it('returns authenticated=false when sessionStorage is missing', async () => {
    mockGetCookie.mockReturnValue({ value: 'session-token' });

    const result = await getServerAuth({ mode: 'session' } as any);

    expect(result.authenticated).toBe(false);
  });

  it('returns authenticated=false when validateSession throws', async () => {
    mockGetCookie.mockReturnValue({ value: 'session-token' });
    mockValidateSession.mockRejectedValue(new Error('Storage unavailable'));

    const result = await getServerAuth({
      mode: 'session',
      sessionStorage: makeSessionStorage(),
    });

    expect(result.authenticated).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. No cross-request state contamination
// ═════════════════════════════════════════════════════════════════════════════

describe('getServerAuth — isolation', () => {
  it('does not share state between calls', async () => {
    // First call — authenticated
    mockGetCookie.mockReturnValueOnce({ value: 'valid.token' });
    mockVerifyAccessToken.mockResolvedValueOnce({ sub: 'user-A' });
    const result1 = await getServerAuth({ mode: 'jwt', keyProvider: makeKeyProvider() });

    // Second call — unauthenticated
    mockGetCookie.mockReturnValueOnce(undefined);
    const result2 = await getServerAuth({ mode: 'jwt', keyProvider: makeKeyProvider() });

    expect(result1.authenticated).toBe(true);
    expect(result1.userId).toBe('user-A');
    expect(result2.authenticated).toBe(false);
    expect(result2.userId).toBeUndefined();
  });

  it('handles 50 concurrent calls without cross-contamination', async () => {
    mockVerifyAccessToken.mockImplementation(async (token: string) => {
      await new Promise(r => setTimeout(r, Math.random() * 5));
      return { sub: `user-${token}` };
    });

    const calls = Array.from({ length: 50 }, (_, i) => {
      mockGetCookie.mockReturnValueOnce({ value: `token-${i}` });
      return getServerAuth({ mode: 'jwt', keyProvider: makeKeyProvider() });
    });

    const results = await Promise.all(calls);
    results.forEach((r, i) => {
      expect(r.authenticated).toBe(true);
      expect(r.userId).toBe(`user-token-${i}`);
    });
  });
});