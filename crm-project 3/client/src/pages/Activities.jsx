import { useCallback, useEffect, useState } from 'react';
import { api, TYPE_LABELS } from '../api.js';
import Modal from '../components/Modal.jsx';

const today = new Date().toISOString().slice(0, 10);
const empty = { customer_id: '', sale_id: '', type: 'call', subject: '', due_date: '' };

export default function Activities() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [filter, setFilter] = useState('0'); // 0 = open, 1 = done, '' = all
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([api.get(`/api/activities?done=${filter}`), api.get('/api/customers'), api.get('/api/sales')])
      .then(([a, c, d]) => { setRows(a); setCustomers(c); setSales(d); })
      .catch((e) => setError(e.message));
  }, [filter]);
  useEffect(load, [load]);

  const toggle = async (a) => { await api.patch(`/api/activities/${a.id}/toggle`); load(); };
  const remove = async (a) => {
    if (!window.confirm(`Delete "${a.subject}"?`)) return;
    await api.del(`/api/activities/${a.id}`); load();
  };

  return (
    <>
      <div className="page-head">
        <h1>Sales follow-ups</h1>
        <div className="toolbar">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="0">Open</option>
            <option value="1">Completed</option>
            <option value="">All</option>
          </select>
          <button className="primary" onClick={() => setCreating(true)}>+ Log activity</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <table>
          <thead><tr><th></th><th>Type</th><th>Subject</th><th>Customer</th><th>Sale</th><th>Due</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="muted">No activities.</td></tr>}
            {rows.map((a) => (
              <tr key={a.id} className={a.done ? 'done' : ''}>
                <td><input type="checkbox" checked={!!a.done} onChange={() => toggle(a)} aria-label="Mark done" style={{ width: 18 }} /></td>
                <td><span className={`badge ${a.type}`}>{TYPE_LABELS[a.type]}</span></td>
                <td>{a.subject}</td>
                <td>{a.customer_name}</td>
                <td>{a.sale_title || '—'}</td>
                <td className={!a.done && a.due_date && a.due_date < today ? 'overdue' : ''}>{a.due_date || '—'}</td>
                <td className="actions"><button className="small danger" onClick={() => remove(a)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <ActivityForm customers={customers} sales={sales} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />
      )}
    </>
  );
}

function ActivityForm({ customers, sales, onClose, onSaved }) {
  const [form, setForm] = useState({ ...empty, customer_id: customers[0]?.id || '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const customerSales = sales.filter((d) => d.customer_id === Number(form.customer_id));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/activities', {
        customer_id: Number(form.customer_id),
        sale_id: form.sale_id ? Number(form.sale_id) : null,
        type: form.type,
        subject: form.subject,
        due_date: form.due_date || '',
      });
      onSaved();
    } catch (err) { setError(err.message); }
  };

  return (
    <Modal title="Log activity" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div>
            <label>Type</label>
            <select value={form.type} onChange={set('type')}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><label>Due date</label><input type="date" value={form.due_date} onChange={set('due_date')} /></div>
          <div>
            <label>Customer *</label>
            <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value, sale_id: '' })} required>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label>Related sale</label>
            <select value={form.sale_id} onChange={set('sale_id')}>
              <option value="">None</option>
              {customerSales.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
          <div className="full"><label>Subject *</label><input value={form.subject} onChange={set('subject')} required maxLength={200} /></div>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}
