import crypto from 'node:crypto';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const FALLBACK_RUNTIME_SECRET = crypto.randomBytes(32).toString('hex');

export function getJwtSecret(): string {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured && configured.length >= 16) {
    return configured;
  }
  return FALLBACK_RUNTIME_SECRET;
}

export const ADMIN_COOKIE_NAME = 'studio_session';
export const USER_COOKIE_NAME = 'member_session';
export const CSRF_COOKIE_NAME = 'studio_csrf';
export const VISITOR_COOKIE_NAME = 'studio_visit';

export interface AdminTokenPayload {
  sub: number;
  username: string;
  email: string;
  role: 'admin';
}

export interface UserTokenPayload {
  sub: number;
  email: string;
  role: 'user' | 'admin';
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '8h' });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload;
    if (
      typeof decoded.sub === 'number' &&
      typeof decoded.username === 'string' &&
      decoded.role === 'admin'
    ) {
      return {
        sub: decoded.sub,
        username: decoded.username,
        email: typeof decoded.email === 'string' ? decoded.email : '',
        role: 'admin',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function signUserToken(payload: UserTokenPayload, rememberMe = false): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: rememberMe ? '30d' : '1d' });
}

export function verifyUserToken(token: string): UserTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload;
    if (
      typeof decoded.sub === 'number' &&
      typeof decoded.email === 'string' &&
      (decoded.role === 'user' || decoded.role === 'admin')
    ) {
      return {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function isSecureRequest(req: Request): boolean {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  return req.secure || proto === 'https';
}

export function getAppCookieOptions(
  req: Request,
  maxAge: number,
  httpOnly: boolean,
): CookieOptions {
  const isHttps = isSecureRequest(req);
  const opts: CookieOptions & { partitioned?: boolean } = {
    httpOnly,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
    maxAge,
  };
  if (isHttps) {
    opts.partitioned = true;
  }
  return opts;
}

export function getClearCookieOptions(req: Request, httpOnly: boolean): CookieOptions {
  const isHttps = isSecureRequest(req);
  const opts: CookieOptions & { partitioned?: boolean } = {
    httpOnly,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
  };
  if (isHttps) {
    opts.partitioned = true;
  }
  return opts;
}

export function isAllowedOrigin(origin: string | undefined, req: Request): boolean {
  if (!origin) return true;

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  const reqHost = req.get('host')?.toLowerCase();
  if (reqHost && parsed.host.toLowerCase() === reqHost) {
    return true;
  }

  const appUrl = process.env.APP_URL?.trim();
  if (appUrl && appUrl !== 'MY_APP_URL') {
    try {
      if (new URL(appUrl).origin === parsed.origin) {
        return true;
      }
    } catch {
      // ignore invalid APP_URL
    }
  }

  const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (extraOrigins.includes(parsed.origin)) {
    return true;
  }

  // Allow AI Studio preview/shared Cloud Run hosts & localhost dev
  if (
    parsed.protocol === 'https:' &&
    (parsed.hostname === 'aistudio.google.com' ||
      /^[a-z0-9-]+\.(?:[a-z0-9-]+\.)?run\.app$/i.test(parsed.hostname))
  ) {
    return true;
  }

  if (
    (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
    (parsed.protocol === 'http:' || parsed.protocol === 'https:')
  ) {
    return true;
  }

  return false;
}

function createSignedCsrfToken(): string {
  const nonce = crypto.randomBytes(24).toString('hex');
  const issuedAt = Date.now().toString(36);
  const payload = `${nonce}.${issuedAt}`;
  const sig = crypto.createHmac('sha256', getJwtSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifySignedCsrfToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [nonce, issuedAtStr, sig] = parts;
  if (!nonce || !issuedAtStr || !sig) return false;

  const issuedAt = Number.parseInt(issuedAtStr, 36);
  if (!Number.isFinite(issuedAt)) return false;

  // 12 hours max lifetime
  if (Date.now() - issuedAt > 1000 * 60 * 60 * 12) return false;

  const expected = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${nonce}.${issuedAtStr}`)
    .digest('hex');

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function issueCsrfCookie(req: Request, res: Response): string {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  const token =
    typeof existing === 'string' && verifySignedCsrfToken(existing)
      ? existing
      : createSignedCsrfToken();

  res.cookie(CSRF_COOKIE_NAME, token, getAppCookieOptions(req, 1000 * 60 * 60 * 12, false));
  return token;
}

export function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  if (origin && !isAllowedOrigin(origin, req)) {
    res.status(403).json({ error: 'Cross-origin request blocked by CORS policy.' });
    return;
  }

  const headerToken = req.headers['x-csrf-token'];
  if (typeof headerToken !== 'string' || !headerToken) {
    res.status(403).json({ error: 'Missing security token. Please refresh and try again.' });
    return;
  }

  // Primary check: HMAC-signed stateless CSRF token (works even when 3rd-party iframe cookies are blocked)
  if (verifySignedCsrfToken(headerToken)) {
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    if (typeof cookieToken === 'string' && cookieToken.length > 0) {
      const a = Buffer.from(cookieToken);
      const b = Buffer.from(headerToken);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        res.status(403).json({ error: 'Security token mismatch. Please refresh and try again.' });
        return;
      }
    }
    next();
    return;
  }

  res.status(403).json({ error: 'Invalid or expired security token. Please refresh and try again.' });
}

export interface AuthenticatedRequest extends Request {
  admin?: AdminTokenPayload;
  authUser?: UserTokenPayload;
}

export function requireAdminAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const adminToken = req.cookies?.[ADMIN_COOKIE_NAME];
  if (typeof adminToken === 'string' && adminToken) {
    const payload = verifyAdminToken(adminToken);
    if (payload) {
      req.admin = payload;
      next();
      return;
    }
  }

  const memberToken = req.cookies?.[USER_COOKIE_NAME];
  if (typeof memberToken === 'string' && memberToken && verifyUserToken(memberToken)) {
    res.status(403).json({ error: 'Forbidden: Administrator access required.' });
    return;
  }

  res.status(401).json({ error: 'Unauthorized' });
}

export function requireUserAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const memberToken = req.cookies?.[USER_COOKIE_NAME];
  if (typeof memberToken !== 'string' || !memberToken) {
    res.status(401).json({ error: 'Please sign in to continue.' });
    return;
  }
  const payload = verifyUserToken(memberToken);
  if (!payload) {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
    return;
  }
  req.authUser = payload;
  next();
}

export function attachOptionalUser(req: AuthenticatedRequest): UserTokenPayload | null {
  const memberToken = req.cookies?.[USER_COOKIE_NAME];
  if (typeof memberToken !== 'string' || !memberToken) return null;
  const payload = verifyUserToken(memberToken);
  if (payload) req.authUser = payload;
  return payload;
}

export function sanitizePlainText(input: string, maxLen = 4000): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}

export function sanitizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/seed-assets/')) {
    return trimmed;
  }
  if (/^mailto:[^\s<>]+$/i.test(trimmed)) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

export function validateMediaMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mimeType === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (mimeType === 'video/mp4') {
    return buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  }
  if (mimeType === 'video/webm') {
    return (
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    );
  }
  return false;
}

export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip || 'unknown').digest('hex').slice(0, 16);
}

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}
