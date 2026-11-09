import { useCallback, useEffect, useState } from 'react';
import { api, inr, STAGE_LABELS } from '../api.js';
import Modal from '../components/Modal.jsx';

const stages = Object.keys(STAGE_LABELS);
const empty = { contact_id: '', title: '', value: '', stage: 'new', expected_close: '' };

export default function Deals() {
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([api.get('/api/deals'), api.get('/api/contacts')])
      .then(([d, c]) => { setDeals(d); setContacts(c); })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const move = async (deal, stage) => {
    await api.patch(`/api/deals/${deal.id}/stage`, { stage });
    load();
  };
  const remove = async (deal) => {
    if (!window.confirm(`Delete deal "${deal.title}"?`)) return;
    await api.del(`/api/deals/${deal.id}`);
    load();
  };

  return (
    <>
      <div className="page-head">
        <h1>Deals pipeline</h1>
        <button className="primary" onClick={() => setEditing({ ...empty })}>+ New deal</button>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="board">
        {stages.map((s) => {
          const items = deals.filter((d) => d.stage === s);
          const total = items.reduce((sum, d) => sum + d.value, 0);
          return (
            <div className="column" key={s}>
              <h3>{STAGE_LABELS[s]}</h3>
              <div className="total">{items.length} deals · {inr(total)}</div>
              {items.map((d) => (
                <div className="deal-card" key={d.id}>
                  <div className="title">{d.title}</div>
                  <div className="meta">{d.contact_name}{d.contact_company ? ` · ${d.contact_company}` : ''}</div>
                  <div className="value">{inr(d.value)}</div>
                  {d.expected_close && <div className="meta">Close by {d.expected_close}</div>}
                  <select value={d.stage} onChange={(e) => move(d, e.target.value)} aria-label="Move to stage">
                    {stages.map((st) => <option key={st} value={st}>{STAGE_LABELS[st]}</option>)}
                  </select>
                  <div className="row">
                    <button className="small" onClick={() => setEditing(d)}>Edit</button>
                    <button className="small danger" onClick={() => remove(d)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {editing && (
        <DealForm initial={editing} contacts={contacts} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </>
  );
}

function DealForm({ initial, contacts, onClose, onSaved }) {
  const [form, setForm] = useState({ ...empty, ...initial, contact_id: initial.contact_id || contacts[0]?.id || '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const body = {
      contact_id: Number(form.contact_id),
      title: form.title,
      value: Number(form.value) || 0,
      stage: form.stage,
      expected_close: form.expected_close || '',
    };
    try {
      if (initial.id) await api.put(`/api/deals/${initial.id}`, body);
      else await api.post('/api/deals', body);
      onSaved();
    } catch (err) { setError(err.message); }
  };

  return (
    <Modal title={initial.id ? 'Edit deal' : 'New deal'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="full"><label>Title *</label><input value={form.title} onChange={set('title')} required maxLength={120} /></div>
          <div>
            <label>Contact *</label>
            <select value={form.contact_id} onChange={set('contact_id')} required>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
            </select>
          </div>
          <div><label>Value (INR)</label><input type="number" min="0" step="1" value={form.value} onChange={set('value')} /></div>
          <div>
            <label>Stage</label>
            <select value={form.stage} onChange={set('stage')}>
              {stages.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
          </div>
          <div><label>Expected close</label><input type="date" value={form.expected_close || ''} onChange={set('expected_close')} /></div>
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
