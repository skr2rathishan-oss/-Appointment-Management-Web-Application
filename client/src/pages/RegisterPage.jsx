import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FieldError from '../components/FieldError';
import { fieldErrors } from '../utils/format';
import { redirectTarget } from './LoginPage';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  phone: '',
  email: '',
  password: '',
};

export default function RegisterPage() {
  const { user, register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from;

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user && !submitting) return <Navigate to={redirectTarget(user, from)} replace />;

  const errors = fieldErrors(error);
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Shared props for one input: value, change handler and its error wiring
  const field = (name) => ({
    name,
    value: form[name],
    onChange: handleChange,
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `register-${name}-error` : undefined,
  });
  const errorFor = (name) => <FieldError id={`register-${name}-error`} message={errors[name]} />;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await register({ ...form, gender: form.gender || null });
      navigate(redirectTarget(created, from), { replace: true });
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <aside className="auth-welcome">
        <div>
          <h1>Create your account</h1>
          <p>One account for booking, changing and cancelling your visits.</p>
        </div>
        <ul>
          <li>See every doctor&apos;s open times</li>
          <li>Book in under a minute</li>
          <li>Cancel online if plans change</li>
        </ul>
      </aside>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <h2>Create account</h2>
        <div className="form-grid">
          <label>First name<input autoComplete="given-name" {...field('firstName')} required />{errorFor('firstName')}</label>
          <label>Last name<input autoComplete="family-name" {...field('lastName')} required />{errorFor('lastName')}</label>
          <label>Date of birth<input type="date" {...field('dateOfBirth')} required />{errorFor('dateOfBirth')}</label>
          <label>
            Gender
            <select {...field('gender')}>
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {errorFor('gender')}
          </label>
          <label>Phone<input type="tel" autoComplete="tel" {...field('phone')} required />{errorFor('phone')}</label>
          <label>Email<input type="email" autoComplete="email" {...field('email')} required />{errorFor('email')}</label>
          <label className="span-all">
            Password
            <input type="password" autoComplete="new-password" {...field('password')} required />
            <span className="hint">At least 8 characters with a letter and a number</span>
            {errorFor('password')}
          </label>
          {error && !error.details && <p className="alert alert-error span-all" role="alert">{error.message}</p>}
          <div className="form-actions">
            <button type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'}</button>
          </div>
        </div>
        <p className="auth-switch">Already registered? <Link to="/login" state={location.state}>Sign in</Link></p>
      </form>
    </div>
  );
}
