'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PageHeader } from '@/app/components/shell/page-header';
import { Icon } from '@/app/components/icons';
import { Input } from '@/app/components/ui/input';
import { relativeTime } from '@/app/lib/date-format';
import { NoteComposer } from './note-composer';
import { NoteCard } from './note-card';
import { NoteDialog } from './note-dialog';
import { sortNotes, filterNotes } from './notes-views';
import { createNote, updateNote, setNotePinned, deleteNote } from './actions';
import type { NoteDTO } from '@/app/lib/note-dto';

const SAVE_DEBOUNCE_MS = 600;

export interface NotesBoardProps {
  initialNotes: NoteDTO[];
}

export function NotesBoard({ initialNotes }: NotesBoardProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  const pendingRef = useRef<{ id: string; text: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    updateNote(pending.id, pending.text).then(
      () => setSaveFailed(false),
      () => {
        // Keep the failed save so the next edit or closing the dialog retries it.
        if (!pendingRef.current) pendingRef.current = pending;
        setSaveFailed(true);
      }
    );
  }, []);

  useEffect(() => {
    return () => {
      flushPendingSave();
    };
  }, [flushPendingSave]);

  function scheduleSave(id: string, text: string) {
    pendingRef.current = { id, text };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flushPendingSave();
    }, SAVE_DEBOUNCE_MS);
  }

  function cancelPendingSave() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
  }

  async function handleCreate(text: string): Promise<boolean> {
    try {
      const note = await createNote(text);
      setNotes((prev) => [note, ...prev]);
      return true;
    } catch {
      window.alert('Could not save the note. Please try again.');
      return false;
    }
  }

  async function handleTogglePin(note: NoteDTO) {
    const pinned = !note.pinned;
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, pinned } : n)));
    try {
      await setNotePinned(note.id, pinned);
    } catch {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, pinned: note.pinned } : n)));
      window.alert('Could not update the note. Please try again.');
    }
  }

  async function handleDelete(note: NoteDTO) {
    if (pendingRef.current?.id === note.id) cancelPendingSave();
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    setEditingId((id) => (id === note.id ? null : id));
    try {
      await deleteNote(note.id);
    } catch {
      setNotes((prev) => [note, ...prev]);
      window.alert('Could not delete the note. Please try again.');
    }
  }

  function handleEditText(text: string) {
    if (!editingId) return;
    const updatedAt = new Date().toISOString();
    setNotes((prev) => prev.map((n) => (n.id === editingId ? { ...n, text, updatedAt } : n)));
    scheduleSave(editingId, text);
  }

  function handleClose() {
    const note = notes.find((n) => n.id === editingId);
    setEditingId(null);
    setSaveFailed(false);
    if (!note) return;
    if (!note.text.trim()) {
      void handleDelete(note);
      return;
    }
    flushPendingSave();
  }

  const now = new Date();
  const visible = filterNotes(sortNotes(notes), query);
  const editing = notes.find((n) => n.id === editingId) ?? null;
  const description = saveFailed ? "Couldn't save" : editing ? `Edited ${relativeTime(editing.updatedAt, now)}` : '';

  return (
    <div style={{ paddingBottom: 48 }}>
      <PageHeader
        title="Notes"
        meta={String(notes.length)}
        actions={
          <div className="pw-note-search">
            <Icon name="search" size={15} className="pw-note-search-icon" />
            <Input
              size="sm"
              type="search"
              aria-label="Search notes"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
        }
      />
      <div className="pw-notes">
        <NoteComposer onSave={handleCreate} />
        {visible.length > 0 ? (
          <div className="pw-note-grid">
            {visible.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                now={now}
                onOpen={() => setEditingId(note.id)}
                onTogglePin={() => void handleTogglePin(note)}
                onDelete={() => void handleDelete(note)}
              />
            ))}
          </div>
        ) : (
          <p className="st-empty">{query.trim() ? 'No matches.' : 'No notes yet.'}</p>
        )}
      </div>
      <NoteDialog
        note={editing}
        description={description}
        onTextChange={handleEditText}
        onDelete={() => editing && void handleDelete(editing)}
        onClose={handleClose}
      />
    </div>
  );
}
