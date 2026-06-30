import { adminApi } from './clients';
import type { User } from '../types';

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  register: async (payload: { email: string; password: string; fullName: string; role?: 'CUSTOMER' | 'ORGANIZER' }) => {
    const { data } = await adminApi.post<AuthResponse>('/auth/register', payload);
    return data;
  },

  login: async (payload: { email: string; password: string }) => {
    const { data } = await adminApi.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  logout: async (refreshToken: string) => {
    await adminApi.post('/auth/logout', { refreshToken });
  },

  getMyProfile: async () => {
    const { data } = await adminApi.get<User>('/me');
    return data;
  },
};
