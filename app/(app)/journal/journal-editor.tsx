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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <PillToggle ariaLabel="Mood" value={mood} onChange={onMoodChange} options={MOOD_OPTIONS} />
      <textarea
        rows={14}
        placeholder="Write about your day…"
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          resize: 'vertical',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-strong)',
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          lineHeight: 'var(--leading-relaxed)',
          outline: 'none',
        }}
      />
    </div>
  );
}
