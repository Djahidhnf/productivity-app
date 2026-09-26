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
    <div className="pw-note-card">
      <button type="button" className="pw-note-card-body" onClick={onOpen}>
        <span className="pw-note-card-text">{note.text}</span>
      </button>
      <div className="pw-note-card-foot">
        {/* Server and browser clocks differ, so the relative time may too. */}
        <span className="st-due" style={{ flex: 1 }} suppressHydrationWarning>
          {relativeTime(note.updatedAt, now)}
        </span>
        <IconButton label={note.pinned ? 'Unpin' : 'Pin'} size="sm" aria-pressed={note.pinned} onClick={onTogglePin}>
          <Icon name="pin" size={15} />
        </IconButton>
        <IconButton label="Delete" size="sm" onClick={onDelete}>
          <Icon name="trash" size={15} />
        </IconButton>
      </div>
    </div>
  );
}
