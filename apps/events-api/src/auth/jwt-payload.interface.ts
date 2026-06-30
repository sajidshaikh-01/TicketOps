// Shape of the JWT access token payload. Must stay in sync with how
// admin-api signs tokens (see admin-api/src/auth/auth.service.ts) since both
// services share the same JWT_ACCESS_SECRET.
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: 'ADMIN' | 'ORGANIZER' | 'CUSTOMER';
  iat?: number;
  exp?: number;
}
