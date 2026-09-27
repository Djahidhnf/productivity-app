'use client';

import { Icon } from '@/app/components/icons';
import { IconButton } from '@/app/components/ui/icon-button';
import { relativeTime } from '@/app/lib/date-format';
import type { NoteDTO } from '@/app/lib/note-dto';

export interface NoteCardProps {
  note: NoteDTO;
  now: Date;
  onOpen: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

export function NoteCard({ note, now, onOpen, onTogglePin, onDelete }: NoteCardProps) {
  return (
    <div className="st-row pw-note-row" data-pinned={note.pinned || undefined}>
      <button type="button" className="pw-note-row-body" onClick={onOpen}>
        <span className="st-row-text">{note.text}</span>
      </button>
      {/* Server and browser clocks differ, so the relative time may too. */}
      <span className="st-due" suppressHydrationWarning>
        {relativeTime(note.updatedAt, now)}
      </span>
      <span className="pw-note-row-actions">
        <IconButton label={note.pinned ? 'Unpin' : 'Pin'} size="sm" aria-pressed={note.pinned} onClick={onTogglePin} className="pw-note-pin">
          <Icon name="pin" size={15} />
        </IconButton>
        <IconButton label="Delete" size="sm" onClick={onDelete}>
          <Icon name="trash" size={15} />
        </IconButton>
      </span>
    </div>
  );
}
