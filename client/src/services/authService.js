import httpClient from '../api/httpClient';

export const authService = {
  // Both resolve to { token, user }
  register: (data) => httpClient.post('/auth/register', data).then((res) => res.data.data),
  login: (email, password) => httpClient.post('/auth/login', { email, password }).then((res) => res.data.data),
  me: () => httpClient.get('/auth/me').then((res) => res.data.data),
};
