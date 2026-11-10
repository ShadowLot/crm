import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

const q = {
  customersByStatus: db.prepare(
    'SELECT status, COUNT(*) AS count FROM customers WHERE owner_id = ? GROUP BY status'
  ),
  salesByStage: db.prepare(
    'SELECT stage, COUNT(*) AS count, COALESCE(SUM(value),0) AS value FROM sales WHERE owner_id = ? GROUP BY stage'
  ),
  upcoming: db.prepare(`
    SELECT a.id, a.type, a.subject, a.due_date, c.name AS customer_name
    FROM activities a JOIN customers c ON c.id = a.customer_id
    WHERE a.owner_id = ? AND a.done = 0 AND a.due_date IS NOT NULL AND a.due_date != ''
    ORDER BY a.due_date ASC LIMIT 8
  `),
  overdue: db.prepare(`
    SELECT COUNT(*) AS count FROM activities
    WHERE owner_id = ? AND done = 0 AND due_date != '' AND due_date < date('now')
  `),
  recentCustomers: db.prepare(
    'SELECT id, name, company, status, created_at FROM customers WHERE owner_id = ? ORDER BY created_at DESC LIMIT 5'
  ),
};

router.get('/', (req, res) => {
  const uid = req.user.id;
  const customers = q.customersByStatus.all(uid);
  const sales = q.salesByStage.all(uid);
  const open = sales.filter((d) => !['won', 'lost'].includes(d.stage));
  res.json({
    totals: {
      customers: customers.reduce((s, r) => s + r.count, 0),
      converted: customers.find((r) => r.status === 'customer')?.count ?? 0,
      openSales: open.reduce((s, r) => s + r.count, 0),
      pipelineValue: open.reduce((s, r) => s + r.value, 0),
      wonValue: sales.find((d) => d.stage === 'won')?.value ?? 0,
      overdue: q.overdue.get(uid).count,
    },
    customersByStatus: customers,
    salesByStage: sales,
    upcoming: q.upcoming.all(uid),
    recentCustomers: q.recentCustomers.all(uid),
  });
});

export default router;
