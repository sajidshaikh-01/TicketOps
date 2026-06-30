import { create } from 'zustand';
import type { User } from '../types';
import { tokenStore } from '../lib/tokenStore';
import { authService } from '../api/auth.service';

interface AuthState {
  user: User | null;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: { email: string; password: string; fullName: string; role?: 'CUSTOMER' | 'ORGANIZER' }) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setInitializing: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitializing: true,

  login: async (email, password) => {
    const { user, accessToken, refreshToken } = await authService.login({ email, password });
    tokenStore.setAccessToken(accessToken);
    tokenStore.setRefreshToken(refreshToken);
    set({ user });
    return user;
  },

  register: async (payload) => {
    const { user, accessToken, refreshToken } = await authService.register(payload);
    tokenStore.setAccessToken(accessToken);
    tokenStore.setRefreshToken(refreshToken);
    set({ user });
    return user;
  },

  logout: async () => {
    const refreshToken = tokenStore.getRefreshToken();
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch {
        // Best-effort revoke; if it fails (e.g. network drop) we still clear
        // local state so the user is unambiguously logged out client-side.
      }
    }
    tokenStore.clear();
    set({ user: null });
  },

  setUser: (user) => set({ user }),
  setInitializing: (value) => set({ isInitializing: value }),
}));
