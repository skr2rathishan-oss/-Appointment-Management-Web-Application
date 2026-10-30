import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { setUnauthorizedHandler } from '../api/httpClient';
import { tokenStorage } from '../api/tokenStorage';

const AuthContext = createContext(null);

// Where each role lands after signing in (or when it opens a page it can't use)
export const HOME_BY_ROLE = { patient: '/', doctor: '/doctor', admin: '/' };
export const homeFor = (role) => HOME_BY_ROLE[role] ?? '/';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => tokenStorage.get());
  const [user, setUser] = useState(null);
  // True while a stored token is being checked with /auth/me
  const [restoring, setRestoring] = useState(() => Boolean(tokenStorage.get()));

  const logout = useCallback(() => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
    setRestoring(false);
  }, []);

  // Any 401 outside login/register means the session is over
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Restore the session from a stored token once, on load
  useEffect(() => {
    if (!tokenStorage.get()) return undefined;
    let active = true;
    authService
      .me()
      .then((me) => active && setUser(me))
      .catch(() => active && logout())
      .finally(() => active && setRestoring(false));
    return () => {
      active = false;
    };
  }, [logout]);

  const startSession = useCallback(({ token: newToken, user: newUser }) => {
    tokenStorage.set(newToken);
    setToken(newToken);
    setUser(newUser);
    setRestoring(false);
    return newUser;
  }, []);

  const login = useCallback(
    async (email, password) => startSession(await authService.login(email, password)),
    [startSession],
  );
  const register = useCallback(async (data) => startSession(await authService.register(data)), [startSession]);

  const value = useMemo(
    () => ({ user, token, loading: restoring, login, register, logout }),
    [user, token, restoring, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
