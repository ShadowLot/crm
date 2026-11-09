import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/contacts', label: 'Contacts', icon: '☺' },
  { to: '/deals', label: 'Deals', icon: '◆' },
  { to: '/activities', label: 'Activities', icon: '✓' },
];

export default function Layout({ user, onLogout, children }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Client<span>Track</span></div>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}>
              <span aria-hidden="true">{l.icon}</span> {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="spacer" />
        <div className="user">
          Signed in as <strong>{user.name}</strong>
          <button className="small" onClick={onLogout}>Sign out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
