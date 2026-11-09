import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

const COOKIE_NAME = 'ct_session';
const TTL_SECONDS = 60 * 60 * 8; // 8 hours

export function issueSession(res, user) {
  const token = jwt.sign({ sub: user.id, name: user.name }, SECRET, {
    algorithm: 'HS256',
    expiresIn: TTL_SECONDS,
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,                 // not readable by page scripts (XSS mitigation)
    sameSite: 'strict',             // not sent on cross-site requests (CSRF mitigation)
    secure: process.env.NODE_ENV === 'production',
    maxAge: TTL_SECONDS * 1000,
    path: '/',
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

/** Rejects the request unless a valid session cookie is present. */
export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    req.user = { id: payload.sub, name: payload.name };
    next();
  } catch {
    clearSession(res);
    return res.status(401).json({ error: 'Session expired' });
  }
}
