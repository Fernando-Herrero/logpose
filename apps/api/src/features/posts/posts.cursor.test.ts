import { postCursorSchema } from '@logpose/contracts/common/post.schemas';
import { ObjectId, type WithId } from 'mongodb';
import { describe, expect, it } from 'vitest';

import {
  decodePostCursor,
  encodePostCursor,
  type PostDocument,
} from './posts.mappers.js';

const post = {
  _id: new ObjectId(),
  createdAt: new Date('2026-11-16T10:00:00.000Z'),
} as WithId<PostDocument>;

describe('cursor de posts', () => {
  it('el contrato acepta el cursor que emite la API', () => {
    expect(postCursorSchema.safeParse(encodePostCursor(post)).success).toBe(
      true,
    );
  });

  it.each([
    'abc',
    '2026-13-40T10:00:00.000Z|0123456789abcdef01234567',
    '2026-11-16T10:00:00.000Z|no-es-un-id',
  ])('el contrato rechaza %s', cursor => {
    expect(postCursorSchema.safeParse(cursor).success).toBe(false);
  });

  it('decodificar devuelve la fecha y el id del post', () => {
    expect(decodePostCursor(encodePostCursor(post))).toEqual({
      createdAt: post.createdAt,
      id: post._id,
    });
  });
});
