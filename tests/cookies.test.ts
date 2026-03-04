/**
 * Tests for cookie utilities
 * Covers: getSecureCookieOptions, createAuthCookie, deleteAuthCookie
 */

// ── Mock @periodic/tungsten cookie serializer ─────────────────────────────────
const mockSerializeCookie = jest.fn();
jest.mock('@periodic/tungsten', () => ({
  serializeCookie: (...args: unknown[]) => mockSerializeCookie(...args),
}));

import {
  getSecureCookieOptions,
  createAuthCookie,
  deleteAuthCookie,
} from '../../periodic-tungsten-next/src/cookies';

beforeEach(() => {
  jest.clearAllMocks();
  // Default mock — returns a realistic cookie string
  mockSerializeCookie.mockImplementation(
    (name: string, value: string, opts: any) =>
      `${name}=${value}; Path=${opts.path ?? '/'}; Max-Age=${opts.maxAge ?? 0}` +
      (opts.httpOnly ? '; HttpOnly' : '') +
      (opts.secure ? '; Secure' : '') +
      (opts.sameSite ? `; SameSite=${opts.sameSite}` : '')
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. getSecureCookieOptions
// ═════════════════════════════════════════════════════════════════════════════

describe('getSecureCookieOptions', () => {
  it('returns httpOnly=true always', () => {
    const opts = getSecureCookieOptions(true);
    expect(opts.httpOnly).toBe(true);
  });

  it('returns secure=true in production', () => {
    const opts = getSecureCookieOptions(true);
    expect(opts.secure).toBe(true);
  });

  it('returns secure=false in development', () => {
    const opts = getSecureCookieOptions(false);
    expect(opts.secure).toBe(false);
  });

  it('returns sameSite=lax', () => {
    const opts = getSecureCookieOptions(true);
    expect(opts.sameSite).toBe('lax');
  });

  it('returns path=/', () => {
    const opts = getSecureCookieOptions();
    expect(opts.path).toBe('/');
  });

  it('returns maxAge of 7 days (604800 seconds)', () => {
    const opts = getSecureCookieOptions(true);
    expect(opts.maxAge).toBe(7 * 24 * 60 * 60);
  });

  it('defaults to production (secure=true) when no argument', () => {
    const opts = getSecureCookieOptions();
    expect(opts.secure).toBe(true);
  });

  it('returns name=auth_token', () => {
    const opts = getSecureCookieOptions(true);
    expect(opts.name).toBe('auth_token');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. createAuthCookie
// ═════════════════════════════════════════════════════════════════════════════

describe('createAuthCookie', () => {
  it('calls serializeCookie with auth_token name and provided token', () => {
    createAuthCookie('my.jwt.token');

    expect(mockSerializeCookie).toHaveBeenCalledWith(
      'auth_token',
      'my.jwt.token',
      expect.any(Object)
    );
  });

  it('uses secure defaults from getSecureCookieOptions', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    createAuthCookie('tok');

    expect(mockSerializeCookie).toHaveBeenCalledWith(
      'auth_token',
      'tok',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' })
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('merges custom options over defaults', () => {
    createAuthCookie('tok', { maxAge: 3600, sameSite: 'strict' } as any);

    expect(mockSerializeCookie).toHaveBeenCalledWith(
      'auth_token',
      'tok',
      expect.objectContaining({ maxAge: 3600, sameSite: 'strict' })
    );
  });

  it('returns the serialized cookie string from serializeCookie', () => {
    mockSerializeCookie.mockReturnValue('auth_token=tok; HttpOnly; Secure');
    const result = createAuthCookie('tok');
    expect(result).toBe('auth_token=tok; HttpOnly; Secure');
  });

  it('handles empty token string', () => {
    createAuthCookie('');
    expect(mockSerializeCookie).toHaveBeenCalledWith('auth_token', '', expect.any(Object));
  });

  it('handles very long token (10000 chars)', () => {
    const longToken = 'a'.repeat(10000);
    createAuthCookie(longToken);
    expect(mockSerializeCookie).toHaveBeenCalledWith('auth_token', longToken, expect.any(Object));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. deleteAuthCookie
// ═════════════════════════════════════════════════════════════════════════════

describe('deleteAuthCookie', () => {
  it('calls serializeCookie with empty value', () => {
    deleteAuthCookie();

    expect(mockSerializeCookie).toHaveBeenCalledWith(
      'auth_token',
      '',
      expect.any(Object)
    );
  });

  it('sets maxAge=0 to expire the cookie', () => {
    deleteAuthCookie();

    expect(mockSerializeCookie).toHaveBeenCalledWith(
      'auth_token',
      '',
      expect.objectContaining({ maxAge: 0 })
    );
  });

  it('preserves httpOnly and other security options', () => {
    deleteAuthCookie();

    expect(mockSerializeCookie).toHaveBeenCalledWith(
      'auth_token',
      '',
      expect.objectContaining({ httpOnly: true, path: '/' })
    );
  });

  it('merges custom options', () => {
    deleteAuthCookie({ path: '/admin' } as any);

    expect(mockSerializeCookie).toHaveBeenCalledWith(
      'auth_token',
      '',
      expect.objectContaining({ path: '/admin', maxAge: 0 })
    );
  });

  it('returns the serialized deletion cookie string', () => {
    mockSerializeCookie.mockReturnValue('auth_token=; Max-Age=0; HttpOnly');
    const result = deleteAuthCookie();
    expect(result).toBe('auth_token=; Max-Age=0; HttpOnly');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. Security attributes validation
// ═════════════════════════════════════════════════════════════════════════════

describe('cookie security', () => {
  it('createAuthCookie in production includes Secure flag', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    mockSerializeCookie.mockImplementation((_name, _val, opts) =>
      opts.secure ? 'has-secure' : 'no-secure'
    );

    const result = createAuthCookie('tok');
    expect(result).toBe('has-secure');

    process.env.NODE_ENV = originalEnv;
  });

  it('createAuthCookie in development omits Secure flag', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    mockSerializeCookie.mockImplementation((_name, _val, opts) =>
      opts.secure ? 'has-secure' : 'no-secure'
    );

    const result = createAuthCookie('tok');
    expect(result).toBe('no-secure');

    process.env.NODE_ENV = originalEnv;
  });
});