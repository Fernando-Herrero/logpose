import { EventEmitter } from 'node:events';

import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Viewer } from '../../features/auth/access.js';
import { requestLogMiddleware } from './request-log.middleware.js';

/** Corre el middleware, pone el viewer como haría `SessionGuard` y cierra la respuesta. */
function logFor(viewer: Viewer) {
  const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  const req = { method: 'GET', originalUrl: '/rpc/posts/list' } as Request & {
    viewer?: Viewer;
  };
  const res = Object.assign(new EventEmitter(), {
    statusCode: 200,
    setHeader: vi.fn(),
  });

  requestLogMiddleware(
    req,
    res as unknown as Response,
    vi.fn() as NextFunction,
  );
  req.viewer = viewer;
  res.emit('finish');

  return JSON.parse(String(log.mock.calls[0]?.[0])) as { user_id: unknown };
}

describe('requestLogMiddleware', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registra el id del usuario con sesión', () => {
    expect(logFor({ kind: 'user', id: 'u1', role: 'user' }).user_id).toBe('u1');
  });

  it('registra null para un visitante sin sesión', () => {
    expect(logFor({ kind: 'anonymous' }).user_id).toBeNull();
  });
});
