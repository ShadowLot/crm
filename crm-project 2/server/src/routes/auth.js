import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { db } from '../db.js';
import { issueSession, clearSession, requireAuth } from '../auth.js';
import { validate, registerSchema, loginSchema } from '../validators.js';

const router = Router();

// Brute-force protection: 20 attempts per 15 minutes per IP on auth endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts, try again later' },
});

const findByEmail = db.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?');
const insertUser  = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');

router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;
  if (findByEmail.get(email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  const hash = await bcrypt.hash(password, 12);
  const info = insertUser.run(name, email, hash);
  const user = { id: info.lastInsertRowid, name, email };
  issueSession(res, user);
  res.status(201).json({ user });
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const row = findByEmail.get(email);
  // Compare against a dummy hash when the user is missing so response time
  // does not reveal whether the email exists.
  const hash = row?.password_hash ?? '$2a$12$CwTycUXWue0Thq9StjUM0uJ8h8r1u1x1pRk5F1kL0xGzYw1oKvK6a';
  const ok = await bcrypt.compare(password, hash);
  if (!row || !ok) return res.status(401).json({ error: 'Invalid email or password' });
  issueSession(res, row);
  res.json({ user: { id: row.id, name: row.name, email: row.email } });
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
