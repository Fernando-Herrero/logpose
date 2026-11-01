import { commonErrors } from '@logpose/contracts/common/errors';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ORPCError } from '@orpc/server';
import type { Request, Response } from 'express';

import type { Viewer } from './access.js';
import { AuthSessionService } from './auth-session.service.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authSession: AuthSessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { viewer: Viewer }>();

    const user = await this.authSession.resolve(
      request,
      http.getResponse<Response>(),
    );
    request.viewer = user ? { kind: 'user', ...user } : { kind: 'anonymous' };

    if (isPublic || request.viewer.kind === 'user') {
      return true;
    }

    // Fuera de oRPC no hay `errors`: se crea el definido a mano (lo declara el contrato raíz).
    throw new ORPCError('UNAUTHORIZED', {
      defined: true,
      ...commonErrors.UNAUTHORIZED,
    });
  }
}
