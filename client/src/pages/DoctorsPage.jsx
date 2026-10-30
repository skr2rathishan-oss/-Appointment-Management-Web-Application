import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { doctorService } from '../services/doctorService';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import StatusMessage from '../components/StatusMessage';
import FieldError from '../components/FieldError';
import Toast, { useToast } from '../components/Toast';
import { doctorName, fieldErrors, initials } from '../utils/format';

const EMPTY_FORM = { firstName: '', lastName: '', specialization: '', email: '', phone: '' };

// [[specialization, doctors[]], ...] sorted by specialty, then by doctor name
function groupBySpecialty(doctors) {
  const groups = new Map();
  for (const d of doctors) {
    if (!groups.has(d.specialization)) groups.set(d.specialization, []);
    groups.get(d.specialization).push(d);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function AddDoctorForm({ onAdded }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const errors = fieldErrors(error);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const field = (name) => ({ name, value: form[name], onChange: handleChange, 'aria-invalid': Boolean(errors[name]) });

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const doctor = await doctorService.create({ ...form, phone: form.phone || null });
      setForm(EMPTY_FORM);
      onAdded(doctor);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel form-grid" onSubmit={handleSubmit}>
      <h2>Add doctor</h2>
      <label>First name<input {...field('firstName')} required /><FieldError message={errors.firstName} /></label>
      <label>Last name<input {...field('lastName')} required /><FieldError message={errors.lastName} /></label>
      <label>Specialization<input {...field('specialization')} required /><FieldError message={errors.specialization} /></label>
      <label>Email<input type="email" {...field('email')} required /><FieldError message={errors.email} /></label>
      <label>Phone<input type="tel" {...field('phone')} /><FieldError message={errors.phone} /></label>
      {error && !error.details && <p className="alert alert-error span-all">{error.message}</p>}
      <div className="form-actions">
        <button type="submit" disabled={saving}>{saving ? 'Adding doctor…' : 'Add doctor'}</button>
      </div>
    </form>
  );
}

export default function DoctorsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [toast, showToast] = useToast();
  const doctors = useAsync(() => doctorService.list());

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (doctors.data ?? []).filter((d) =>
      `${d.firstName} ${d.lastName} ${d.specialization}`.toLowerCase().includes(q),
    );
    return groupBySpecialty(matches);
  }, [doctors.data, query]);

  return (
    <section>
      <div className="page-header">
        <h1>Find a doctor</h1>
        <p className="lede">Choose a specialist, then pick a time that suits you.</p>
      </div>

      <input
        className="directory-search"
        type="search"
        placeholder="Search by name or specialty"
        aria-label="Search by name or specialty"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <StatusMessage
        loading={doctors.loading}
        error={doctors.error}
        empty={doctors.data?.length === 0}
        emptyText="No doctors are listed yet."
      />
      {doctors.data?.length > 0 && groups.length === 0 && (
        <div className="empty-state"><p>No doctors match “{query}”. Try a different name or specialty.</p></div>
      )}

      {groups.map(([specialty, list]) => (
        <section key={specialty} className="directory-group">
          <h2>{specialty}</h2>
          {list.map((d) => (
            <div key={d.id} className="doctor-row">
              <span className="monogram" aria-hidden="true">{initials(d.firstName, d.lastName)}</span>
              <div>
                <div className="doctor-name">{doctorName(d)}</div>
                <div className="muted">{d.specialization}</div>
              </div>
              <Link className="btn btn-secondary" to={`/doctors/${d.id}`}>
                {user?.role === 'doctor' ? 'View profile' : 'See available times'}
              </Link>
            </div>
          ))}
        </section>
      ))}

      {user?.role === 'admin' && (
        <AddDoctorForm
          onAdded={(doctor) => {
            showToast(`Doctor added: ${doctorName(doctor)}`);
            doctors.reload();
          }}
        />
      )}
      <Toast message={toast} />
    </section>
  );
}
