import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Thin wrapper so the rest of the codebase depends on our own
// JwtAuthGuard token rather than directly on @nestjs/passport's AuthGuard('jwt').
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
