const AUTH_KEY = 'arkham-auth-session';

export function authClient() {
  return {
    getSession() {
      try {
        return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
      } catch {
        return null;
      }
    },
    signIn(username) {
      const session = { username, loggedInAt: new Date().toISOString() };
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
      return session;
    },
    signOut() {
      localStorage.removeItem(AUTH_KEY);
    }
  };
}
