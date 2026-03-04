/**
 * @periodic/tungsten-next
 * Official Next.js integration for Tungsten authentication
 */

export { getServerAuth } from './server/auth';
export { tungstenMiddleware } from './middleware';
export { withAuth } from './api/withAuth';
export { getSecureCookieOptions, createAuthCookie, deleteAuthCookie } from './cookies';

export type { ServerAuthOptions, AuthContext } from './server/auth';
export type { MiddlewareOptions } from './middleware';
export type { AuthenticatedContext, AuthenticatedHandler, WithAuthOptions } from './api/withAuth';
