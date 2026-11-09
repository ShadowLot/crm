import { Router } from 'express';
import { db } from '../db.js';
import { validate, dealSchema, idParam, DEAL_STAGES } from '../validators.js';

const router = Router();

const q = {
  list: db.prepare(`
    SELECT d.*, c.name AS contact_name, c.company AS contact_company
    FROM deals d JOIN contacts c ON c.id = d.contact_id
    WHERE d.owner_id = ? AND (? = '' OR d.stage = ?)
    ORDER BY d.updated_at DESC
    LIMIT 200
  `),
  get: db.prepare(`
    SELECT d.*, c.name AS contact_name, c.company AS contact_company
    FROM deals d JOIN contacts c ON c.id = d.contact_id
    WHERE d.id = ? AND d.owner_id = ?
  `),
  contactOwned: db.prepare('SELECT 1 FROM contacts WHERE id = ? AND owner_id = ?'),
  insert: db.prepare(`
    INSERT INTO deals (owner_id, contact_id, title, value, stage, expected_close)
    VALUES (@owner_id, @contact_id, @title, @value, @stage, @expected_close)
  `),
  update: db.prepare(`
    UPDATE deals SET contact_id=@contact_id, title=@title, value=@value, stage=@stage,
      expected_close=@expected_close, updated_at=datetime('now')
    WHERE id=@id AND owner_id=@owner_id
  `),
  setStage: db.prepare(`
    UPDATE deals SET stage=?, updated_at=datetime('now') WHERE id=? AND owner_id=?
  `),
  remove: db.prepare('DELETE FROM deals WHERE id = ? AND owner_id = ?'),
};

function parseId(req, res) {
  const id = idParam.safeParse(req.params.id);
  if (!id.success) { res.status(400).json({ error: 'Invalid id' }); return null; }
  return id.data;
}

router.get('/', (req, res) => {
  const stage = DEAL_STAGES.includes(req.query.stage) ? req.query.stage : '';
  res.json(q.list.all(req.user.id, stage, stage));
});

router.get('/:id', (req, res) => {
  const id = parseId(req, res); if (id === null) return;
  const row = q.get.get(id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Deal not found' });
  res.json(row);
});

router.post('/', validate(dealSchema), (req, res) => {
  // The linked contact must belong to the same user.
  if (!q.contactOwned.get(req.body.contact_id, req.user.id)) {
    return res.status(400).json({ error: 'Unknown contact' });
  }
  const info = q.insert.run({ owner_id: req.user.id, ...req.body });
  res.status(201).json(q.get.get(info.lastInsertRowid, req.user.id));
});

router.put('/:id', validate(dealSchema), (req, res) => {
  const id = parseId(req, res); if (id === null) return;
  if (!q.contactOwned.get(req.body.contact_id, req.user.id)) {
    return res.status(400).json({ error: 'Unknown contact' });
  }
  const info = q.update.run({ id, owner_id: req.user.id, ...req.body });
  if (info.changes === 0) return res.status(404).json({ error: 'Deal not found' });
  res.json(q.get.get(id, req.user.id));
});

// Lightweight endpoint used by the pipeline board to move a card between stages.
router.patch('/:id/stage', (req, res) => {
  const id = parseId(req, res); if (id === null) return;
  const stage = req.body?.stage;
  if (!DEAL_STAGES.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });
  const info = q.setStage.run(stage, id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Deal not found' });
  res.json(q.get.get(id, req.user.id));
});

router.delete('/:id', (req, res) => {
  const id = parseId(req, res); if (id === null) return;
  const info = q.remove.run(id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Deal not found' });
  res.status(204).end();
});

export default router;
