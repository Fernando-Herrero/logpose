import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';

import { UsersPersistence } from '../users/users.persistence.js';
import type { UserViewer } from './access.js';
import {
  clearSessionCookie,
  getSessionTokenFromCookieHeader,
  SESSION_MAX_AGE_MS,
  setSessionCookie,
} from './auth.cookies.js';
import { SessionsPersistence } from './sessions.persistence.js';

/** Renovar como mucho una vez al día evita escribir en Mongo en cada petición. */
const RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

const expiresFromNow = () => new Date(Date.now() + SESSION_MAX_AGE_MS);

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly sessions: SessionsPersistence,
    private readonly usersPersistence: UsersPersistence,
  ) {}

  async open(userId: string, res: Response) {
    const token = randomBytes(32).toString('base64url');

    await this.sessions.insert(hashToken(token), userId, expiresFromNow());
    setSessionCookie(res, token);
  }

  /**
   * Usuario de la cookie, con rol y estado leídos de Mongo en cada petición (ADR 0004).
   * Si la cuenta está desactivada o borrada, revoca la sesión en vez de renovarla.
   */
  async resolve(
    req: Request,
    res: Response,
  ): Promise<Omit<UserViewer, 'kind'> | undefined> {
    const token = getSessionTokenFromCookieHeader(req.headers.cookie);
    if (!token) {
      return undefined;
    }

    const id = hashToken(token);
    const session = await this.sessions.findActive(id);
    if (!session) {
      return undefined;
    }

    const userId = session.userId.toString();
    const access = await this.usersPersistence.findAccessById(userId);
    if (!access?.isActive) {
      await this.sessions.delete(id);
      clearSessionCookie(res);
      return undefined;
    }

    if (Date.now() - session.lastSeenAt.getTime() > RENEW_AFTER_MS) {
      await this.sessions.renew(id, expiresFromNow());
      setSessionCookie(res, token);
    }

    return { id: userId, role: access.role };
  }

  async close(req: Request, res: Response) {
    const token = getSessionTokenFromCookieHeader(req.headers.cookie);
    if (token) {
      await this.sessions.delete(hashToken(token));
    }
    clearSessionCookie(res);
  }

  /** Cierra todas las sesiones del usuario y abre una nueva en esta respuesta. */
  async rotate(userId: string, res: Response) {
    await this.sessions.deleteByUser(userId);
    await this.open(userId, res);
  }
}
