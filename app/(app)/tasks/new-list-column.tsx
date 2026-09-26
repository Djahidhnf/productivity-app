'use client';

import { useState, type Ref } from 'react';
import { Input } from '@/app/components/ui/input';
import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';

export interface NewListColumnProps {
  onCreate: (name: string) => void;
  inputRef?: Ref<HTMLInputElement>;
}

export function NewListColumn({ onCreate, inputRef }: NewListColumnProps) {
  const [name, setName] = useState('');

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName('');
  }

  return (
    <section className="pw-list-col" data-list-col="new" style={{ width: 280 }}>
      <div className="pw-list-head">
        <h2 className="st-label">New list</h2>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        style={{ display: 'flex', gap: 6, alignItems: 'center' }}
      >
        <Input ref={inputRef} size="sm" placeholder="Name" aria-label="New list name" value={name} onChange={(event) => setName(event.target.value)} />
        <IconButton type="submit" label="Add list" variant="secondary" size="sm" style={{ height: 30, width: 30 }}>
          <Icon name="plus" size={15} />
        </IconButton>
      </form>
    </section>
  );
}
