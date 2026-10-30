import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { tokenStorage } from '../api/tokenStorage';
import { authService } from '../services/authService';
import { doctorService } from '../services/doctorService';
import { appointmentService } from '../services/appointmentService';
import { clinicService } from '../services/clinicService';
import DoctorDetailsPage from './DoctorDetailsPage';
import AppointmentsPage from './AppointmentsPage';
import ProtectedRoute from '../components/ProtectedRoute';

vi.mock('../services/authService', () => ({ authService: { login: vi.fn(), register: vi.fn(), me: vi.fn() } }));
vi.mock('../services/doctorService', () => ({ doctorService: { getById: vi.fn(), getAvailability: vi.fn() } }));
vi.mock('../services/appointmentService', () => ({
  APPOINTMENT_STATUSES: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'],
  appointmentService: { list: vi.fn(), create: vi.fn(), updateStatus: vi.fn() },
}));
vi.mock('../services/clinicService', () => ({ clinicService: { getTime: vi.fn() } }));

// The clinic says it is Wed 5 Nov 2026, 10:10
const CLINIC_NOW = { date: '2026-11-05', time: '10:10:00', timeZone: 'Asia/Colombo' };
const DOCTOR = { id: 2, firstName: 'Kavin', lastName: 'Fernando', specialization: 'Cardiology', email: 'k@clinic.local', phone: null };
const PATIENT = { id: 2, email: 'patient@demo.local', role: 'patient', patientId: 1, doctorId: null, firstName: 'Saman', lastName: 'Silva' };

function LoginStub() {
  const location = useLocation();
  return <p data-testid="login">{JSON.stringify(location.state)}</p>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginStub />} />
          <Route path="/doctors/:id" element={<DoctorDetailsPage />} />
          <Route path="/appointments" element={<ProtectedRoute roles={['patient', 'admin']}><AppointmentsPage /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('DoctorDetailsPage', () => {
  function mockDoctorPage() {
    clinicService.getTime.mockResolvedValue(CLINIC_NOW);
    doctorService.getById.mockResolvedValue(DOCTOR);
    doctorService.getAvailability.mockImplementation(async (id, date) => ({
      date,
      doctorId: 2,
      today: CLINIC_NOW.date,
      now: CLINIC_NOW.time,
      slots: [
        { startTime: '09:30:00', endTime: '10:00:00', available: false },
        { startTime: '11:00:00', endTime: '11:30:00', available: false },
        { startTime: '11:30:00', endTime: '12:00:00', available: true },
      ],
    }));
  }

  it("starts the day strip at the clinic's today and labels slots from the server's clock", async () => {
    mockDoctorPage();
    renderAt('/doctors/2');

    expect(await screen.findByRole('button', { name: 'Reserve 11:30' })).toBeInTheDocument();
    expect(doctorService.getAvailability).toHaveBeenCalledWith('2', '2026-11-05');
    const firstDay = within(screen.getByRole('group', { name: 'Choose a day' })).getAllByRole('button')[0];
    expect(firstDay).toHaveAttribute('aria-pressed', 'true');
    expect(firstDay).toHaveAccessibleName('Thu 5 Nov');
    expect(screen.getByText('Passed')).toBeInTheDocument(); // 09:30 is before 10:10
    expect(screen.getByText('Taken')).toBeInTheDocument(); // 11:00 is booked
  });

  it('sends a signed-out visitor to sign in, remembering the doctor and day', async () => {
    mockDoctorPage();
    renderAt('/doctors/2?date=2026-11-07');

    await userEvent.click(await screen.findByRole('button', { name: 'Reserve 11:30' }));

    const state = JSON.parse((await screen.findByTestId('login')).textContent);
    expect(state).toEqual({ from: { pathname: '/doctors/2', search: '?date=2026-11-07' }, booking: true });
    expect(appointmentService.create).not.toHaveBeenCalled();
  });

  it('books the slot for a signed-in patient after confirming', async () => {
    mockDoctorPage();
    tokenStorage.set('patient-token');
    authService.me.mockResolvedValue(PATIENT);
    appointmentService.create.mockResolvedValue({ id: 9 });
    renderAt('/doctors/2');

    await userEvent.click(await screen.findByRole('button', { name: 'Reserve 11:30' }));
    await userEvent.type(screen.getByLabelText('Reason for visit (optional)'), 'Chest pain');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(appointmentService.create).toHaveBeenCalledWith({
      doctorId: 2,
      appointmentDate: '2026-11-05',
      startTime: '11:30:00',
      endTime: '12:00:00',
      reason: 'Chest pain',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Booked: Thu 5 Nov, 11:30 with Dr. Fernando');
  });
});

describe('My visits', () => {
  const visit = (id, date, status) => ({
    id,
    patientId: 1,
    doctorId: 2,
    doctorName: 'Kavin Fernando',
    doctorSpecialization: 'Cardiology',
    appointmentDate: date,
    startTime: '11:00:00',
    endTime: '11:30:00',
    status,
    reason: null,
  });

  it('cancels an upcoming visit; cancelled upcoming and past visits have no Cancel button', async () => {
    clinicService.getTime.mockResolvedValue(CLINIC_NOW);
    tokenStorage.set('patient-token');
    authService.me.mockResolvedValue(PATIENT);
    appointmentService.list.mockResolvedValue([
      visit(1, '2026-11-01', 'completed'),
      visit(2, '2026-11-07', 'scheduled'),
      visit(3, '2026-11-09', 'cancelled'),
    ]);
    appointmentService.updateStatus.mockResolvedValue({});
    renderAt('/appointments');

    const upcoming = (await screen.findAllByRole('list'))[0];
    const slips = within(upcoming).getAllByRole('listitem');
    expect(slips).toHaveLength(2); // the cancelled future visit stays under Upcoming
    expect(within(slips[1]).getByText('Cancelled')).toBeInTheDocument();
    expect(within(slips[1]).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Cancel visit' })).toHaveLength(1);

    await userEvent.click(within(slips[0]).getByRole('button', { name: 'Cancel visit' }));

    expect(appointmentService.updateStatus).toHaveBeenCalledWith(2, 'cancelled');
    expect(await screen.findByRole('status')).toHaveTextContent('Visit cancelled');
  });
});
