// Token storage. We deliberately keep the access token in memory only and
// persist the refresh token in sessionStorage (not localStorage): this
// limits the window an XSS payload has to exfiltrate a long-lived token,
// and clears automatically when the tab closes. Refreshing the page costs
// one silent /auth/refresh call, which is a reasonable trade for the
// reduced attack surface.

const REFRESH_TOKEN_KEY = 'ticketops_refresh_token';

let accessToken: string | null = null;

export const tokenStore = {
  getAccessToken: () => accessToken,
  setAccessToken: (token: string | null) => {
    accessToken = token;
  },
  getRefreshToken: () => sessionStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string | null) => {
    if (token) {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },
  clear: () => {
    accessToken = null;
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
