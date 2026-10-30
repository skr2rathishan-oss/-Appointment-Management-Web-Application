import { useState } from 'react';
import { patientService } from '../services/patientService';
import { useAsync } from '../hooks/useAsync';
import StatusMessage from '../components/StatusMessage';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  email: '',
  phone: '',
  address: '',
};

// Optional fields go to the API as null rather than empty strings
const toPayload = (form) =>
  Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value === '' ? null : value]));

export default function PatientsPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const patients = useAsync(() => patientService.list());

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    try {
      await patientService.create(toPayload(form));
      setForm(EMPTY_FORM);
      patients.reload();
    } catch (err) {
      setFormError(err);
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>Patients</h1>
        <p className="lede">Everyone registered with the clinic.</p>
      </div>

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <h2>Register patient</h2>
        <label>First name<input name="firstName" value={form.firstName} onChange={handleChange} required /></label>
        <label>Last name<input name="lastName" value={form.lastName} onChange={handleChange} required /></label>
        <label>Date of birth<input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} required /></label>
        <label>
          Gender
          <select name="gender" value={form.gender} onChange={handleChange}>
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>Phone<input name="phone" value={form.phone} onChange={handleChange} required /></label>
        <label>Email<input type="email" name="email" value={form.email} onChange={handleChange} /></label>
        <label className="span-all">Address<input name="address" value={form.address} onChange={handleChange} /></label>
        {formError && <p className="alert alert-error span-all">{formError.message}</p>}
        <div className="form-actions">
          <button type="submit">Register patient</button>
        </div>
      </form>

      <div className="panel">
        <StatusMessage loading={patients.loading} error={patients.error} empty={patients.data?.length === 0} />
        {patients.data?.length > 0 && (
          <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Date of birth</th><th>Phone</th><th>Email</th></tr></thead>
            <tbody>
              {patients.data.map((p) => (
                <tr key={p.id}>
                  <td>{p.firstName} {p.lastName}</td>
                  <td>{p.dateOfBirth}</td>
                  <td>{p.phone}</td>
                  <td>{p.email || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </section>
  );
}
