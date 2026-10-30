import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext';
import FieldError from '../components/FieldError';
import { fieldErrors } from '../utils/format';

// Seeded by database/init/03_auth.sql (development only)
export const DEMO_ACCOUNTS = {
  patient: { email: 'patient@demo.local', password: 'Patient@123' },
  doctor: { email: 'doctor@demo.local', password: 'Doctor@123' },
};

// Back to the page that sent the user here (e.g. a slot they tried to book), else their home
export function redirectTarget(user, from) {
  if (from?.pathname && from.pathname !== '/login') return `${from.pathname}${from.search ?? ''}`;
  return homeFor(user.role);
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from;

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user && !submitting) return <Navigate to={redirectTarget(user, from)} replace />;

  const errors = fieldErrors(error);
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function signIn(email, password) {
    setSubmitting(true);
    setError(null);
    try {
      const signedIn = await login(email, password);
      navigate(redirectTarget(signedIn, from), { replace: true });
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    signIn(form.email, form.password);
  }

  return (
    <div className="auth-layout">
      <aside className="auth-welcome">
        <div>
          <h1>Welcome back</h1>
          <p>Sign in to see your visits and book a new one.</p>
        </div>
        <ul>
          <li>See every doctor&apos;s open times</li>
          <li>Book in under a minute</li>
          <li>Cancel online if plans change</li>
        </ul>
      </aside>

      <form className="auth-form form-stack" onSubmit={handleSubmit} noValidate>
        <h2>Sign in</h2>
        {location.state?.booking === true && <p className="muted">Sign in to finish booking your visit.</p>}
        <label>
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            required
          />
          <FieldError id="login-email-error" message={errors.email} />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            required
          />
          <FieldError id="login-password-error" message={errors.password} />
        </label>
        {error && !error.details && (
          <p className="alert alert-error" role="alert">
            {error.status === 401 ? 'That email and password don’t match. Check them and try again.' : error.message}
          </p>
        )}
        <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
        <p className="auth-switch">New here? <Link to="/register" state={location.state}>Create an account</Link></p>

        <section className="demo-accounts" aria-labelledby="demo-heading">
          <h3 id="demo-heading">Try a demo account</h3>
          <div className="demo-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={submitting}
              onClick={() => signIn(DEMO_ACCOUNTS.patient.email, DEMO_ACCOUNTS.patient.password)}
            >
              Sign in as demo patient
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={submitting}
              onClick={() => signIn(DEMO_ACCOUNTS.doctor.email, DEMO_ACCOUNTS.doctor.password)}
            >
              Sign in as demo doctor
            </button>
          </div>
          <p className="hint">
            Patient: {DEMO_ACCOUNTS.patient.email} / {DEMO_ACCOUNTS.patient.password}
            <br />
            Doctor: {DEMO_ACCOUNTS.doctor.email} / {DEMO_ACCOUNTS.doctor.password}
          </p>
        </section>
      </form>
    </div>
  );
}
