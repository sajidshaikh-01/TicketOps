import { createApiClient } from '../lib/apiClient';

// Resolution order for each URL:
//   1. window.__TICKETOPS_CONFIG__ - injected by docker-entrypoint.sh at
//      container start (see apps/dashboard/docker/), reading real
//      environment variables. This is what lets one built image work
//      against any backend URL without rebuilding.
//   2. import.meta.env.VITE_* - baked in at build time, used for local
//      `npm run dev` where there's no container/entrypoint involved.
//   3. a sane localhost default, so the app never crashes from a missing config.
declare global {
  interface Window {
    __TICKETOPS_CONFIG__?: {
      EVENTS_API_URL?: string;
      ADMIN_API_URL?: string;
    };
  }
}

const runtimeConfig = typeof window !== 'undefined' ? window.__TICKETOPS_CONFIG__ : undefined;

const EVENTS_API_URL =
  runtimeConfig?.EVENTS_API_URL || import.meta.env.VITE_EVENTS_API_URL || 'http://localhost:4000/api';
const ADMIN_API_URL =
  runtimeConfig?.ADMIN_API_URL || import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4001/api';

export const eventsApi = createApiClient(EVENTS_API_URL, ADMIN_API_URL);
export const adminApi = createApiClient(ADMIN_API_URL, ADMIN_API_URL);
