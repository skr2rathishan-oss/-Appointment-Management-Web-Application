import httpClient from '../api/httpClient';

export const APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];

export const appointmentService = {
  // filters: { doctorId, patientId, date, status }
  list: (filters = {}) => httpClient.get('/appointments', { params: filters }).then((res) => res.data.data),
  getById: (id) => httpClient.get(`/appointments/${id}`).then((res) => res.data.data),
  create: (appointment) => httpClient.post('/appointments', appointment).then((res) => res.data.data),
  updateStatus: (id, status) =>
    httpClient.patch(`/appointments/${id}/status`, { status }).then((res) => res.data.data),
  remove: (id) => httpClient.delete(`/appointments/${id}`),
};
