import httpClient from '../api/httpClient';

export const doctorService = {
  list: () => httpClient.get('/doctors').then((res) => res.data.data),
  getById: (id) => httpClient.get(`/doctors/${id}`).then((res) => res.data.data),
  create: (doctor) => httpClient.post('/doctors', doctor).then((res) => res.data.data),
  // date: 'YYYY-MM-DD' -> { date, doctorId, slots: [{ startTime, endTime, available }] }
  getAvailability: (id, date) =>
    httpClient.get(`/doctors/${id}/availability`, { params: { date } }).then((res) => res.data.data),
};
