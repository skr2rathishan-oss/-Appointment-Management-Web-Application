import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { tokenStorage } from '../api/tokenStorage';
import { authService } from '../services/authService';
import ProtectedRoute from '../components/ProtectedRoute';
import LoginPage, { DEMO_ACCOUNTS } from './LoginPage';

vi.mock('../services/authService', () => ({
  authService: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
}));

const USERS = {
  patient: { id: 2, email: 'patient@demo.local', role: 'patient', patientId: 1, doctorId: null, firstName: 'Saman', lastName: 'Silva' },
  doctor: { id: 3, email: 'doctor@demo.local', role: 'doctor', patientId: null, doctorId: 1, firstName: 'Anjali', lastName: 'Perera' },
  admin: { id: 1, email: 'admin@clinic.local', role: 'admin', patientId: null, doctorId: null, firstName: null, lastName: null },
};

// Shows which route we ended up on
function WhereAmI() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}{location.search}</p>;
}

function renderApp(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<WhereAmI />} />
          <Route path="/doctor" element={<ProtectedRoute roles={['doctor']}><WhereAmI /></ProtectedRoute>} />
          <Route path="/doctors/:id" element={<WhereAmI />} />
          <Route path="/patients" element={<ProtectedRoute roles={['admin']}><p>Patients list</p></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute><p>Any signed-in user</p></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const session = (role) => ({ token: `${role}-token`, user: USERS[role] });

describe('LoginPage', () => {
  it.each([
    ['patient', '/'],
    ['doctor', '/doctor'],
    ['admin', '/'],
  ])('sends a %s to %s after signing in', async (role, landing) => {
    authService.login.mockResolvedValue(session(role));
    renderApp(['/login']);

    await userEvent.type(screen.getByLabelText('Email'), USERS[role].email);
    await userEvent.type(screen.getByLabelText('Password'), 'whatever1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByTestId('location')).toHaveTextContent(new RegExp(`^${landing}$`));
    expect(authService.login).toHaveBeenCalledWith(USERS[role].email, 'whatever1');
    expect(tokenStorage.get()).toBe(`${role}-token`);
  });

  it('returns to the page that sent the user to sign in (booking redirect)', async () => {
    authService.login.mockResolvedValue(session('patient'));
    renderApp([{ pathname: '/login', state: { from: { pathname: '/doctors/2', search: '?date=2026-11-05' } } }]);

    await userEvent.click(screen.getByRole('button', { name: 'Sign in as demo patient' }));

    expect(await screen.findByTestId('location')).toHaveTextContent('/doctors/2?date=2026-11-05');
  });

  it('signs in as the demo patient with one click', async () => {
    authService.login.mockResolvedValue(session('patient'));
    renderApp(['/login']);

    await userEvent.click(screen.getByRole('button', { name: 'Sign in as demo patient' }));

    expect(authService.login).toHaveBeenCalledWith('patient@demo.local', 'Patient@123');
    expect(await screen.findByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it('signs in as the demo doctor with one click and lands on /doctor', async () => {
    authService.login.mockResolvedValue(session('doctor'));
    renderApp(['/login']);

    await userEvent.click(screen.getByRole('button', { name: 'Sign in as demo doctor' }));

    expect(authService.login).toHaveBeenCalledWith('doctor@demo.local', 'Doctor@123');
    expect(await screen.findByTestId('location')).toHaveTextContent(/^\/doctor$/);
  });

  it('shows the demo credentials', () => {
    renderApp(['/login']);
    expect(screen.getByText(new RegExp(DEMO_ACCOUNTS.patient.email))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(DEMO_ACCOUNTS.doctor.password))).toBeInTheDocument();
  });

  it('shows a message and stays on the page for wrong credentials', async () => {
    authService.login.mockRejectedValue(Object.assign(new Error('Invalid email or password'), { status: 401 }));
    renderApp(['/login']);

    await userEvent.type(screen.getByLabelText('Email'), 'x@y.z');
    await userEvent.type(screen.getByLabelText('Password'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('don’t match');
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });

  it('shows server validation errors next to the field', async () => {
    authService.login.mockRejectedValue(
      Object.assign(new Error('Validation failed'), { status: 400, details: [{ field: 'email', message: 'Invalid email address' }] }),
    );
    renderApp(['/login']);

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('ProtectedRoute', () => {
  it('sends a signed-out visitor to /login', () => {
    renderApp(['/appointments']);
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText('Any signed-in user')).not.toBeInTheDocument();
  });

  it('restores the session from a stored token and lets the right role in', async () => {
    tokenStorage.set('doctor-token');
    authService.me.mockResolvedValue(USERS.doctor);
    renderApp(['/doctor']);

    expect(await screen.findByTestId('location')).toHaveTextContent(/^\/doctor$/);
    expect(authService.me).toHaveBeenCalled();
  });

  it('sends a patient away from a doctor-only page to their own home', async () => {
    tokenStorage.set('patient-token');
    authService.me.mockResolvedValue(USERS.patient);
    renderApp(['/doctor']);

    expect(await screen.findByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it('sends a doctor away from an admin-only page to /doctor', async () => {
    tokenStorage.set('doctor-token');
    authService.me.mockResolvedValue(USERS.doctor);
    renderApp(['/patients']);

    expect(await screen.findByTestId('location')).toHaveTextContent(/^\/doctor$/);
    expect(screen.queryByText('Patients list')).not.toBeInTheDocument();
  });

  it('lets an admin into an admin-only page', async () => {
    tokenStorage.set('admin-token');
    authService.me.mockResolvedValue(USERS.admin);
    renderApp(['/patients']);

    expect(await screen.findByText('Patients list')).toBeInTheDocument();
  });

  it('allows any signed-in role when no roles are given', async () => {
    tokenStorage.set('patient-token');
    authService.me.mockResolvedValue(USERS.patient);
    renderApp(['/appointments']);

    expect(await screen.findByText('Any signed-in user')).toBeInTheDocument();
  });

  it('drops a stored token the server rejects and asks the user to sign in', async () => {
    tokenStorage.set('stale-token');
    authService.me.mockRejectedValue(Object.assign(new Error('Invalid token'), { status: 401 }));
    renderApp(['/appointments']);

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(tokenStorage.get()).toBeNull();
  });
});
