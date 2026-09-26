'use client';

import type { Mood } from '@prisma/client';
import { PillToggle } from '@/app/components/ui/pill-toggle';

export interface JournalEditorProps {
  mood: Mood;
  text: string;
  onMoodChange: (mood: Mood) => void;
  onTextChange: (text: string) => void;
}

const MOOD_OPTIONS: { value: Mood; label: string }[] = [
  { value: 'GREAT', label: 'Great' },
  { value: 'GOOD', label: 'Good' },
  { value: 'OKAY', label: 'Okay' },
  { value: 'LOW', label: 'Low' },
  { value: 'ROUGH', label: 'Rough' },
];

export function JournalEditor({ mood, text, onMoodChange, onTextChange }: JournalEditorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
        <PillToggle ariaLabel="Mood" value={mood} onChange={onMoodChange} options={MOOD_OPTIONS} />
      </div>
      <div className="pw-journal-card">
        <textarea
          rows={14}
          placeholder="Write about your day…"
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            resize: 'vertical',
            border: 'none',
            outline: 'none',
            padding: 0,
            background: 'transparent',
            color: 'var(--fg-1)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-md)',
            lineHeight: 1.6,
          }}
        />
      </div>
    </div>
  );
}
