/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach, beforeAll, vi } from 'vitest';

const cookieStore = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined),
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import { prisma } from '@/app/lib/prisma';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { getNotes } from './queries';

describe('getNotes', () => {
  const created: string[] = [];

  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  afterEach(async () => {
    await prisma.note.deleteMany({ where: { id: { in: created.splice(0) } } });
  });

  test('returns notes serialized with ISO timestamps', async () => {
    const note = await prisma.note.create({ data: { userId: 'owner', text: 'Query test note', pinned: true } });
    created.push(note.id);

    const result = await getNotes();
    const found = result.find((n) => n.id === note.id);
    expect(found).toEqual({
      id: note.id,
      text: 'Query test note',
      pinned: true,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    });
  });

  test('redirects to /login without a session', async () => {
    cookieStore.clear();
    await expect(getNotes()).rejects.toThrow('REDIRECT:/login');
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });
});
