import { Router } from 'express';
import { db } from '../db.js';
import { validate, contactSchema, idParam, CONTACT_STATUSES } from '../validators.js';

const router = Router();

// Every query is scoped by owner_id so one user can never read or modify
// another user's records by guessing an id (prevents IDOR).
const q = {
  list: db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM deals d WHERE d.contact_id = c.id) AS deal_count
    FROM contacts c
    WHERE c.owner_id = ?
      AND (? = '' OR c.status = ?)
      AND (? = '' OR c.name LIKE ? OR c.email LIKE ? OR c.company LIKE ?)
    ORDER BY c.updated_at DESC
    LIMIT 200
  `),
  get: db.prepare('SELECT * FROM contacts WHERE id = ? AND owner_id = ?'),
  insert: db.prepare(`
    INSERT INTO contacts (owner_id, name, email, phone, company, status, notes)
    VALUES (@owner_id, @name, @email, @phone, @company, @status, @notes)
  `),
  update: db.prepare(`
    UPDATE contacts
    SET name=@name, email=@email, phone=@phone, company=@company, status=@status,
        notes=@notes, updated_at=datetime('now')
    WHERE id=@id AND owner_id=@owner_id
  `),
  remove: db.prepare('DELETE FROM contacts WHERE id = ? AND owner_id = ?'),
};

router.get('/', (req, res) => {
  const status = CONTACT_STATUSES.includes(req.query.status) ? req.query.status : '';
  const search = String(req.query.q ?? '').trim().slice(0, 50);
  const like = `%${search}%`;
  res.json(q.list.all(req.user.id, status, status, search, like, like, like));
});

router.get('/:id', (req, res) => {
  const id = idParam.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'Invalid id' });
  const row = q.get.get(id.data, req.user.id);
  if (!row) return res.status(404).json({ error: 'Contact not found' });
  res.json(row);
});

router.post('/', validate(contactSchema), (req, res) => {
  const info = q.insert.run({ owner_id: req.user.id, ...req.body });
  res.status(201).json(q.get.get(info.lastInsertRowid, req.user.id));
});

router.put('/:id', validate(contactSchema), (req, res) => {
  const id = idParam.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'Invalid id' });
  const info = q.update.run({ id: id.data, owner_id: req.user.id, ...req.body });
  if (info.changes === 0) return res.status(404).json({ error: 'Contact not found' });
  res.json(q.get.get(id.data, req.user.id));
});

router.delete('/:id', (req, res) => {
  const id = idParam.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'Invalid id' });
  const info = q.remove.run(id.data, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Contact not found' });
  res.status(204).end();
});

export default router;
