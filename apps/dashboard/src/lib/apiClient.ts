import axios, { AxiosInstance, AxiosError } from 'axios';
import { tokenStore } from './tokenStore';

// Both events-api and admin-api accept the same access token, but only
// admin-api can mint a new one via /auth/refresh. We keep a single shared
// "refresh in flight" promise so that if several requests 401 at the same
// moment (e.g. a burst of parallel queries right as the token expires), we
// only call /auth/refresh once and let every pending request wait on it.
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(adminApiBaseUrl: string): Promise<string | null> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await axios.post(`${adminApiBaseUrl}/auth/refresh`, { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = response.data;
    tokenStore.setAccessToken(accessToken);
    tokenStore.setRefreshToken(newRefreshToken);
    return accessToken;
  } catch {
    tokenStore.clear();
    return null;
  }
}

export function createApiClient(baseURL: string, adminApiBaseUrl: string): AxiosInstance {
  const client = axios.create({ baseURL, timeout: 15_000 });

  client.interceptors.request.use((config) => {
    const token = tokenStore.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as (typeof error.config) & { _retried?: boolean };

      if (error.response?.status === 401 && originalRequest && !originalRequest._retried) {
        originalRequest._retried = true;

        if (!refreshPromise) {
          refreshPromise = performRefresh(adminApiBaseUrl).finally(() => {
            refreshPromise = null;
          });
        }

        const newToken = await refreshPromise;
        if (newToken) {
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return client(originalRequest);
        }
      }

      return Promise.reject(error);
    },
  );

  return client;
}
