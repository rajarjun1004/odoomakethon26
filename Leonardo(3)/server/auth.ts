import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from './db.ts';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'customer';
  customer_id: string | null;
  customer_name?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  // 7 days expiration
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`).run(token, userId, expiresAt);
  return token;
}

export function deleteSession(token: string) {
  db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

export function getUserFromToken(token: string): AuthUser | null {
  if (!token) return null;
  const now = new Date().toISOString();
  const row = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.customer_id, c.name as customer_name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN customers c ON u.customer_id = c.id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(token, now) as any;

  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    customer_id: row.customer_id,
    customer_name: row.customer_name
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers['x-session-token']) {
    token = String(req.headers['x-session-token']);
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const user = getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }

  req.user = user;
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required.' });
  }
  next();
}

export function requireStaffOrAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'staff')) {
    return res.status(403).json({ error: 'Forbidden: Internal staff or admin access required.' });
  }
  next();
}
