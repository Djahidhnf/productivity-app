'use client';

import { Dialog } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/icons';
import type { NoteDTO } from '@/app/lib/note-dto';

export interface NoteDialogProps {
  note: NoteDTO | null;
  description: string;
  onTextChange: (text: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function NoteDialog({ note, description, onTextChange, onDelete, onClose }: NoteDialogProps) {
  return (
    <Dialog open={note !== null} onClose={onClose} title="Note" description={description} width={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <textarea
          aria-label="Note text"
          className="pw-note-editor"
          rows={10}
          autoFocus
          value={note?.text ?? ''}
          onChange={(e) => onTextChange(e.target.value)}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Icon name="trash" size={15} />
            Delete
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
