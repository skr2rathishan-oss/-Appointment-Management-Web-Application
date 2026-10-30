import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Each role sees only the pages it can use
const NAV_BY_ROLE = {
  guest: [
    { to: '/', label: 'Home', end: true },
    { to: '/doctors', label: 'Find a doctor' },
  ],
  patient: [
    { to: '/', label: 'Home', end: true },
    { to: '/doctors', label: 'Find a doctor' },
    { to: '/appointments', label: 'My visits' },
  ],
  doctor: [
    { to: '/doctor', label: 'Today', end: true },
    { to: '/doctor/schedule', label: 'Schedule' },
    { to: '/doctor/profile', label: 'My profile' },
  ],
  admin: [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/appointments', label: 'Appointments' },
    { to: '/doctors', label: 'Doctors' },
    { to: '/patients', label: 'Patients' },
  ],
};

const displayName = (user) => {
  if (!user.firstName) return user.email;
  return user.role === 'doctor' ? `Dr. ${user.lastName}` : user.firstName;
};

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV_BY_ROLE[user?.role ?? 'guest'];

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" to={user?.role === 'doctor' ? '/doctor' : '/'}>MediBook</Link>
          <nav aria-label="Main">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          {!loading && (
            <div className="user-menu">
              {user ? (
                <>
                  <span className="user-name">{displayName(user)}</span>
                  <button type="button" className="btn btn-on-dark" onClick={handleLogout}>Sign out</button>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn btn-ghost btn-ghost-on-dark">Create account</Link>
                  <Link to="/login" className="btn btn-on-dark">Sign in</Link>
                </>
              )}
            </div>
          )}
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
