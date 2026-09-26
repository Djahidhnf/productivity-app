'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';

export interface NoteComposerProps {
  /** Resolves true when the note was saved; the box clears only then. */
  onSave: (text: string) => Promise<boolean>;
}

export function NoteComposer({ onSave }: NoteComposerProps) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    const ok = await onSave(text);
    setSaving(false);
    if (ok) setDraft('');
  }

  return (
    <div className="pw-note-compose">
      <textarea
        aria-label="New note"
        rows={3}
        placeholder="What's on your mind?"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void save();
          }
        }}
      />
      <div className="pw-note-compose-foot">
        <span className="st-eyebrow">⌘ ↵</span>
        <Button size="sm" onClick={() => void save()} disabled={saving}>
          Save
        </Button>
      </div>
    </div>
  );
}
