import * as z from 'zod/v4';

import { AVATAR_OPTIONS, getRegisterAvatarPickerOptions } from './avatar.js';

export const avatarPathSchema = z.enum(
  AVATAR_OPTIONS.map(option => option.path) as [string, ...string[]],
  { message: 'Invalid avatar' },
);

export const registerAvatarPathSchema = z.enum(
  getRegisterAvatarPickerOptions().map(option => option.path) as [
    string,
    ...string[],
  ],
  { message: 'Avatar not available at registration' },
);
