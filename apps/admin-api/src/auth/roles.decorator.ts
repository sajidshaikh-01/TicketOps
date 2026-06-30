import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Usage: @Roles('ADMIN', 'ORGANIZER') above a controller method, combined
// with @UseGuards(JwtAuthGuard, RolesGuard).
export const Roles = (...roles: Array<'ADMIN' | 'ORGANIZER' | 'CUSTOMER'>) =>
  SetMetadata(ROLES_KEY, roles);
