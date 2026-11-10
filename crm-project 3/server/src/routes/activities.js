import { Router } from 'express';
import { db } from '../db.js';
import { validate, activitySchema, idParam } from '../validators.js';

const router = Router();

const q = {
  list: db.prepare(`
    SELECT a.*, c.name AS customer_name, d.title AS sale_title
    FROM activities a
    JOIN customers c ON c.id = a.customer_id
    LEFT JOIN sales d ON d.id = a.sale_id
    WHERE a.owner_id = ? AND (? = -1 OR a.done = ?)
    ORDER BY a.done ASC, a.due_date IS NULL, a.due_date ASC, a.created_at DESC
    LIMIT 300
  `),
  get: db.prepare(`
    SELECT a.*, c.name AS customer_name, d.title AS sale_title
    FROM activities a
    JOIN customers c ON c.id = a.customer_id
    LEFT JOIN sales d ON d.id = a.sale_id
    WHERE a.id = ? AND a.owner_id = ?
  `),
  customerOwned: db.prepare('SELECT 1 FROM customers WHERE id = ? AND owner_id = ?'),
  saleOwned: db.prepare('SELECT 1 FROM sales WHERE id = ? AND owner_id = ?'),
  insert: db.prepare(`
    INSERT INTO activities (owner_id, customer_id, sale_id, type, subject, due_date, done)
    VALUES (@owner_id, @customer_id, @sale_id, @type, @subject, @due_date, @done)
  `),
  toggle: db.prepare('UPDATE activities SET done = 1 - done WHERE id = ? AND owner_id = ?'),
  remove: db.prepare('DELETE FROM activities WHERE id = ? AND owner_id = ?'),
};

function parseId(req, res) {
  const id = idParam.safeParse(req.params.id);
  if (!id.success) { res.status(400).json({ error: 'Invalid id' }); return null; }
  return id.data;
}

router.get('/', (req, res) => {
  const done = req.query.done === '1' ? 1 : req.query.done === '0' ? 0 : -1;
  res.json(q.list.all(req.user.id, done, done));
});

router.post('/', validate(activitySchema), (req, res) => {
  const { customer_id, sale_id } = req.body;
  if (!q.customerOwned.get(customer_id, req.user.id)) {
    return res.status(400).json({ error: 'Unknown customer' });
  }
  if (sale_id && !q.saleOwned.get(sale_id, req.user.id)) {
    return res.status(400).json({ error: 'Unknown sale' });
  }
  const info = q.insert.run({
    owner_id: req.user.id,
    ...req.body,
    sale_id: sale_id ?? null,
    done: req.body.done ? 1 : 0,
  });
  res.status(201).json(q.get.get(info.lastInsertRowid, req.user.id));
});

router.patch('/:id/toggle', (req, res) => {
  const id = parseId(req, res); if (id === null) return;
  const info = q.toggle.run(id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Activity not found' });
  res.json(q.get.get(id, req.user.id));
});

router.delete('/:id', (req, res) => {
  const id = parseId(req, res); if (id === null) return;
  const info = q.remove.run(id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Activity not found' });
  res.status(204).end();
});

export default router;
