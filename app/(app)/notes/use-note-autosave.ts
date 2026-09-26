'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Text typed into a note that the server may not have yet. */
export interface UnsavedEdit {
  text: string;
  /** Increases with every edit, so a late result can tell whether it is still the latest. */
  version: number;
  /** The version currently being sent, if any (avoids re-sending a save that is in flight). */
  sending?: number;
}

/**
 * Debounced per-note autosave. Every note with unsaved text is flushed together
 * (after the debounce, or on demand), so a failed save stays queued and is retried
 * by the next flush no matter which note is being edited.
 */
export function useNoteAutosave(save: (id: string, text: string) => Promise<unknown>, delayMs: number) {
  const unsavedRef = useRef(new Map<string, UnsavedEdit>());
  const versionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(() => new Set());

  const markFailed = useCallback((id: string, failed: boolean) => {
    setFailedIds((prev) => {
      if (prev.has(id) === failed) return prev;
      const next = new Set(prev);
      if (failed) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    for (const [id, edit] of unsavedRef.current) {
      if (edit.sending === edit.version) continue;
      const { version } = edit;
      edit.sending = version;
      save(id, edit.text).then(
        () => {
          // A newer edit stays queued; its own result decides the error mark.
          if (unsavedRef.current.get(id)?.version !== version) return;
          unsavedRef.current.delete(id);
          markFailed(id, false);
        },
        () => {
          // Only the latest edit's result matters; a deleted note's result is ignored.
          const latest = unsavedRef.current.get(id);
          if (latest?.version !== version) return;
          latest.sending = undefined;
          markFailed(id, true);
        }
      );
    }
  }, [save, markFailed]);

  useEffect(() => flush, [flush]);

  function schedule(id: string, text: string) {
    unsavedRef.current.set(id, { text, version: ++versionRef.current });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, delayMs);
  }

  /** Forgets a note's unsaved text (it is being deleted); returns it so a failed delete can restore it. */
  function discard(id: string): UnsavedEdit | undefined {
    const edit = unsavedRef.current.get(id);
    unsavedRef.current.delete(id);
    markFailed(id, false);
    return edit;
  }

  /** Re-queues text discarded by `discard`, to be sent by the next flush. */
  function restore(id: string, edit: UnsavedEdit | undefined) {
    if (!edit || unsavedRef.current.has(id)) return;
    unsavedRef.current.set(id, { text: edit.text, version: ++versionRef.current });
  }

  return { schedule, flush, discard, restore, failedIds };
}
