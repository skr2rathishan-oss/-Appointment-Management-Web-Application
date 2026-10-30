import { describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appointmentService } from '../services/appointmentService';
import { useAsync } from '../hooks/useAsync';
import DoctorVisitList from './DoctorVisitList';
import { fieldErrors, isUpcoming, nextDays } from '../utils/format';

vi.mock('../services/appointmentService', () => ({
  appointmentService: { updateStatus: vi.fn() },
}));

const visit = (id, status) => ({
  id,
  status,
  patientName: `Patient ${id}`,
  appointmentDate: '2026-11-05',
  startTime: '09:30:00',
  endTime: '10:00:00',
  reason: null,
});

describe('DoctorVisitList', () => {
  it('offers actions that match each status', () => {
    render(
      <DoctorVisitList
        appointments={[visit(1, 'scheduled'), visit(2, 'confirmed'), visit(3, 'completed')]}
        onChanged={() => {}}
      />,
    );
    const [scheduled, confirmed, completed] = screen.getAllByRole('listitem');
    expect(scheduled).toHaveTextContent('Confirm visit');
    expect(scheduled).toHaveTextContent('Cancel visit');
    expect(confirmed).toHaveTextContent('Mark completed');
    expect(confirmed).toHaveTextContent('Mark no-show');
    expect(completed.querySelectorAll('button')).toHaveLength(0);
  });

  it('updates the status and reports the toast text', async () => {
    appointmentService.updateStatus.mockResolvedValue({});
    const onChanged = vi.fn();
    render(<DoctorVisitList appointments={[visit(1, 'scheduled')]} onChanged={onChanged} />);

    await userEvent.click(screen.getByRole('button', { name: 'Confirm visit' }));

    expect(appointmentService.updateStatus).toHaveBeenCalledWith(1, 'confirmed');
    expect(onChanged).toHaveBeenCalledWith('Visit confirmed');
  });

  it('shows the server error when an update fails', async () => {
    appointmentService.updateStatus.mockRejectedValue(new Error('The doctor already has an appointment in this time slot'));
    render(<DoctorVisitList appointments={[visit(1, 'confirmed')]} onChanged={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: 'Mark completed' }));

    expect(await screen.findByText(/already has an appointment/)).toBeInTheDocument();
  });
});

describe('useAsync', () => {
  it('ignores a slow earlier response once a newer one has started', async () => {
    const pending = {};
    const loader = (key) => new Promise((resolve) => { pending[key] = resolve; });
    const { result, rerender } = renderHook(({ day }) => useAsync(() => loader(day), [day]), {
      initialProps: { day: 'mon' },
    });

    rerender({ day: 'tue' });
    await act(async () => pending.tue('tuesday slots'));
    await act(async () => pending.mon('monday slots')); // arrives late

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe('tuesday slots');
  });
});

describe('format helpers', () => {
  it('nextDays lists consecutive dates from the given day, across a month end', () => {
    expect(nextDays(3, '2026-10-31')).toEqual(['2026-10-31', '2026-11-01', '2026-11-02']);
  });

  it('isUpcoming compares date and start time with now', () => {
    const now = { date: '2026-11-05', time: '09:45:00' };
    expect(isUpcoming({ appointmentDate: '2026-11-05', startTime: '10:00:00' }, now)).toBe(true);
    expect(isUpcoming({ appointmentDate: '2026-11-05', startTime: '09:30:00' }, now)).toBe(false);
  });

  it('fieldErrors maps server details to the first message per field', () => {
    const error = { details: [{ field: 'email', message: 'a' }, { field: 'email', message: 'b' }, { field: 'password', message: 'c' }] };
    expect(fieldErrors(error)).toEqual({ email: 'a', password: 'c' });
    expect(fieldErrors(null)).toEqual({});
  });
});
