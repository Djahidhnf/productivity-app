import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNoteAutosave } from './use-note-autosave';

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushPromises() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
}

describe('useNoteAutosave', () => {
  const save = vi.fn<(id: string, text: string) => Promise<unknown>>();

  beforeEach(() => {
    save.mockReset();
    save.mockResolvedValue(undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('debounces and sends only the latest text per note', () => {
    const { result } = renderHook(() => useNoteAutosave(save, 600));
    act(() => {
      result.current.schedule('a', 'one');
      result.current.schedule('a', 'two');
      result.current.schedule('b', 'bee');
    });
    expect(save).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(save.mock.calls).toEqual([
      ['a', 'two'],
      ['b', 'bee'],
    ]);
  });

  test('flush does not re-send a save that is still in flight', () => {
    save.mockReturnValue(deferred().promise);
    const { result } = renderHook(() => useNoteAutosave(save, 600));
    act(() => {
      result.current.schedule('a', 'one');
      result.current.flush();
      result.current.flush();
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  test('a failure marks the note and keeps its text for the next flush; success clears the mark', async () => {
    save.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useNoteAutosave(save, 600));
    act(() => {
      result.current.schedule('a', 'one');
      result.current.flush();
    });
    await flushPromises();
    expect(result.current.failedIds.has('a')).toBe(true);
    act(() => result.current.flush());
    expect(save).toHaveBeenLastCalledWith('a', 'one');
    await flushPromises();
    expect(result.current.failedIds.has('a')).toBe(false);
    act(() => result.current.flush());
    expect(save).toHaveBeenCalledTimes(2);
  });

  test('an older result never replaces or clears a newer edit', async () => {
    const first = deferred();
    save.mockReturnValueOnce(first.promise);
    const { result } = renderHook(() => useNoteAutosave(save, 600));
    act(() => {
      result.current.schedule('a', 'one');
      result.current.flush();
      result.current.schedule('a', 'two');
    });
    first.reject(new Error('boom'));
    await flushPromises();
    expect(result.current.failedIds.has('a')).toBe(false);
    act(() => result.current.flush());
    expect(save).toHaveBeenLastCalledWith('a', 'two');
    await flushPromises();
    act(() => result.current.flush());
    expect(save).toHaveBeenCalledTimes(2);
  });

  test('discard drops a note; its late failure is ignored; restore re-queues the text', async () => {
    const first = deferred();
    save.mockReturnValueOnce(first.promise);
    const { result } = renderHook(() => useNoteAutosave(save, 600));
    act(() => {
      result.current.schedule('a', 'one');
      result.current.flush();
    });
    let discarded: ReturnType<typeof result.current.discard>;
    act(() => {
      discarded = result.current.discard('a');
    });
    first.reject(new Error('boom'));
    await flushPromises();
    expect(result.current.failedIds.has('a')).toBe(false);
    act(() => result.current.flush());
    expect(save).toHaveBeenCalledTimes(1);
    act(() => result.current.restore('a', discarded));
    act(() => result.current.flush());
    expect(save).toHaveBeenLastCalledWith('a', 'one');
  });

  test('unmount flushes unsaved text', () => {
    const { result, unmount } = renderHook(() => useNoteAutosave(save, 600));
    act(() => result.current.schedule('a', 'one'));
    unmount();
    expect(save).toHaveBeenCalledWith('a', 'one');
  });
});
