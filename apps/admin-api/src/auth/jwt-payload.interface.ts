// Shape of the JWT access token payload. Must stay in sync with
// events-api/src/auth/jwt-payload.interface.ts since both services share
// JWT_ACCESS_SECRET and events-api verifies tokens issued here.
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: 'ADMIN' | 'ORGANIZER' | 'CUSTOMER';
  iat?: number;
  exp?: number;
}
