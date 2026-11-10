import { useCallback, useEffect, useState } from 'react';
import { api, STATUS_LABELS } from '../api.js';
import Modal from '../components/Modal.jsx';

const empty = { name: '', email: '', phone: '', company: '', status: 'lead', notes: '' };

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null); // null | {} (new) | customer
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams({ q, status });
    api.get(`/api/customers?${params}`).then(setRows).catch((e) => setError(e.message));
  }, [q, status]);

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  const remove = async (c) => {
    if (!window.confirm(`Delete ${c.name}? Linked sales and activities will be removed too.`)) return;
    await api.del(`/api/customers/${c.id}`);
    load();
  };

  return (
    <>
      <div className="page-head">
        <h1>Customers</h1>
        <div className="toolbar">
          <input placeholder="Search name, email, company…" value={q} onChange={(e) => setQ(e.target.value)} maxLength={50} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="primary" onClick={() => setEditing({ ...empty })}>+ New customer</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <table>
          <thead>
            <tr><th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>Status</th><th>Sales</th><th></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="muted">No customers found.</td></tr>}
            {rows.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong></td>
                <td>{c.company || '—'}</td>
                <td>{c.email || '—'}</td>
                <td>{c.phone || '—'}</td>
                <td><span className={`badge ${c.status}`}>{STATUS_LABELS[c.status]}</span></td>
                <td>{c.sale_count}</td>
                <td className="actions">
                  <button className="small" onClick={() => setEditing(c)}>Edit</button>{' '}
                  <button className="small danger" onClick={() => remove(c)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <CustomerForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function CustomerForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({ ...empty, ...initial });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const body = { name: form.name, email: form.email, phone: form.phone, company: form.company, status: form.status, notes: form.notes };
    try {
      if (initial.id) await api.put(`/api/customers/${initial.id}`, body);
      else await api.post('/api/customers', body);
      onSaved();
    } catch (err) { setError(err.message); }
  };

  return (
    <Modal title={initial.id ? 'Edit customer' : 'New customer'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div><label>Name *</label><input value={form.name} onChange={set('name')} required maxLength={100} /></div>
          <div><label>Company</label><input value={form.company} onChange={set('company')} maxLength={100} /></div>
          <div><label>Email</label><input type="email" value={form.email} onChange={set('email')} maxLength={120} /></div>
          <div><label>Phone</label><input value={form.phone} onChange={set('phone')} maxLength={20} /></div>
          <div>
            <label>Status</label>
            <select value={form.status} onChange={set('status')}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="full"><label>Notes</label><textarea rows={3} value={form.notes} onChange={set('notes')} maxLength={2000} /></div>
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
