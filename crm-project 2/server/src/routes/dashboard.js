import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

const q = {
  contactsByStatus: db.prepare(
    'SELECT status, COUNT(*) AS count FROM contacts WHERE owner_id = ? GROUP BY status'
  ),
  dealsByStage: db.prepare(
    'SELECT stage, COUNT(*) AS count, COALESCE(SUM(value),0) AS value FROM deals WHERE owner_id = ? GROUP BY stage'
  ),
  upcoming: db.prepare(`
    SELECT a.id, a.type, a.subject, a.due_date, c.name AS contact_name
    FROM activities a JOIN contacts c ON c.id = a.contact_id
    WHERE a.owner_id = ? AND a.done = 0 AND a.due_date IS NOT NULL AND a.due_date != ''
    ORDER BY a.due_date ASC LIMIT 8
  `),
  overdue: db.prepare(`
    SELECT COUNT(*) AS count FROM activities
    WHERE owner_id = ? AND done = 0 AND due_date != '' AND due_date < date('now')
  `),
  recentContacts: db.prepare(
    'SELECT id, name, company, status, created_at FROM contacts WHERE owner_id = ? ORDER BY created_at DESC LIMIT 5'
  ),
};

router.get('/', (req, res) => {
  const uid = req.user.id;
  const contacts = q.contactsByStatus.all(uid);
  const deals = q.dealsByStage.all(uid);
  const open = deals.filter((d) => !['won', 'lost'].includes(d.stage));
  res.json({
    totals: {
      contacts: contacts.reduce((s, r) => s + r.count, 0),
      customers: contacts.find((r) => r.status === 'customer')?.count ?? 0,
      openDeals: open.reduce((s, r) => s + r.count, 0),
      pipelineValue: open.reduce((s, r) => s + r.value, 0),
      wonValue: deals.find((d) => d.stage === 'won')?.value ?? 0,
      overdue: q.overdue.get(uid).count,
    },
    contactsByStatus: contacts,
    dealsByStage: deals,
    upcoming: q.upcoming.all(uid),
    recentContacts: q.recentContacts.all(uid),
  });
});

export default router;
