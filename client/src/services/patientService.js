import httpClient from '../api/httpClient';

export const patientService = {
  list: () => httpClient.get('/patients').then((res) => res.data.data),
  getById: (id) => httpClient.get(`/patients/${id}`).then((res) => res.data.data),
  create: (patient) => httpClient.post('/patients', patient).then((res) => res.data.data),
};
