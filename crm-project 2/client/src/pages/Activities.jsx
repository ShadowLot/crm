import { useCallback, useEffect, useState } from 'react';
import { api, TYPE_LABELS } from '../api.js';
import Modal from '../components/Modal.jsx';

const today = new Date().toISOString().slice(0, 10);
const empty = { contact_id: '', deal_id: '', type: 'call', subject: '', due_date: '' };

export default function Activities() {
  const [rows, setRows] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [filter, setFilter] = useState('0'); // 0 = open, 1 = done, '' = all
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([api.get(`/api/activities?done=${filter}`), api.get('/api/contacts'), api.get('/api/deals')])
      .then(([a, c, d]) => { setRows(a); setContacts(c); setDeals(d); })
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
        <h1>Activities & follow-ups</h1>
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
          <thead><tr><th></th><th>Type</th><th>Subject</th><th>Contact</th><th>Deal</th><th>Due</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="muted">No activities.</td></tr>}
            {rows.map((a) => (
              <tr key={a.id} className={a.done ? 'done' : ''}>
                <td><input type="checkbox" checked={!!a.done} onChange={() => toggle(a)} aria-label="Mark done" style={{ width: 18 }} /></td>
                <td><span className={`badge ${a.type}`}>{TYPE_LABELS[a.type]}</span></td>
                <td>{a.subject}</td>
                <td>{a.contact_name}</td>
                <td>{a.deal_title || '—'}</td>
                <td className={!a.done && a.due_date && a.due_date < today ? 'overdue' : ''}>{a.due_date || '—'}</td>
                <td className="actions"><button className="small danger" onClick={() => remove(a)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <ActivityForm contacts={contacts} deals={deals} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />
      )}
    </>
  );
}

function ActivityForm({ contacts, deals, onClose, onSaved }) {
  const [form, setForm] = useState({ ...empty, contact_id: contacts[0]?.id || '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const contactDeals = deals.filter((d) => d.contact_id === Number(form.contact_id));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/activities', {
        contact_id: Number(form.contact_id),
        deal_id: form.deal_id ? Number(form.deal_id) : null,
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
            <label>Contact *</label>
            <select value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value, deal_id: '' })} required>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label>Related deal</label>
            <select value={form.deal_id} onChange={set('deal_id')}>
              <option value="">None</option>
              {contactDeals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
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
