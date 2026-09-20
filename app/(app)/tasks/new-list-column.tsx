'use client';

import { useState } from 'react';
import { Input } from '@/app/components/ui/input';
import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';

export interface NewListColumnProps {
  onCreate: (name: string) => void;
}

export function NewListColumn({ onCreate }: NewListColumnProps) {
  const [name, setName] = useState('');

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName('');
  }

  return (
    <div className="pw-list-col" style={{ paddingTop: 2 }}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        style={{ display: 'flex', gap: 6 }}
      >
        <Input size="sm" placeholder="New list…" value={name} onChange={(event) => setName(event.target.value)} />
        <IconButton type="submit" label="Add list" variant="secondary" size="sm">
          <Icon name="plus" size={15} />
        </IconButton>
      </form>
    </div>
  );
}
