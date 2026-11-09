import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { requireAuth } from './auth.js';
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import dealRoutes from './routes/deals.js';
import activityRoutes from './routes/activities.js';
import dashboardRoutes from './routes/dashboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '50kb' }));   // small body cap: no file uploads here
app.use(cookieParser());
app.use(rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/contacts', requireAuth, contactRoutes);
app.use('/api/deals', requireAuth, dealRoutes);
app.use('/api/activities', requireAuth, activityRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);

// Serve the built React client when it exists (production mode).
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler: never leak stack traces to the client.
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT) || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`ClientTrack API listening on http://localhost:${port}`));
}

export default app;
