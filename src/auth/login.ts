import { authClient } from './authClient.ts';

export function bindLoginActions() {
  const client = authClient();
  return {
    login(username) {
      if (!username?.trim()) return null;
      return client.signIn(username.trim());
    },
    logout() {
      client.signOut();
    },
    session() {
      return client.getSession();
    }
  };
}
