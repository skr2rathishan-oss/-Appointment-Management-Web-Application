import axios from 'axios';
import { tokenStorage } from './tokenStorage';

// Single HTTP client for all REST calls to the server
const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// A 401 from these means "wrong credentials", not "session ended"
const AUTH_ATTEMPT_URLS = ['/auth/login', '/auth/register'];

let onUnauthorized = null;

// AuthContext registers its logout here, so this module doesn't depend on React
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

httpClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalise server errors ({ error: { message, details } }) into a plain Error
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    if (status === 401 && !AUTH_ATTEMPT_URLS.includes(url)) {
      tokenStorage.clear();
      onUnauthorized?.();
    }

    const payload = error.response?.data?.error;
    const normalised = new Error(payload?.message || error.message || 'Request failed');
    normalised.status = status;
    normalised.details = payload?.details;
    return Promise.reject(normalised);
  },
);

export default httpClient;
