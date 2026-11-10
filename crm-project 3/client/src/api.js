// Thin wrapper around fetch.  Same-origin requests carry the httpOnly session
// cookie automatically; no token is ever stored in page-accessible storage.
async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.details?.map((d) => `${d.path}: ${d.message}`).join(', ');
    throw new Error(detail ? `${data.error} (${detail})` : data.error || res.statusText);
  }
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  del: (url) => request('DELETE', url),
};

export const STATUS_LABELS = { lead: 'Lead', prospect: 'Prospect', customer: 'Customer', inactive: 'Inactive' };
export const STAGE_LABELS = { new: 'New', contacted: 'Contacted', qualified: 'Qualified', proposal: 'Proposal', won: 'Won', lost: 'Lost' };
export const TYPE_LABELS = { call: 'Call', email: 'Email', meeting: 'Meeting', task: 'Task', note: 'Note' };

export const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
