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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { prisma } from '@/app/lib/prisma';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { revalidatePath } from 'next/cache';
import { createNote, updateNote, setNotePinned, deleteNote } from './actions';

describe('note actions', () => {
  const created: string[] = [];

  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  afterEach(async () => {
    await prisma.note.deleteMany({ where: { id: { in: created.splice(0) } } });
    vi.mocked(revalidatePath).mockClear();
  });

  test('createNote trims the text, stores an unpinned note and revalidates /notes', async () => {
    const note = await createNote('  Buy stamps  ');
    created.push(note.id);
    expect(note.text).toBe('Buy stamps');
    expect(note.pinned).toBe(false);
    const row = await prisma.note.findUnique({ where: { id: note.id } });
    expect(row?.text).toBe('Buy stamps');
    expect(revalidatePath).toHaveBeenCalledWith('/notes');
  });

  test('createNote rejects blank text', async () => {
    await expect(createNote('   ')).rejects.toThrow('Note text is required');
  });

  test('updateNote saves the text and bumps updatedAt', async () => {
    const note = await createNote('Before');
    created.push(note.id);
    const updated = await updateNote(note.id, 'After\nsecond line');
    expect(updated.text).toBe('After\nsecond line');
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(note.updatedAt).getTime());
  });

  test('setNotePinned toggles pinned without changing updatedAt', async () => {
    const note = await createNote('Pin me');
    created.push(note.id);
    const pinned = await setNotePinned(note.id, true);
    expect(pinned.pinned).toBe(true);
    expect(pinned.updatedAt).toBe(note.updatedAt);
    const unpinned = await setNotePinned(note.id, false);
    expect(unpinned.pinned).toBe(false);
  });

  test('deleteNote removes the row', async () => {
    const note = await createNote('Delete me');
    await deleteNote(note.id);
    expect(await prisma.note.findUnique({ where: { id: note.id } })).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith('/notes');
  });
});
