// Populates the database with a demo user and sample records so the app can
// be explored immediately.  Run with:  npm run seed
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const DEMO_EMAIL = 'demo@clienttrack.local';
const DEMO_PASSWORD = 'Demo@12345';

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO_EMAIL);
if (existing) {
  console.log('Demo user already exists, nothing to do.');
  process.exit(0);
}

const seed = db.transaction(() => {
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 12);
  const uid = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run('Quadri', DEMO_EMAIL, hash).lastInsertRowid;

  const addCustomer = db.prepare(`
    INSERT INTO customers (owner_id, name, email, phone, company, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const customers = [
    ['Arun Prakash', 'arun@meridiantextiles.in', '+91 98400 11223', 'Meridian Textiles', 'customer', 'Renewed annual plan in September.'],
    ['Divya Raghavan', 'divya@skylinelogistics.com', '+91 98841 55670', 'Skyline Logistics', 'prospect', 'Wants a demo of reporting module.'],
    ['Mohammed Faizal', 'faizal@nurafoods.in', '+91 90030 77812', 'Nura Foods', 'lead', 'Met at Chennai trade expo.'],
    ['Priya Venkatesh', 'priya.v@brightpath.edu', '+91 94440 23456', 'BrightPath Academy', 'customer', 'Uses the system for admissions follow-up.'],
    ['Karthik Subramanian', 'karthik@zenithautos.com', '+91 97890 66541', 'Zenith Autos', 'prospect', 'Comparing two vendors; decision by month end.'],
    ['Sneha Iyer', 'sneha@oceanic-exports.com', '+91 98410 90876', 'Oceanic Exports', 'lead', 'Inbound enquiry via website form.'],
    ['Rahul Menon', 'rahul@cloudnine.co.in', '+91 99620 44321', 'CloudNine Interiors', 'inactive', 'Project put on hold.'],
    ['Lakshmi Narayanan', 'lakshmi@sparkelectricals.in', '+91 94870 12309', 'Spark Electricals', 'customer', 'Prefers phone calls over email.'],
  ];
  const cids = customers.map((c) => addCustomer.run(uid, ...c).lastInsertRowid);

  const addSale = db.prepare(`
    INSERT INTO sales (owner_id, customer_id, title, value, stage, expected_close)
    VALUES (?, ?, ?, ?, ?, ?)`);
  const sales = [
    [cids[0], 'Annual subscription renewal', 120000, 'won', '2026-09-15'],
    [cids[1], 'Reporting module add-on', 45000, 'proposal', '2026-11-28'],
    [cids[2], 'Starter package', 30000, 'contacted', '2026-12-10'],
    [cids[3], 'Admissions automation upgrade', 85000, 'qualified', '2026-12-05'],
    [cids[4], 'Fleet management integration', 150000, 'proposal', '2026-11-30'],
    [cids[5], 'Export documentation tracker', 60000, 'new', '2027-01-15'],
    [cids[6], 'Showroom CRM pilot', 40000, 'lost', '2026-10-01'],
    [cids[7], 'Service desk module', 55000, 'qualified', '2026-12-20'],
  ];
  const dids = sales.map((d) => addSale.run(uid, ...d).lastInsertRowid);

  const addAct = db.prepare(`
    INSERT INTO activities (owner_id, customer_id, sale_id, type, subject, due_date, done)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const acts = [
    [cids[1], dids[1], 'meeting', 'Demo of reporting dashboard', '2026-11-12', 0],
    [cids[4], dids[4], 'call', 'Follow up on proposal pricing', '2026-11-10', 0],
    [cids[2], dids[2], 'email', 'Send starter package brochure', '2026-11-07', 0],
    [cids[3], dids[3], 'task', 'Prepare upgrade scope document', '2026-11-14', 0],
    [cids[5], dids[5], 'call', 'Discovery call', '2026-11-18', 0],
    [cids[7], dids[7], 'meeting', 'On-site requirement review', '2026-11-21', 0],
    [cids[0], dids[0], 'note', 'Renewal signed and invoiced', '2026-09-15', 1],
    [cids[6], dids[6], 'email', 'Confirm project hold status', '2026-10-01', 1],
  ];
  acts.forEach((a) => addAct.run(uid, ...a));
});

seed();
console.log(`Seeded demo data. Login with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
