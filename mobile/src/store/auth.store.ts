import { create } from 'zustand';
import type { AuthResponse, User } from '@/shared/types/api';
import { tokenStorage } from '@/shared/storage/secure-store';
import { setUnauthorizedHandler } from '@/shared/api/client';
import { connectSocket, disconnectSocket } from '@/shared/realtime/socket';

interface AuthState {
  user: User | null;
  token: string | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  bootstrap: () => Promise<void>;
  signIn: (auth: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
}

/**
 * Auth = the one piece of global client state. Everything else (server data)
 * lives in React Query. On sign-in we persist the token and open the socket.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  status: 'loading',

  bootstrap: async () => {
    const token = await tokenStorage.get();
    if (token) {
      connectSocket(token);
      set({ token, status: 'authenticated' });
    } else {
      set({ status: 'unauthenticated' });
    }
  },

  signIn: async (auth) => {
    await tokenStorage.set(auth.token);
    connectSocket(auth.token);
    set({ user: auth.user, token: auth.token, status: 'authenticated' });
  },

  signOut: async () => {
    await tokenStorage.clear();
    disconnectSocket();
    set({ user: null, token: null, status: 'unauthenticated' });
  },

  setUser: (user) => set({ user }),
}));

// A 401 from any request logs the user out (token expired/invalid).
setUnauthorizedHandler(() => {
  void useAuthStore.getState().signOut();
});
