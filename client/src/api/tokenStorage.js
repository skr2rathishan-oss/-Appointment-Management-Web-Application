// localStorage can throw (private mode, blocked storage). Every access is guarded, and when
// storage is unavailable an in-memory copy keeps the session working for this page load.
const KEY = 'medibook.token';
let memoryToken = null;

export const tokenStorage = {
  get() {
    try {
      // setItem can fail on its own (e.g. quota full), so fall back to the memory copy
      return localStorage.getItem(KEY) ?? memoryToken;
    } catch {
      return memoryToken;
    }
  },
  set(token) {
    try {
      localStorage.setItem(KEY, token);
      memoryToken = null;
    } catch {
      // Kept in memory only: the session ends when the page is reloaded
      memoryToken = token;
    }
  },
  clear() {
    memoryToken = null;
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Nothing stored
    }
  },
};
