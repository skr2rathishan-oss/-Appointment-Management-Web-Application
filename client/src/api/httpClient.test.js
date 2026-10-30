import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import httpClient, { setUnauthorizedHandler } from './httpClient';
import { tokenStorage } from './tokenStorage';

// Replace the network layer: each test decides what the "server" returns and sees the
// final request config after the interceptors have run.
let respond;
beforeEach(() => {
  respond = (config) => Promise.resolve({ data: { data: 'ok' }, status: 200, headers: {}, config });
  httpClient.defaults.adapter = (config) => respond(config);
});
afterEach(() => setUnauthorizedHandler(null));

// What axios hands to the response interceptor when the server answers with an error
function serverError(config, status, error) {
  return Promise.reject(
    Object.assign(new Error(`Request failed with status code ${status}`), {
      isAxiosError: true,
      config,
      response: { status, data: { error }, headers: {}, config },
    }),
  );
}

describe('auth header interceptor', () => {
  it('adds Authorization: Bearer <token> when a token is stored', async () => {
    tokenStorage.set('abc.def.ghi');
    const res = await httpClient.get('/appointments');
    expect(res.config.headers.Authorization).toBe('Bearer abc.def.ghi');
  });

  it('sends no Authorization header when signed out', async () => {
    const res = await httpClient.get('/doctors');
    expect(res.config.headers.Authorization).toBeUndefined();
  });
});

describe('401 handling', () => {
  it('clears the token and calls the unauthorized handler on a 401', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    tokenStorage.set('expired');
    respond = (config) => serverError(config, 401, { message: 'Session expired, please log in again' });

    await expect(httpClient.get('/appointments')).rejects.toMatchObject({
      message: 'Session expired, please log in again',
      status: 401,
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(tokenStorage.get()).toBeNull();
  });

  it.each(['/auth/login', '/auth/register'])('leaves the session alone for a 401 from %s', async (url) => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    tokenStorage.set('still-valid');
    respond = (config) => serverError(config, 401, { message: 'Invalid email or password' });

    await expect(httpClient.post(url, {})).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(tokenStorage.get()).toBe('still-valid');
  });

  it('does not treat a 403 as signed out', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    respond = (config) => serverError(config, 403, { message: 'Forbidden' });

    await expect(httpClient.get('/patients')).rejects.toMatchObject({ status: 403 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe('error normalisation', () => {
  it('exposes the server message, status and validation details', async () => {
    const details = [{ field: 'email', message: 'Invalid email' }];
    respond = (config) => serverError(config, 400, { message: 'Validation failed', details });

    await expect(httpClient.post('/auth/register', {})).rejects.toMatchObject({
      message: 'Validation failed',
      status: 400,
      details,
    });
  });
});

describe('tokenStorage', () => {
  it('keeps the token in memory when localStorage throws', () => {
    const blocked = () => { throw new Error('SecurityError'); };
    const spies = [
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked),
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked),
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked),
    ];
    try {
      tokenStorage.set('memory-only');
      expect(tokenStorage.get()).toBe('memory-only');
      tokenStorage.clear();
      expect(tokenStorage.get()).toBeNull();
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });
});
