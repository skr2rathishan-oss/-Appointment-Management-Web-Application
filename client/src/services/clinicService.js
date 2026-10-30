import httpClient from '../api/httpClient';

export const clinicService = {
  // The clinic's current { date: 'YYYY-MM-DD', time: 'HH:MM:SS', timeZone }
  getTime: () => httpClient.get('/clinic/time').then((res) => res.data.data),
};
