import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';
import { db, initDatabase } from './server/db.ts';
import {
  ADMIN_COOKIE_NAME,
  USER_COOKIE_NAME,
  VISITOR_COOKIE_NAME,
  attachOptionalUser,
  getAppCookieOptions,
  getClearCookieOptions,
  hashIp,
  hashResetToken,
  isAllowedOrigin,
  issueCsrfCookie,
  requireAdminAuth,
  requireUserAuth,
  sanitizePlainText,
  sanitizeUrl,
  signAdminToken,
  signUserToken,
  validateMediaMagicBytes,
  verifyCsrf,
  verifyUserToken,
} from './server/security.ts';
import type { AuthenticatedRequest } from './server/security.ts';
import { sendContactEmail } from './server/mailer.ts';
import {
  DEFAULT_SITE_CONTENT,
  DEFAULT_USER_PREFERENCES,
  seedDatabase,
} from './server/seed.ts';
import type {
  ActivityLogItem,
  AdminUserSummary,
  ContactMessage,
  FashionDesignItem,
  KitchenGardenPost,
  ProjectItem,
  SiteContent,
  TeachingClassItem,
  UserNotification,
  UserPreferences,
  UserProfile,
} from './src/types/portfolio.ts';

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

initDatabase();
seedDatabase();

const uploadsDir = path.join(process.cwd(), 'uploads');
const seedAssetsDir = path.join(process.cwd(), 'src', 'assets', 'images');
fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
app.set('trust proxy', 1);

app.use(
  helmet({
    frameguard: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        frameAncestors: ["'self'", 'https://aistudio.google.com', 'https://*.run.app', 'https:'],
        upgradeInsecureRequests: IS_PROD ? [] : null,
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use((req, res, next) => {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  if (origin) {
    if (!isAllowedOrigin(origin, req)) {
      if (req.path.startsWith('/api')) {
        res.status(403).json({ error: 'Cross-origin request blocked by CORS policy.' });
        return;
      }
      next();
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, Authorization');
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.use(
  '/uploads',
  express.static(uploadsDir, {
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    },
  }),
);

app.use(
  '/seed-assets',
  express.static(seedAssetsDir, {
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=604800');
    },
  }),
);

// Rate Limiters
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages sent recently. Please try again in 15 minutes.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

// Media upload handler (images <= 5 MB, short video clips <= 25 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP images and MP4 or WebM videos are permitted.'));
    }
  },
});

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, or WebP images up to 3 MB are allowed.'));
    }
  },
});

function parseStringArray(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function logActivity(actorType: string, actorId: number | null, actorName: string, action: string): void {
  db.prepare(
    `INSERT INTO activity_logs (actor_type, actor_id, actor_name, action, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(actorType, actorId, sanitizePlainText(actorName, 120), sanitizePlainText(action, 240), new Date().toISOString());
}

function readSiteContent(): SiteContent {
  const rows = db.prepare('SELECT key, value FROM site_content').all() as Array<{
    key: string;
    value: string;
  }>;
  const content: Record<string, unknown> = { ...DEFAULT_SITE_CONTENT };
  for (const row of rows) {
    try {
      content[row.key] = JSON.parse(row.value);
    } catch {
      // keep default
    }
  }
  return content as unknown as SiteContent;
}

interface RawFashionRow {
  id: number;
  slug: string;
  title: string;
  category: string;
  fabric: string;
  summary: string;
  description: string;
  images: string;
  featured: number;
  published: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapFashionRow(row: RawFashionRow): FashionDesignItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    fabric: row.fabric,
    summary: row.summary,
    description: row.description,
    images: parseStringArray(row.images),
    featured: row.featured === 1,
    published: row.published === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface RawProjectRow {
  id: number;
  slug: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  tools: string;
  images: string;
  external_url: string;
  featured: number;
  published: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapProjectRow(row: RawProjectRow): ProjectItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    description: row.description,
    tools: parseStringArray(row.tools),
    images: parseStringArray(row.images),
    externalUrl: row.external_url || '',
    featured: row.featured === 1,
    published: row.published === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface RawTeachingRow {
  id: number;
  slug: string;
  title: string;
  category: string;
  student_level: string;
  summary: string;
  description: string;
  images: string;
  video_url: string;
  featured: number;
  published: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapTeachingRow(row: RawTeachingRow): TeachingClassItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    studentLevel: row.student_level,
    summary: row.summary,
    description: row.description,
    images: parseStringArray(row.images),
    videoUrl: row.video_url || '',
    featured: row.featured === 1,
    published: row.published === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface RawKitchenGardenRow {
  id: number;
  slug: string;
  title: string;
  category: string;
  summary: string;
  note: string;
  ingredients: string;
  steps: string;
  images: string;
  featured: number;
  published: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapKitchenGardenRow(row: RawKitchenGardenRow): KitchenGardenPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    note: row.note,
    ingredients: parseStringArray(row.ingredients),
    steps: parseStringArray(row.steps),
    images: parseStringArray(row.images),
    featured: row.featured === 1,
    published: row.published === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface RawUserRow {
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  role: string;
  avatar_url: string;
  phone: string;
  location: string;
  bio: string;
  preferences_json: string;
  is_active: number;
  failed_attempts: number;
  locked_until: number | null;
  created_at: string;
  updated_at: string;
}

function parseUserPreferences(raw: string): UserPreferences {
  try {
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      ...DEFAULT_USER_PREFERENCES,
      ...parsed,
      notifications: {
        ...DEFAULT_USER_PREFERENCES.notifications,
        ...(parsed.notifications || {}),
      },
      privacy: {
        ...DEFAULT_USER_PREFERENCES.privacy,
        ...(parsed.privacy || {}),
      },
    };
  } catch {
    return DEFAULT_USER_PREFERENCES;
  }
}

function mapUserProfile(row: RawUserRow): UserProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role === 'admin' ? 'admin' : 'user',
    avatarUrl: row.avatar_url || '',
    phone: row.phone || '',
    location: row.location || '',
    bio: row.bio || '',
    preferences: parseUserPreferences(row.preferences_json),
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  return `${base || 'item'}-${crypto.randomBytes(2).toString('hex')}`;
}

// Robots.txt
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /studio-login',
      'Disallow: /studio-admin',
      'Disallow: /dashboard',
      'Disallow: /api/admin/',
      'Disallow: /api/user/',
      '',
    ].join('\n'),
  );
});

// CSRF token issuance
app.get('/api/csrf-token', (req, res) => {
  const token = issueCsrfCookie(req, res);
  res.json({ csrfToken: token });
});

// Public read-only portfolio endpoint (tracks unique session visitors cleanly)
app.get('/api/portfolio', (req, res) => {
  const hasVisitCookie = Boolean(req.cookies?.[VISITOR_COOKIE_NAME]);
  if (!hasVisitCookie) {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO site_metrics (key, count, updated_at) VALUES ('total_visitors', 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at`,
    ).run(now);
    res.cookie(VISITOR_COOKIE_NAME, '1', getAppCookieOptions(req, 1000 * 60 * 60 * 12, true));
  }

  const metricRow = db
    .prepare("SELECT count FROM site_metrics WHERE key = 'total_visitors'")
    .get() as { count: number } | undefined;

  const content = readSiteContent();
  const fashionDesigns = (
    db
      .prepare('SELECT * FROM fashion_designs WHERE published = 1 ORDER BY featured DESC, sort_order ASC, id DESC')
      .all() as RawFashionRow[]
  ).map(mapFashionRow);

  const projects = (
    db
      .prepare('SELECT * FROM projects WHERE published = 1 ORDER BY featured DESC, sort_order ASC, id DESC')
      .all() as RawProjectRow[]
  ).map(mapProjectRow);

  const teachingItems = (
    db
      .prepare('SELECT * FROM teaching_items WHERE published = 1 ORDER BY featured DESC, sort_order ASC, id DESC')
      .all() as RawTeachingRow[]
  ).map(mapTeachingRow);

  const kitchenGardenPosts = (
    db
      .prepare('SELECT * FROM kitchen_garden_posts WHERE published = 1 ORDER BY featured DESC, sort_order ASC, id DESC')
      .all() as RawKitchenGardenRow[]
  ).map(mapKitchenGardenRow);

  res.json({
    content,
    fashionDesigns,
    projects,
    teachingItems,
    kitchenGardenPosts,
    visitorCount: content.siteSettings?.showVisitorCounter ? metricRow?.count || 0 : undefined,
  });
});

// Public contact form endpoint
const contactSchema = z.object({
  name: z.string().min(2, 'Please provide your name.').max(120),
  email: z.string().email('Please provide a valid email address.').max(160),
  subject: z.string().min(2, 'Please include a short subject.').max(160),
  message: z.string().min(10, 'Message must be at least 10 characters.').max(3000),
  website: z.string().max(200).optional(),
});

app.post('/api/contact', contactLimiter, verifyCsrf, async (req: AuthenticatedRequest, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid form input.' });
    return;
  }

  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    res.status(200).json({ ok: true, emailSent: false, message: 'Thank you. Your message has been received.' });
    return;
  }

  const cleanName = sanitizePlainText(parsed.data.name, 120);
  const cleanEmail = sanitizePlainText(parsed.data.email, 160).toLowerCase();
  const cleanSubject = sanitizePlainText(parsed.data.subject, 160);
  const cleanMessage = sanitizePlainText(parsed.data.message, 3000);

  if (cleanName.length < 2 || cleanSubject.length < 2 || cleanMessage.length < 10) {
    res.status(400).json({ error: 'Please complete all required fields cleanly.' });
    return;
  }

  const signedInUser = attachOptionalUser(req);
  const userId = signedInUser ? signedInUser.sub : null;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO messages (user_id, name, email, subject, message, is_read, ip_hash, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
  ).run(userId, cleanName, cleanEmail, cleanSubject, cleanMessage, hashIp(req.ip || ''), now);

  logActivity('guest', userId, cleanName, `Submitted contact enquiry: "${cleanSubject}"`);

  const siteContent = readSiteContent();
  const recipientEmail = siteContent.contact?.email || 'surmilanodi5@gmail.com';
  const emailResult = await sendContactEmail({
    toEmail: recipientEmail,
    senderName: cleanName,
    senderEmail: cleanEmail,
    subject: cleanSubject,
    message: cleanMessage,
  });

  if (userId) {
    db.prepare(
      `INSERT INTO notifications (user_id, title, body, is_read, created_at)
       VALUES (?, ?, ?, 0, ?)`,
    ).run(
      userId,
      emailResult.sent ? 'Enquiry emailed & saved' : 'Enquiry saved to studio inbox',
      emailResult.sent
        ? `Your message "${cleanSubject}" has been sent to Most. Surmila Akter.`
        : `Your message "${cleanSubject}" was saved to the studio inbox for Most. Surmila Akter.`,
      now,
    );
  }

  if (emailResult.configured && !emailResult.sent) {
    console.error(`[Contact Email Error - ${emailResult.provider}]`, emailResult.error);
    res.status(502).json({
      error:
        'Your enquiry was saved to the studio inbox, but email delivery failed due to mail provider configuration. Please check your SMTP or Resend credentials.',
    });
    return;
  }

  if (!emailResult.configured) {
    res.status(201).json({
      ok: true,
      emailSent: false,
      message:
        'Your enquiry has been saved to the studio inbox. Automated email forwarding is not active yet because SMTP or Resend environment variables are not configured.',
    });
    return;
  }

  res.status(201).json({
    ok: true,
    emailSent: true,
    message: 'Thank you for reaching out. Your message has been sent and delivered.',
  });
});

// ==========================================
// USER AUTHENTICATION ENDPOINTS
// ==========================================

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters.').max(120),
    email: z.string().email('Please provide a valid email address.').max(160),
    password: z.string().min(8, 'Password must be at least 8 characters.').max(200),
    confirmPassword: z.string().min(8).max(200),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

app.post('/api/auth/register', loginLimiter, verifyCsrf, (req, res) => {
  const siteContent = readSiteContent();
  if (siteContent.siteSettings && siteContent.siteSettings.allowRegistration === false) {
    res.status(403).json({ error: 'New account registration is currently paused.' });
    return;
  }

  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration data.' });
    return;
  }

  const cleanName = sanitizePlainText(parsed.data.fullName, 120);
  const cleanEmail = parsed.data.email.trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail) as
    | { id: number }
    | undefined;
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const now = new Date().toISOString();
  const hash = bcrypt.hashSync(parsed.data.password, 12);
  const info = db
    .prepare(
      `INSERT INTO users (
        full_name, email, password_hash, role, avatar_url, phone, location, bio,
        preferences_json, is_active, failed_attempts, locked_until, created_at, updated_at
      ) VALUES (?, ?, ?, 'user', '', '', '', '', ?, 1, 0, NULL, ?, ?)`,
    )
    .run(cleanName, cleanEmail, hash, JSON.stringify(DEFAULT_USER_PREFERENCES), now, now);

  const userId = Number(info.lastInsertRowid);

  db.prepare(
    `INSERT INTO notifications (user_id, title, body, is_read, created_at)
     VALUES (?, ?, ?, 0, ?)`,
  ).run(
    userId,
    'Welcome to Surmila Nodi Studio',
    'You can now save portfolio projects, favorite services, and review your contact history here.',
    now,
  );

  logActivity('user', userId, cleanName, 'Registered a new member account');

  const token = signUserToken({ sub: userId, email: cleanEmail, role: 'user' }, false);
  res.cookie(USER_COOKIE_NAME, token, getAppCookieOptions(req, 1000 * 60 * 60 * 24, true));

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as RawUserRow;
  res.status(201).json({ ok: true, user: mapUserProfile(userRow) });
});

const userLoginSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(1).max(200),
  rememberMe: z.boolean().optional().default(false),
});

app.post('/api/auth/login', loginLimiter, verifyCsrf, (req, res) => {
  const parsed = userLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const cleanEmail = parsed.data.email.trim().toLowerCase();
  const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail) as
    | RawUserRow
    | undefined;

  if (!userRow) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  if (userRow.is_active !== 1) {
    res.status(403).json({ error: 'This account has been deactivated. Contact the site administrator.' });
    return;
  }

  const nowMs = Date.now();
  if (userRow.locked_until && userRow.locked_until > nowMs) {
    res.status(429).json({ error: 'Too many failed attempts. Please wait 15 minutes.' });
    return;
  }

  const matches = bcrypt.compareSync(parsed.data.password, userRow.password_hash);
  if (!matches) {
    const nextAttempts = (userRow.failed_attempts || 0) + 1;
    const lockUntil = nextAttempts >= 5 ? nowMs + 15 * 60 * 1000 : null;
    db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?').run(
      lockUntil ? 0 : nextAttempts,
      lockUntil,
      userRow.id,
    );
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(userRow.id);
  logActivity('user', userRow.id, userRow.full_name, 'Signed in to member dashboard');

  const remember = Boolean(parsed.data.rememberMe);
  const token = signUserToken(
    { sub: userRow.id, email: userRow.email, role: userRow.role === 'admin' ? 'admin' : 'user' },
    remember,
  );

  res.cookie(
    USER_COOKIE_NAME,
    token,
    getAppCookieOptions(req, remember ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 24, true),
  );

  res.json({ ok: true, user: mapUserProfile(userRow) });
});

app.post('/api/auth/logout', verifyCsrf, (req, res) => {
  res.clearCookie(USER_COOKIE_NAME, getClearCookieOptions(req, true));
  res.json({ ok: true });
});

app.get('/api/auth/session', (req, res) => {
  const token = req.cookies?.[USER_COOKIE_NAME];
  if (typeof token !== 'string' || !token) {
    res.json({ authenticated: false });
    return;
  }
  const payload = verifyUserToken(token);
  if (!payload) {
    res.json({ authenticated: false });
    return;
  }
  const userRow = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(payload.sub) as
    | RawUserRow
    | undefined;
  if (!userRow) {
    res.json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, user: mapUserProfile(userRow) });
});

// Forgot / Reset password (User)
app.post('/api/auth/forgot-password', loginLimiter, verifyCsrf, (req, res) => {
  const parsed = z.object({ email: z.string().email().max(160) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const userRow = db.prepare('SELECT id, full_name FROM users WHERE email = ?').get(email) as
    | { id: number; full_name: string }
    | undefined;

  if (userRow) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    db.prepare(
      `INSERT INTO password_resets (email, user_type, token_hash, expires_at, used, created_at)
       VALUES (?, 'user', ?, ?, 0, ?)`,
    ).run(email, hashResetToken(code), expiresAt, new Date().toISOString());

    console.info(`[Password Reset - User] Recovery code generated for ${email}: ${code}`);
    logActivity('user', userRow.id, userRow.full_name, 'Requested password recovery code');
  }

  res.json({
    ok: true,
    message:
      'If an account exists for that email, a 15-minute recovery code has been issued. Contact the site administrator or check server notifications to obtain your verification code.',
  });
});

app.post('/api/auth/reset-password', loginLimiter, verifyCsrf, (req, res) => {
  const schema = z.object({
    email: z.string().email().max(160),
    code: z.string().min(6).max(32),
    newPassword: z.string().min(8, 'Password must be at least 8 characters.').max(200),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid reset request.' });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const tokenHash = hashResetToken(parsed.data.code);
  const resetRow = db
    .prepare(
      `SELECT id, expires_at, used FROM password_resets
       WHERE email = ? AND user_type = 'user' AND token_hash = ?
       ORDER BY id DESC LIMIT 1`,
    )
    .get(email, tokenHash) as { id: number; expires_at: number; used: number } | undefined;

  if (!resetRow || resetRow.used === 1 || resetRow.expires_at < Date.now()) {
    res.status(400).json({ error: 'Invalid or expired recovery code.' });
    return;
  }

  const nextHash = bcrypt.hashSync(parsed.data.newPassword, 12);
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE email = ?').run(
    nextHash,
    now,
    email,
  );
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRow.id);

  const userRow = db.prepare('SELECT id, full_name FROM users WHERE email = ?').get(email) as
    | { id: number; full_name: string }
    | undefined;
  if (userRow) {
    db.prepare(
      `INSERT INTO notifications (user_id, title, body, is_read, created_at)
       VALUES (?, ?, ?, 0, ?)`,
    ).run(userRow.id, 'Password reset completed', 'Your account password was updated via recovery.', now);
    logActivity('user', userRow.id, userRow.full_name, 'Completed password reset');
  }

  res.json({ ok: true, message: 'Password updated. You can now sign in with your new password.' });
});

// ==========================================
// USER PROTECTED DASHBOARD ENDPOINTS
// ==========================================

app.get('/api/user/dashboard', requireUserAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.authUser!.sub;
  const userRow = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(userId) as
    | RawUserRow
    | undefined;

  if (!userRow) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }

  const user = mapUserProfile(userRow);
  const siteContent = readSiteContent();

  const savedRows = db
    .prepare('SELECT project_id FROM saved_projects WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as Array<{ project_id: number }>;
  const savedProjectIds = savedRows.map((r) => r.project_id);

  let savedProjects: ProjectItem[] = [];
  if (savedProjectIds.length > 0) {
    const placeholders = savedProjectIds.map(() => '?').join(',');
    savedProjects = (
      db
        .prepare(`SELECT * FROM projects WHERE published = 1 AND id IN (${placeholders})`)
        .all(...savedProjectIds) as RawProjectRow[]
    ).map(mapProjectRow);
  }

  const favRows = db
    .prepare('SELECT service_id FROM favorite_services WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as Array<{ service_id: string }>;
  const favoriteServiceIds = favRows.map((r) => r.service_id);
  const favoriteServices = siteContent.services.filter((s) => favoriteServiceIds.includes(s.id));

  const msgRows = db
    .prepare(
      `SELECT id, user_id, name, email, subject, message, is_read, created_at
       FROM messages
       WHERE user_id = ? OR LOWER(email) = LOWER(?)
       ORDER BY id DESC LIMIT 50`,
    )
    .all(userId, user.email) as Array<{
    id: number;
    user_id: number | null;
    name: string;
    email: string;
    subject: string;
    message: string;
    is_read: number;
    created_at: string;
  }>;

  const contactHistory: ContactMessage[] = msgRows.map((m) => ({
    id: m.id,
    userId: m.user_id,
    name: m.name,
    email: m.email,
    subject: m.subject,
    message: m.message,
    isRead: m.is_read === 1,
    createdAt: m.created_at,
  }));

  const notifRows = db
    .prepare('SELECT id, title, body, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 40')
    .all(userId) as Array<{ id: number; title: string; body: string; is_read: number; created_at: string }>;

  const notifications: UserNotification[] = notifRows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    isRead: n.is_read === 1,
    createdAt: n.created_at,
  }));

  const actRows = db
    .prepare(
      `SELECT id, actor_type, actor_name, action, created_at
       FROM activity_logs
       WHERE actor_type = 'user' AND actor_id = ?
       ORDER BY id DESC LIMIT 20`,
    )
    .all(userId) as Array<{ id: number; actor_type: string; actor_name: string; action: string; created_at: string }>;

  const activities: ActivityLogItem[] = actRows.map((a) => ({
    id: a.id,
    actorType: a.actor_type,
    actorName: a.actor_name,
    action: a.action,
    createdAt: a.created_at,
  }));

  res.json({
    user,
    savedProjectIds,
    savedProjects,
    favoriteServiceIds,
    favoriteServices,
    contactHistory,
    notifications,
    activities,
  });
});

app.put('/api/user/profile', requireUserAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    fullName: z.string().min(2).max(120),
    phone: z.string().max(40).optional().default(''),
    location: z.string().max(120).optional().default(''),
    bio: z.string().max(500).optional().default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile fields.' });
    return;
  }

  const userId = req.authUser!.sub;
  const cleanName = sanitizePlainText(parsed.data.fullName, 120);
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE users SET full_name = ?, phone = ?, location = ?, bio = ?, updated_at = ? WHERE id = ?`,
  ).run(
    cleanName,
    sanitizePlainText(parsed.data.phone, 40),
    sanitizePlainText(parsed.data.location, 120),
    sanitizePlainText(parsed.data.bio, 500),
    now,
    userId,
  );

  logActivity('user', userId, cleanName, 'Updated personal profile details');
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as RawUserRow;
  res.json({ ok: true, user: mapUserProfile(updated) });
});

const preferencesSchema = z.object({
  language: z.enum(['en', 'bn']),
  themeMode: z.enum(['dark', 'light']),
  accent: z.enum(['cyan', 'sky', 'emerald', 'teal']),
  fontSize: z.enum(['sm', 'md', 'lg']),
  reducedMotion: z.boolean(),
  highContrast: z.boolean(),
  enhancedFocus: z.boolean(),
  compactCards: z.boolean(),
  rememberLanguage: z.boolean(),
  notifications: z.object({
    emailReplies: z.boolean(),
    newProjects: z.boolean(),
    securityAlerts: z.boolean(),
  }),
  privacy: z.object({
    showProfileInNav: z.boolean(),
    allowAnalytics: z.boolean(),
  }),
});

app.put('/api/user/preferences', requireUserAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const parsed = preferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid preference settings.' });
    return;
  }
  const userId = req.authUser!.sub;
  db.prepare('UPDATE users SET preferences_json = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(parsed.data),
    new Date().toISOString(),
    userId,
  );
  res.json({ ok: true, preferences: parsed.data });
});

app.post('/api/user/change-password', requireUserAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().min(8, 'New password must be at least 8 characters.').max(200),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid password input.' });
    return;
  }

  const userId = req.authUser!.sub;
  const userRow = db.prepare('SELECT id, full_name, password_hash FROM users WHERE id = ?').get(userId) as
    | { id: number; full_name: string; password_hash: string }
    | undefined;

  if (!userRow) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  if (!bcrypt.compareSync(parsed.data.currentPassword, userRow.password_hash)) {
    res.status(401).json({ error: 'Current password is incorrect.' });
    return;
  }

  const now = new Date().toISOString();
  const nextHash = bcrypt.hashSync(parsed.data.newPassword, 12);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(nextHash, now, userId);

  db.prepare(
    `INSERT INTO notifications (user_id, title, body, is_read, created_at)
     VALUES (?, ?, ?, 0, ?)`,
  ).run(userId, 'Security update', 'Your account password was changed.', now);

  logActivity('user', userId, userRow.full_name, 'Changed account password');
  res.json({ ok: true, message: 'Password updated successfully.' });
});

app.post(
  '/api/user/avatar',
  requireUserAuth,
  verifyCsrf,
  (req, res, next) => {
    avatarUpload.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message || 'Avatar upload failed.' });
        return;
      }
      next();
    });
  },
  (req: AuthenticatedRequest, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No image file provided.' });
      return;
    }
    if (!validateMediaMagicBytes(file.buffer, file.mimetype)) {
      res.status(400).json({ error: 'Invalid JPEG, PNG, or WebP image file.' });
      return;
    }
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const filename = `avatar-${req.authUser!.sub}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${
      extMap[file.mimetype] || 'jpg'
    }`;
    fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
    const avatarUrl = `/uploads/${filename}`;

    db.prepare('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?').run(
      avatarUrl,
      new Date().toISOString(),
      req.authUser!.sub,
    );
    res.status(201).json({ avatarUrl });
  },
);

app.post('/api/user/saved-projects/:projectId', requireUserAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    res.status(400).json({ error: 'Invalid project id.' });
    return;
  }
  const exists = db.prepare('SELECT id FROM projects WHERE id = ? AND published = 1').get(projectId);
  if (!exists) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  db.prepare(
    `INSERT OR IGNORE INTO saved_projects (user_id, project_id, created_at) VALUES (?, ?, ?)`,
  ).run(req.authUser!.sub, projectId, new Date().toISOString());
  res.json({ ok: true });
});

app.delete('/api/user/saved-projects/:projectId', requireUserAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    res.status(400).json({ error: 'Invalid project id.' });
    return;
  }
  db.prepare('DELETE FROM saved_projects WHERE user_id = ? AND project_id = ?').run(
    req.authUser!.sub,
    projectId,
  );
  res.json({ ok: true });
});

app.post('/api/user/favorite-services/:serviceId', requireUserAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const serviceId = sanitizePlainText(String(req.params.serviceId || ''), 60);
  if (!serviceId) {
    res.status(400).json({ error: 'Invalid service id.' });
    return;
  }
  db.prepare(
    `INSERT OR IGNORE INTO favorite_services (user_id, service_id, created_at) VALUES (?, ?, ?)`,
  ).run(req.authUser!.sub, serviceId, new Date().toISOString());
  res.json({ ok: true });
});

app.delete('/api/user/favorite-services/:serviceId', requireUserAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const serviceId = sanitizePlainText(String(req.params.serviceId || ''), 60);
  db.prepare('DELETE FROM favorite_services WHERE user_id = ? AND service_id = ?').run(
    req.authUser!.sub,
    serviceId,
  );
  res.json({ ok: true });
});

app.patch('/api/user/notifications/:id/read', requireUserAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid notification id.' });
    return;
  }
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(
    id,
    req.authUser!.sub,
  );
  res.json({ ok: true });
});

app.post('/api/user/notifications/read-all', requireUserAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.authUser!.sub);
  res.json({ ok: true });
});

// ==========================================
// ADMIN AUTHENTICATION ENDPOINTS
// ==========================================

const adminLoginSchema = z.object({
  username: z.string().min(1).max(160),
  password: z.string().min(1).max(200),
});

interface AdminRow {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  failed_attempts: number;
  locked_until: number | null;
}

app.post('/api/admin/login', loginLimiter, verifyCsrf, (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ error: 'Invalid credentials.' });
    return;
  }

  const adminUser = db
    .prepare('SELECT id, username, email, password_hash, failed_attempts, locked_until FROM admin_users LIMIT 1')
    .get() as AdminRow | undefined;

  if (!adminUser) {
    res.status(503).json({
      error: 'Admin credentials are not configured on the server environment.',
    });
    return;
  }

  const nowMs = Date.now();
  if (adminUser.locked_until && adminUser.locked_until > nowMs) {
    res.status(429).json({
      error: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
    });
    return;
  }

  const identifier = parsed.data.username.trim().toLowerCase();
  const identifierMatches =
    identifier === adminUser.username.trim().toLowerCase() ||
    (adminUser.email && identifier === adminUser.email.trim().toLowerCase());
  const passwordMatches = bcrypt.compareSync(parsed.data.password, adminUser.password_hash);

  if (!identifierMatches || !passwordMatches) {
    const nextAttempts = (adminUser.failed_attempts || 0) + 1;
    const lockUntil = nextAttempts >= 5 ? nowMs + 15 * 60 * 1000 : null;
    db.prepare('UPDATE admin_users SET failed_attempts = ?, locked_until = ? WHERE id = ?').run(
      lockUntil ? 0 : nextAttempts,
      lockUntil,
      adminUser.id,
    );

    if (lockUntil) {
      res.status(429).json({
        error: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
      });
      return;
    }
    res.status(401).json({ error: 'Invalid credentials.' });
    return;
  }

  db.prepare('UPDATE admin_users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(
    adminUser.id,
  );

  logActivity('admin', adminUser.id, adminUser.username, 'Signed in to Studio Admin');

  const token = signAdminToken({
    sub: adminUser.id,
    username: adminUser.username,
    email: adminUser.email || '',
    role: 'admin',
  });
  res.cookie(ADMIN_COOKIE_NAME, token, getAppCookieOptions(req, 1000 * 60 * 60 * 8, true));

  res.json({ ok: true, username: adminUser.username, email: adminUser.email });
});

app.post('/api/admin/forgot-password', loginLimiter, verifyCsrf, (req, res) => {
  const parsed = z.object({ email: z.string().email().max(160) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const adminUser = db.prepare('SELECT id, username, email FROM admin_users LIMIT 1').get() as
    | { id: number; username: string; email: string }
    | undefined;

  if (adminUser && adminUser.email.toLowerCase() === email) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    db.prepare(
      `INSERT INTO password_resets (email, user_type, token_hash, expires_at, used, created_at)
       VALUES (?, 'admin', ?, ?, 0, ?)`,
    ).run(email, hashResetToken(code), expiresAt, new Date().toISOString());

    console.info(`[Password Reset - Admin] Recovery code generated for ${email}: ${code}`);
    logActivity('admin', adminUser.id, adminUser.username, 'Requested admin password reset code');
  }

  res.json({
    ok: true,
    message:
      'If that email matches the configured administrator account, a 15-minute reset code has been written to the secure server logs.',
  });
});

app.post('/api/admin/reset-password', loginLimiter, verifyCsrf, (req, res) => {
  const schema = z.object({
    email: z.string().email().max(160),
    code: z.string().min(6).max(32),
    newPassword: z.string().min(8, 'Password must be at least 8 characters.').max(200),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid reset input.' });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const resetRow = db
    .prepare(
      `SELECT id, expires_at, used FROM password_resets
       WHERE email = ? AND user_type = 'admin' AND token_hash = ?
       ORDER BY id DESC LIMIT 1`,
    )
    .get(email, hashResetToken(parsed.data.code)) as
    | { id: number; expires_at: number; used: number }
    | undefined;

  if (!resetRow || resetRow.used === 1 || resetRow.expires_at < Date.now()) {
    res.status(400).json({ error: 'Invalid or expired admin recovery code.' });
    return;
  }

  const nextHash = bcrypt.hashSync(parsed.data.newPassword, 12);
  db.prepare(
    `UPDATE admin_users SET password_hash = ?, password_overridden = 1, failed_attempts = 0, locked_until = NULL, updated_at = ?`,
  ).run(nextHash, new Date().toISOString());
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRow.id);

  logActivity('admin', null, email, 'Reset admin password using recovery verification');
  res.json({ ok: true, message: 'Admin password updated. Please sign in.' });
});

app.post('/api/admin/logout', verifyCsrf, (req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME, getClearCookieOptions(req, true));
  res.json({ ok: true });
});

app.get('/api/admin/session', (req: AuthenticatedRequest, res) => {
  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  if (typeof token !== 'string' || !token) {
    res.json({ authenticated: false });
    return;
  }
  requireAdminAuth(req, res, () => {
    res.json({ authenticated: true, username: req.admin?.username, email: req.admin?.email });
  });
});

// Admin overview
app.get('/api/admin/overview', requireAdminAuth, (_req, res) => {
  const content = readSiteContent();

  const fashionDesigns = (
    db.prepare('SELECT * FROM fashion_designs ORDER BY sort_order ASC, id DESC').all() as RawFashionRow[]
  ).map(mapFashionRow);

  const projects = (
    db.prepare('SELECT * FROM projects ORDER BY sort_order ASC, id DESC').all() as RawProjectRow[]
  ).map(mapProjectRow);

  const teachingItems = (
    db.prepare('SELECT * FROM teaching_items ORDER BY sort_order ASC, id DESC').all() as RawTeachingRow[]
  ).map(mapTeachingRow);

  const kitchenGardenPosts = (
    db
      .prepare('SELECT * FROM kitchen_garden_posts ORDER BY sort_order ASC, id DESC')
      .all() as RawKitchenGardenRow[]
  ).map(mapKitchenGardenRow);

  const messageRows = db
    .prepare('SELECT id, user_id, name, email, subject, message, is_read, created_at FROM messages ORDER BY id DESC')
    .all() as Array<{
    id: number;
    user_id: number | null;
    name: string;
    email: string;
    subject: string;
    message: string;
    is_read: number;
    created_at: string;
  }>;

  const messages: ContactMessage[] = messageRows.map((m) => ({
    id: m.id,
    userId: m.user_id,
    name: m.name,
    email: m.email,
    subject: m.subject,
    message: m.message,
    isRead: m.is_read === 1,
    createdAt: m.created_at,
  }));

  const userRows = db
    .prepare('SELECT id, full_name, email, role, avatar_url, phone, location, is_active, created_at FROM users ORDER BY id DESC')
    .all() as Array<{
    id: number;
    full_name: string;
    email: string;
    role: string;
    avatar_url: string;
    phone: string;
    location: string;
    is_active: number;
    created_at: string;
  }>;

  const users: AdminUserSummary[] = userRows.map((u) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    role: u.role === 'admin' ? 'admin' : 'user',
    avatarUrl: u.avatar_url || '',
    phone: u.phone || '',
    location: u.location || '',
    isActive: u.is_active === 1,
    createdAt: u.created_at,
  }));

  const activityRows = db
    .prepare('SELECT id, actor_type, actor_name, action, created_at FROM activity_logs ORDER BY id DESC LIMIT 30')
    .all() as Array<{
    id: number;
    actor_type: string;
    actor_name: string;
    action: string;
    created_at: string;
  }>;

  const recentActivities: ActivityLogItem[] = activityRows.map((a) => ({
    id: a.id,
    actorType: a.actor_type,
    actorName: a.actor_name,
    action: a.action,
    createdAt: a.created_at,
  }));

  const visitorRow = db
    .prepare("SELECT count FROM site_metrics WHERE key = 'total_visitors'")
    .get() as { count: number } | undefined;

  const unreadCount = messages.filter((m) => !m.isRead).length;
  const metrics = {
    totalVisitors: visitorRow?.count || 0,
    totalUsers: users.length,
    totalProjects: projects.length + fashionDesigns.length,
    totalServices: content.services.length,
    totalMessages: messages.length,
    unreadMessages: unreadCount,
  };

  res.json({
    metrics,
    recentActivities,
    content,
    fashionDesigns,
    projects,
    teachingItems,
    kitchenGardenPosts,
    messages,
    users,
    unreadCount,
  });
});

// Site content editor (supports all 16 management areas)
const ALLOWED_CONTENT_SECTIONS = new Set([
  'seo',
  'hero',
  'about',
  'services',
  'teaching',
  'skills',
  'experience',
  'education',
  'certificates',
  'testimonials',
  'volunteer',
  'contact',
  'siteSettings',
  'languageOverrides',
]);

function sanitizeSectionPayload(section: string, data: unknown): unknown {
  if (section === 'seo') {
    const s = z
      .object({
        title: z.string().min(3).max(160),
        description: z.string().min(10).max(320),
        keywords: z.string().max(400).optional().default(''),
        ogImage: z.string().max(500).optional().default(''),
      })
      .parse(data);
    return {
      title: sanitizePlainText(s.title, 160),
      description: sanitizePlainText(s.description, 320),
      keywords: sanitizePlainText(s.keywords, 400),
      ogImage: sanitizeUrl(s.ogImage),
    };
  }
  if (section === 'hero') {
    const h = z
      .object({
        name: z.string().min(2).max(100),
        brandName: z.string().min(2).max(80).optional().default('Surmila Nodi'),
        roles: z.array(z.string().min(2).max(80)).min(1).max(8),
        intro: z.string().min(10).max(450),
        primaryCtaLabel: z.string().min(2).max(40),
        secondaryCtaLabel: z.string().min(2).max(40),
      })
      .parse(data);
    return {
      name: sanitizePlainText(h.name, 100),
      brandName: sanitizePlainText(h.brandName, 80),
      roles: h.roles.map((r) => sanitizePlainText(r, 80)).filter(Boolean),
      intro: sanitizePlainText(h.intro, 450),
      primaryCtaLabel: sanitizePlainText(h.primaryCtaLabel, 40),
      secondaryCtaLabel: sanitizePlainText(h.secondaryCtaLabel, 40),
    };
  }
  if (section === 'about') {
    const a = z
      .object({
        heading: z.string().min(3).max(200),
        paragraphs: z.array(z.string().min(5).max(1200)).min(1).max(6),
        portraitUrl: z.string().max(500),
        portraitAlt: z.string().max(200),
        locationLabel: z.string().min(2).max(120),
      })
      .parse(data);
    return {
      heading: sanitizePlainText(a.heading, 200),
      paragraphs: a.paragraphs.map((p) => sanitizePlainText(p, 1200)),
      portraitUrl: sanitizeUrl(a.portraitUrl),
      portraitAlt: sanitizePlainText(a.portraitAlt, 200),
      locationLabel: sanitizePlainText(a.locationLabel, 120),
    };
  }
  if (section === 'services') {
    const arr = z
      .array(
        z.object({
          id: z.string().min(1).max(60),
          number: z.string().min(1).max(10),
          title: z.string().min(2).max(100),
          summary: z.string().min(5).max(500),
          deliverables: z.array(z.string().min(1).max(80)).max(8),
        }),
      )
      .min(1)
      .max(12)
      .parse(data);
    return arr.map((item) => ({
      id: sanitizePlainText(item.id, 60),
      number: sanitizePlainText(item.number, 10),
      title: sanitizePlainText(item.title, 100),
      summary: sanitizePlainText(item.summary, 500),
      deliverables: item.deliverables.map((d) => sanitizePlainText(d, 80)),
    }));
  }
  if (section === 'teaching') {
    const t = z
      .object({
        heading: z.string().min(3).max(200),
        summary: z.string().min(5).max(1000),
        approach: z.string().min(5).max(1000),
        institutions: z
          .array(
            z.object({
              id: z.string().min(1).max(60),
              institution: z.string().min(2).max(140),
              role: z.string().min(2).max(120),
              levels: z.string().min(2).max(140),
              subjects: z.string().min(2).max(240),
              scheduleNote: z.string().max(200),
            }),
          )
          .max(10),
      })
      .parse(data);
    return {
      heading: sanitizePlainText(t.heading, 200),
      summary: sanitizePlainText(t.summary, 1000),
      approach: sanitizePlainText(t.approach, 1000),
      institutions: t.institutions.map((i) => ({
        id: sanitizePlainText(i.id, 60),
        institution: sanitizePlainText(i.institution, 140),
        role: sanitizePlainText(i.role, 120),
        levels: sanitizePlainText(i.levels, 140),
        subjects: sanitizePlainText(i.subjects, 240),
        scheduleNote: sanitizePlainText(i.scheduleNote, 200),
      })),
    };
  }
  if (section === 'skills') {
    const arr = z
      .array(
        z.object({
          id: z.string().min(1).max(60),
          name: z.string().min(1).max(120),
          category: z.string().min(1).max(80),
          level: z.number().int().min(10).max(100).optional(),
        }),
      )
      .min(1)
      .max(40)
      .parse(data);
    return arr.map((s) => ({
      id: sanitizePlainText(s.id, 60),
      name: sanitizePlainText(s.name, 120),
      category: sanitizePlainText(s.category, 80),
      level: s.level ?? 90,
    }));
  }
  if (section === 'experience') {
    const arr = z
      .array(
        z.object({
          id: z.string().min(1).max(60),
          period: z.string().min(1).max(40),
          title: z.string().min(2).max(140),
          organization: z.string().min(2).max(140),
          detail: z.string().min(2).max(500),
        }),
      )
      .min(1)
      .max(20)
      .parse(data);
    return arr.map((e) => ({
      id: sanitizePlainText(e.id, 60),
      period: sanitizePlainText(e.period, 40),
      title: sanitizePlainText(e.title, 140),
      organization: sanitizePlainText(e.organization, 140),
      detail: sanitizePlainText(e.detail, 500),
    }));
  }
  if (section === 'education') {
    const arr = z
      .array(
        z.object({
          id: z.string().min(1).max(60),
          period: z.string().min(1).max(40),
          degree: z.string().min(2).max(160),
          institution: z.string().min(2).max(160),
          detail: z.string().min(2).max(500),
        }),
      )
      .max(20)
      .parse(data);
    return arr.map((e) => ({
      id: sanitizePlainText(e.id, 60),
      period: sanitizePlainText(e.period, 40),
      degree: sanitizePlainText(e.degree, 160),
      institution: sanitizePlainText(e.institution, 160),
      detail: sanitizePlainText(e.detail, 500),
    }));
  }
  if (section === 'certificates') {
    const arr = z
      .array(
        z.object({
          id: z.string().min(1).max(60),
          year: z.string().min(1).max(40),
          title: z.string().min(2).max(180),
          issuer: z.string().min(2).max(160),
          credentialCode: z.string().max(80),
          detail: z.string().min(2).max(500),
        }),
      )
      .max(30)
      .parse(data);
    return arr.map((c) => ({
      id: sanitizePlainText(c.id, 60),
      year: sanitizePlainText(c.year, 40),
      title: sanitizePlainText(c.title, 180),
      issuer: sanitizePlainText(c.issuer, 160),
      credentialCode: sanitizePlainText(c.credentialCode, 80),
      detail: sanitizePlainText(c.detail, 500),
    }));
  }
  if (section === 'testimonials') {
    const arr = z
      .array(
        z.object({
          id: z.string().min(1).max(60),
          name: z.string().min(2).max(120),
          role: z.string().min(2).max(140),
          quote: z.string().min(5).max(800),
        }),
      )
      .max(20)
      .parse(data);
    return arr.map((t) => ({
      id: sanitizePlainText(t.id, 60),
      name: sanitizePlainText(t.name, 120),
      role: sanitizePlainText(t.role, 140),
      quote: sanitizePlainText(t.quote, 800),
    }));
  }
  if (section === 'volunteer') {
    const arr = z
      .array(
        z.object({
          id: z.string().min(1).max(60),
          organization: z.string().min(2).max(140),
          role: z.string().min(2).max(120),
          description: z.string().min(2).max(500),
          year: z.string().min(1).max(40),
        }),
      )
      .max(15)
      .parse(data);
    return arr.map((v) => ({
      id: sanitizePlainText(v.id, 60),
      organization: sanitizePlainText(v.organization, 140),
      role: sanitizePlainText(v.role, 120),
      description: sanitizePlainText(v.description, 500),
      year: sanitizePlainText(v.year, 40),
    }));
  }
  if (section === 'contact') {
    const c = z
      .object({
        email: z.string().email().max(160),
        phone: z.string().min(5).max(40),
        location: z.string().min(2).max(120),
        availabilityNote: z.string().max(260),
        socialLinks: z
          .array(
            z.object({
              id: z.string().min(1).max(60),
              label: z.string().min(1).max(40),
              url: z.string().max(400),
            }),
          )
          .max(12),
      })
      .parse(data);
    return {
      email: sanitizePlainText(c.email, 160),
      phone: sanitizePlainText(c.phone, 40),
      location: sanitizePlainText(c.location, 120),
      availabilityNote: sanitizePlainText(c.availabilityNote, 260),
      socialLinks: c.socialLinks
        .map((l) => ({
          id: sanitizePlainText(l.id, 60),
          label: sanitizePlainText(l.label, 40),
          url: sanitizeUrl(l.url),
        }))
        .filter((l) => l.url.length > 0),
    };
  }
  if (section === 'siteSettings') {
    const s = z
      .object({
        brandTitle: z.string().min(2).max(80),
        defaultTheme: z.enum(['dark', 'light']),
        defaultAccent: z.enum(['cyan', 'sky', 'emerald', 'teal']),
        defaultLanguage: z.enum(['en', 'bn']),
        enabledLanguages: z.array(z.enum(['en', 'bn'])).min(1).max(2),
        allowRegistration: z.boolean(),
        showVisitorCounter: z.boolean(),
        footerNote: z.string().max(180),
      })
      .parse(data);
    return {
      brandTitle: sanitizePlainText(s.brandTitle, 80),
      defaultTheme: s.defaultTheme,
      defaultAccent: s.defaultAccent,
      defaultLanguage: s.defaultLanguage,
      enabledLanguages: Array.from(new Set(s.enabledLanguages)),
      allowRegistration: s.allowRegistration,
      showVisitorCounter: s.showVisitorCounter,
      footerNote: sanitizePlainText(s.footerNote, 180),
    };
  }
  if (section === 'languageOverrides') {
    const o = z
      .object({
        en: z.record(z.string(), z.string().max(500)).optional().default({}),
        bn: z.record(z.string(), z.string().max(500)).optional().default({}),
      })
      .parse(data);
    const cleanDict = (dict: Record<string, string>) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(dict)) {
        const cleanK = sanitizePlainText(k, 80);
        const cleanV = sanitizePlainText(v, 500);
        if (cleanK && cleanV) out[cleanK] = cleanV;
      }
      return out;
    };
    return {
      en: cleanDict(o.en),
      bn: cleanDict(o.bn),
    };
  }
  throw new Error('Unknown section');
}

app.put('/api/admin/content/:section', requireAdminAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const section = String(req.params.section || '');
  if (!ALLOWED_CONTENT_SECTIONS.has(section)) {
    res.status(400).json({ error: 'Unknown content section.' });
    return;
  }
  try {
    const cleanPayload = sanitizeSectionPayload(section, req.body);
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ).run(section, JSON.stringify(cleanPayload), now);
    logActivity('admin', req.admin?.sub || null, req.admin?.username || 'admin', `Updated "${section}" section`);
    res.json({ ok: true, section, data: cleanPayload });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Invalid section payload.',
    });
  }
});

// Shared reorder helper
const reorderSchema = z.object({
  orderedIds: z.array(z.number().int().positive()).min(1).max(200),
});

function handleReorder(table: string, req: express.Request, res: express.Response) {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid ordering.' });
    return;
  }
  const stmt = db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`);
  const tx = db.transaction((ids: number[]) => {
    ids.forEach((itemId, idx) => stmt.run(idx + 1, itemId));
  });
  tx(parsed.data.orderedIds);
  res.json({ ok: true });
}

// 1. Fashion Designs CRUD
const fashionInputSchema = z.object({
  title: z.string().min(2).max(140),
  category: z.string().min(2).max(80),
  fabric: z.string().min(2).max(140),
  summary: z.string().min(5).max(320),
  description: z.string().min(5).max(3000),
  images: z.array(z.string().max(500)).max(12),
  featured: z.boolean().optional().default(false),
  published: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(9999).optional().default(0),
});

app.post('/api/admin/fashion', requireAdminAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const parsed = fashionInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid fashion item.' });
    return;
  }
  const d = parsed.data;
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO fashion_designs (
        slug, title, category, fabric, summary, description, images,
        featured, published, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      createSlug(d.title),
      sanitizePlainText(d.title, 140),
      sanitizePlainText(d.category, 80),
      sanitizePlainText(d.fabric, 140),
      sanitizePlainText(d.summary, 320),
      sanitizePlainText(d.description, 3000),
      JSON.stringify(d.images.map((u) => sanitizeUrl(u)).filter(Boolean)),
      d.featured ? 1 : 0,
      d.published ? 1 : 0,
      d.sortOrder,
      now,
      now,
    );
  const row = db.prepare('SELECT * FROM fashion_designs WHERE id = ?').get(info.lastInsertRowid) as RawFashionRow;
  logActivity('admin', req.admin?.sub || null, req.admin?.username || 'admin', `Added fashion piece: "${row.title}"`);
  res.status(201).json({ item: mapFashionRow(row) });
});

app.put('/api/admin/fashion/:id', requireAdminAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = fashionInputSchema.safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
    res.status(400).json({ error: 'Invalid fashion design data.' });
    return;
  }
  const d = parsed.data;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE fashion_designs SET
      title = ?, category = ?, fabric = ?, summary = ?, description = ?,
      images = ?, featured = ?, published = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    sanitizePlainText(d.title, 140),
    sanitizePlainText(d.category, 80),
    sanitizePlainText(d.fabric, 140),
    sanitizePlainText(d.summary, 320),
    sanitizePlainText(d.description, 3000),
    JSON.stringify(d.images.map((u) => sanitizeUrl(u)).filter(Boolean)),
    d.featured ? 1 : 0,
    d.published ? 1 : 0,
    d.sortOrder,
    now,
    id,
  );
  const row = db.prepare('SELECT * FROM fashion_designs WHERE id = ?').get(id) as RawFashionRow;
  logActivity('admin', req.admin?.sub || null, req.admin?.username || 'admin', `Updated fashion piece: "${row.title}"`);
  res.json({ item: mapFashionRow(row) });
});

app.patch('/api/admin/fashion/reorder', requireAdminAuth, verifyCsrf, (req, res) => {
  handleReorder('fashion_designs', req, res);
});

app.delete('/api/admin/fashion/:id', requireAdminAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid id.' });
    return;
  }
  db.prepare('DELETE FROM fashion_designs WHERE id = ?').run(id);
  logActivity('admin', req.admin?.sub || null, req.admin?.username || 'admin', `Deleted fashion piece #${id}`);
  res.json({ ok: true });
});

// 2. Design & Digital Projects CRUD
const projectInputSchema = z.object({
  title: z.string().min(2).max(140),
  category: z.string().min(2).max(60),
  summary: z.string().min(5).max(320),
  description: z.string().min(5).max(3000),
  tools: z.array(z.string().min(1).max(60)).max(15),
  images: z.array(z.string().max(500)).max(10),
  externalUrl: z.string().max(400).optional().default(''),
  featured: z.boolean().optional().default(false),
  published: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(9999).optional().default(0),
});

app.post('/api/admin/projects', requireAdminAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const parsed = projectInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid project data.' });
    return;
  }
  const d = parsed.data;
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO projects (
        slug, title, category, summary, description, tools, images,
        external_url, featured, published, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      createSlug(d.title),
      sanitizePlainText(d.title, 140),
      sanitizePlainText(d.category, 60),
      sanitizePlainText(d.summary, 320),
      sanitizePlainText(d.description, 3000),
      JSON.stringify(d.tools.map((t) => sanitizePlainText(t, 60)).filter(Boolean)),
      JSON.stringify(d.images.map((u) => sanitizeUrl(u)).filter(Boolean)),
      sanitizeUrl(d.externalUrl),
      d.featured ? 1 : 0,
      d.published ? 1 : 0,
      d.sortOrder,
      now,
      now,
    );
  const created = db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid) as RawProjectRow;
  logActivity('admin', req.admin?.sub || null, req.admin?.username || 'admin', `Added project: "${created.title}"`);
  res.status(201).json({ project: mapProjectRow(created) });
});

app.put('/api/admin/projects/:id', requireAdminAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = projectInputSchema.safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
    res.status(400).json({ error: 'Invalid project data.' });
    return;
  }
  const d = parsed.data;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE projects SET
      title = ?, category = ?, summary = ?, description = ?, tools = ?,
      images = ?, external_url = ?, featured = ?, published = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    sanitizePlainText(d.title, 140),
    sanitizePlainText(d.category, 60),
    sanitizePlainText(d.summary, 320),
    sanitizePlainText(d.description, 3000),
    JSON.stringify(d.tools.map((t) => sanitizePlainText(t, 60)).filter(Boolean)),
    JSON.stringify(d.images.map((u) => sanitizeUrl(u)).filter(Boolean)),
    sanitizeUrl(d.externalUrl),
    d.featured ? 1 : 0,
    d.published ? 1 : 0,
    d.sortOrder,
    now,
    id,
  );
  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as RawProjectRow;
  logActivity('admin', req.admin?.sub || null, req.admin?.username || 'admin', `Updated project: "${updated.title}"`);
  res.json({ project: mapProjectRow(updated) });
});

app.patch('/api/admin/projects/reorder', requireAdminAuth, verifyCsrf, (req, res) => {
  handleReorder('projects', req, res);
});

app.delete('/api/admin/projects/:id', requireAdminAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid id.' });
    return;
  }
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  logActivity('admin', req.admin?.sub || null, req.admin?.username || 'admin', `Deleted project #${id}`);
  res.json({ ok: true });
});

// 3. Teaching Classes & Videos CRUD
const teachingInputSchema = z.object({
  title: z.string().min(2).max(140),
  category: z.string().min(2).max(80),
  studentLevel: z.string().min(2).max(140),
  summary: z.string().min(5).max(320),
  description: z.string().min(5).max(3000),
  images: z.array(z.string().max(500)).max(10),
  videoUrl: z.string().max(500).optional().default(''),
  featured: z.boolean().optional().default(false),
  published: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(9999).optional().default(0),
});

app.post('/api/admin/teaching', requireAdminAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const parsed = teachingInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid teaching item.' });
    return;
  }
  const d = parsed.data;
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO teaching_items (
        slug, title, category, student_level, summary, description, images,
        video_url, featured, published, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      createSlug(d.title),
      sanitizePlainText(d.title, 140),
      sanitizePlainText(d.category, 80),
      sanitizePlainText(d.studentLevel, 140),
      sanitizePlainText(d.summary, 320),
      sanitizePlainText(d.description, 3000),
      JSON.stringify(d.images.map((u) => sanitizeUrl(u)).filter(Boolean)),
      sanitizeUrl(d.videoUrl),
      d.featured ? 1 : 0,
      d.published ? 1 : 0,
      d.sortOrder,
      now,
      now,
    );
  const row = db
    .prepare('SELECT * FROM teaching_items WHERE id = ?')
    .get(info.lastInsertRowid) as RawTeachingRow;
  logActivity('admin', req.admin?.sub || null, req.admin?.username || 'admin', `Added teaching item: "${row.title}"`);
  res.status(201).json({ item: mapTeachingRow(row) });
});

app.put('/api/admin/teaching/:id', requireAdminAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = teachingInputSchema.safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
    res.status(400).json({ error: 'Invalid teaching item data.' });
    return;
  }
  const d = parsed.data;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE teaching_items SET
      title = ?, category = ?, student_level = ?, summary = ?, description = ?,
      images = ?, video_url = ?, featured = ?, published = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    sanitizePlainText(d.title, 140),
    sanitizePlainText(d.category, 80),
    sanitizePlainText(d.studentLevel, 140),
    sanitizePlainText(d.summary, 320),
    sanitizePlainText(d.description, 3000),
    JSON.stringify(d.images.map((u) => sanitizeUrl(u)).filter(Boolean)),
    sanitizeUrl(d.videoUrl),
    d.featured ? 1 : 0,
    d.published ? 1 : 0,
    d.sortOrder,
    now,
    id,
  );
  const row = db.prepare('SELECT * FROM teaching_items WHERE id = ?').get(id) as RawTeachingRow;
  logActivity('admin', req.admin?.sub || null, req.admin?.username || 'admin', `Updated teaching item: "${row.title}"`);
  res.json({ item: mapTeachingRow(row) });
});

app.patch('/api/admin/teaching/reorder', requireAdminAuth, verifyCsrf, (req, res) => {
  handleReorder('teaching_items', req, res);
});

app.delete('/api/admin/teaching/:id', requireAdminAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid id.' });
    return;
  }
  db.prepare('DELETE FROM teaching_items WHERE id = ?').run(id);
  res.json({ ok: true });
});

// 4. Kitchen & Garden Posts CRUD
const kgInputSchema = z.object({
  title: z.string().min(2).max(140),
  category: z.string().min(2).max(60),
  summary: z.string().min(5).max(320),
  note: z.string().max(1000).optional().default(''),
  ingredients: z.array(z.string().min(1).max(200)).max(30),
  steps: z.array(z.string().min(1).max(500)).max(30),
  images: z.array(z.string().max(500)).max(10),
  featured: z.boolean().optional().default(false),
  published: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(9999).optional().default(0),
});

app.post('/api/admin/kitchen-garden', requireAdminAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const parsed = kgInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid post data.' });
    return;
  }
  const d = parsed.data;
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO kitchen_garden_posts (
        slug, title, category, summary, note, ingredients, steps, images,
        featured, published, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      createSlug(d.title),
      sanitizePlainText(d.title, 140),
      sanitizePlainText(d.category, 60),
      sanitizePlainText(d.summary, 320),
      sanitizePlainText(d.note, 1000),
      JSON.stringify(d.ingredients.map((s) => sanitizePlainText(s, 200)).filter(Boolean)),
      JSON.stringify(d.steps.map((s) => sanitizePlainText(s, 500)).filter(Boolean)),
      JSON.stringify(d.images.map((u) => sanitizeUrl(u)).filter(Boolean)),
      d.featured ? 1 : 0,
      d.published ? 1 : 0,
      d.sortOrder,
      now,
      now,
    );
  const row = db
    .prepare('SELECT * FROM kitchen_garden_posts WHERE id = ?')
    .get(info.lastInsertRowid) as RawKitchenGardenRow;
  logActivity('admin', req.admin?.sub || null, req.admin?.username || 'admin', `Added kitchen/garden note: "${row.title}"`);
  res.status(201).json({ item: mapKitchenGardenRow(row) });
});

app.put('/api/admin/kitchen-garden/:id', requireAdminAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = kgInputSchema.safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
    res.status(400).json({ error: 'Invalid post data.' });
    return;
  }
  const d = parsed.data;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE kitchen_garden_posts SET
      title = ?, category = ?, summary = ?, note = ?, ingredients = ?, steps = ?,
      images = ?, featured = ?, published = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    sanitizePlainText(d.title, 140),
    sanitizePlainText(d.category, 60),
    sanitizePlainText(d.summary, 320),
    sanitizePlainText(d.note, 1000),
    JSON.stringify(d.ingredients.map((s) => sanitizePlainText(s, 200)).filter(Boolean)),
    JSON.stringify(d.steps.map((s) => sanitizePlainText(s, 500)).filter(Boolean)),
    JSON.stringify(d.images.map((u) => sanitizeUrl(u)).filter(Boolean)),
    d.featured ? 1 : 0,
    d.published ? 1 : 0,
    d.sortOrder,
    now,
    id,
  );
  const row = db
    .prepare('SELECT * FROM kitchen_garden_posts WHERE id = ?')
    .get(id) as RawKitchenGardenRow;
  res.json({ item: mapKitchenGardenRow(row) });
});

app.patch('/api/admin/kitchen-garden/reorder', requireAdminAuth, verifyCsrf, (req, res) => {
  handleReorder('kitchen_garden_posts', req, res);
});

app.delete('/api/admin/kitchen-garden/:id', requireAdminAuth, verifyCsrf, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid id.' });
    return;
  }
  db.prepare('DELETE FROM kitchen_garden_posts WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Messages inbox endpoints
app.patch('/api/admin/messages/:id/read', requireAdminAuth, verifyCsrf, (req, res) => {
  const id = Number(req.params.id);
  const parsed = z.object({ isRead: z.boolean() }).safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
    res.status(400).json({ error: 'Invalid request.' });
    return;
  }
  db.prepare('UPDATE messages SET is_read = ? WHERE id = ?').run(parsed.data.isRead ? 1 : 0, id);
  res.json({ ok: true });
});

app.delete('/api/admin/messages/:id', requireAdminAuth, verifyCsrf, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid message id.' });
    return;
  }
  db.prepare('DELETE FROM messages WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Users Management (Admin)
app.patch('/api/admin/users/:id', requireAdminAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const parsed = z
    .object({
      isActive: z.boolean().optional(),
      role: z.enum(['user', 'admin']).optional(),
    })
    .safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
    res.status(400).json({ error: 'Invalid user update.' });
    return;
  }

  const existing = db.prepare('SELECT id, full_name, is_active, role FROM users WHERE id = ?').get(id) as
    | { id: number; full_name: string; is_active: number; role: string }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const nextActive = typeof parsed.data.isActive === 'boolean' ? (parsed.data.isActive ? 1 : 0) : existing.is_active;
  const nextRole = parsed.data.role ?? existing.role;

  db.prepare('UPDATE users SET is_active = ?, role = ?, updated_at = ? WHERE id = ?').run(
    nextActive,
    nextRole,
    new Date().toISOString(),
    id,
  );
  logActivity('admin', req.admin?.sub || null, req.admin?.username || 'admin', `Updated member account "${existing.full_name}"`);
  res.json({ ok: true });
});

app.delete('/api/admin/users/:id', requireAdminAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid user id.' });
    return;
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  logActivity('admin', req.admin?.sub || null, req.admin?.username || 'admin', `Removed member account #${id}`);
  res.json({ ok: true });
});

// Image & short video upload endpoint
app.post(
  '/api/admin/upload',
  requireAdminAuth,
  verifyCsrf,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message || 'Upload failed.' });
        return;
      }
      next();
    });
  },
  (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No media file provided.' });
      return;
    }

    const isVideo = file.mimetype.startsWith('video/');
    if (!isVideo && file.size > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Images must be 5 MB or smaller.' });
      return;
    }

    if (!validateMediaMagicBytes(file.buffer, file.mimetype)) {
      res.status(400).json({
        error: 'File contents do not match a valid JPEG, PNG, WebP, MP4, or WebM file.',
      });
      return;
    }

    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
    };
    const ext = extMap[file.mimetype] || 'bin';
    const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);

    res.status(201).json({
      url: `/uploads/${filename}`,
      mediaType: isVideo ? 'video' : 'image',
    });
  },
);

// Admin password change endpoint
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8, 'New password must be at least 8 characters.').max(200),
});

app.post('/api/admin/change-password', requireAdminAuth, verifyCsrf, (req: AuthenticatedRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid password input.' });
    return;
  }

  const adminUser = db
    .prepare('SELECT id, password_hash FROM admin_users WHERE id = ?')
    .get(req.admin?.sub) as { id: number; password_hash: string } | undefined;

  if (!adminUser) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }

  if (!bcrypt.compareSync(parsed.data.currentPassword, adminUser.password_hash)) {
    res.status(401).json({ error: 'Current password is incorrect.' });
    return;
  }

  const nextHash = bcrypt.hashSync(parsed.data.newPassword, 12);
  db.prepare(
    'UPDATE admin_users SET password_hash = ?, password_overridden = 1, updated_at = ? WHERE id = ?',
  ).run(nextHash, new Date().toISOString(), adminUser.id);

  logActivity('admin', adminUser.id, req.admin?.username || 'admin', 'Updated admin password');
  res.json({ ok: true, message: 'Password updated successfully.' });
});

// Prevent search indexing of private admin & member dashboard routes
app.use(['/studio-login', '/studio-admin', '/dashboard'], (_req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

async function startServer() {
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Portfolio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
