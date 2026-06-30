import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { tokenStore } from '../lib/tokenStore';
import { adminApi } from '../api/clients';
import { authService } from '../api/auth.service';

// On a fresh page load, the in-memory access token is always empty (that's
// the point of keeping it out of persistent storage), but a refresh token
// may still be sitting in sessionStorage from earlier in this tab's life.
// This hook spends one /auth/refresh call up front to silently restore the
// session before rendering anything that depends on auth state.
export function useSessionRestore() {
  const setUser = useAuthStore((s) => s.setUser);
  const setInitializing = useAuthStore((s) => s.setInitializing);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const refreshToken = tokenStore.getRefreshToken();
      if (!refreshToken) {
        setInitializing(false);
        return;
      }

      try {
        const { data } = await adminApi.post('/auth/refresh', { refreshToken });
        tokenStore.setAccessToken(data.accessToken);
        tokenStore.setRefreshToken(data.refreshToken);

        const profile = await authService.getMyProfile();
        if (!cancelled) setUser(profile);
      } catch {
        tokenStore.clear();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, [setUser, setInitializing]);
}
