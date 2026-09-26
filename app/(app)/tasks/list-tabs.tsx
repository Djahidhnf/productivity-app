'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Icon } from '@/app/components/icons';
import type { TaskListDTO } from './queries';

export interface ListTabsProps {
  lists: TaskListDTO[];
  activeId: string | null;
  onSelect: (listId: string) => void;
  onSelectNew: () => void;
  /** Called once a chip is dropped at a new position (final index in the list order). */
  onReorder: (listId: string, toIndex: number) => void;
}

export const TAB_LONG_PRESS_MS = 300;
const TOUCH_MOVE_CANCEL_PX = 8;
const MOUSE_DRAG_START_PX = 4;

interface Press {
  id: string;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  timer: number | null;
}

interface Drag {
  id: string;
  pointerType: string;
  fromIndex: number;
  overIndex: number;
  /** Horizontal centers of the other chips, in order, measured when the drag began. */
  centers: number[];
}

/** Final index for the dragged chip given the pointer's x position. */
export function tabIndexAt(centers: number[], x: number): number {
  return centers.filter((center) => center < x).length;
}

/**
 * Phone-only strip of list chips above the swipeable Tasks board. Tap a chip
 * to jump to that list; long-press (or mouse-drag) a chip and slide it
 * sideways to reorder the lists.
 */
export function ListTabs({ lists, activeId, onSelect, onSelectNew, onReorder }: ListTabsProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const press = useRef<Press | null>(null);
  const swallowClick = useRef(false);
  const [drag, setDragState] = useState<Drag | null>(null);
  // Mirror of `drag` for the document listeners and the drop handler.
  const dragRef = useRef<Drag | null>(null);

  function setDrag(next: Drag | null) {
    dragRef.current = next;
    setDragState(next);
  }

  function clearPress() {
    if (press.current?.timer != null) window.clearTimeout(press.current.timer);
    press.current = null;
  }

  useEffect(() => () => clearPress(), []);

  // Keep the active chip visible as the board is swiped.
  useEffect(() => {
    if (!activeId || drag) return;
    const chip = stripRef.current?.querySelector<HTMLElement>(`[data-list-id="${CSS.escape(activeId)}"]`);
    chip?.scrollIntoView?.({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [activeId, drag]);

  function begin(p: Press) {
    const strip = stripRef.current;
    if (!strip) return;
    const fromIndex = lists.findIndex((l) => l.id === p.id);
    if (fromIndex === -1) return;
    const centers = lists
      .filter((l) => l.id !== p.id)
      .map((l) => {
        const rect = strip.querySelector<HTMLElement>(`[data-list-id="${CSS.escape(l.id)}"]`)?.getBoundingClientRect();
        return rect ? rect.left + rect.width / 2 : 0;
      });
    if (p.pointerType === 'touch') navigator.vibrate?.(10);
    setDrag({ id: p.id, pointerType: p.pointerType, fromIndex, overIndex: fromIndex, centers });
  }

  function finish(commit: boolean) {
    clearPress();
    const current = dragRef.current;
    setDrag(null);
    if (current && commit && current.overIndex !== current.fromIndex) onReorder(current.id, current.overIndex);
    swallowClick.current = true;
    window.setTimeout(() => {
      swallowClick.current = false;
    }, 50);
  }

  // While dragging, follow the pointer with document-level listeners: the
  // native touchmove listener is non-passive so it can stop the strip (and
  // page) from scrolling under the finger.
  useEffect(() => {
    if (!drag) return;
    function moveTo(x: number) {
      const current = dragRef.current;
      if (!current) return;
      const overIndex = tabIndexAt(current.centers, x);
      if (overIndex !== current.overIndex) setDrag({ ...current, overIndex });
    }
    function onTouchMove(event: TouchEvent) {
      event.preventDefault();
      const touch = event.touches[0];
      if (touch) moveTo(touch.clientX);
    }
    function onPointerMove(event: PointerEvent) {
      if (event.pointerType !== 'touch') moveTo(event.clientX);
    }
    const onEnd = () => finish(true);
    const onCancel = () => finish(false);
    const touch = drag.pointerType === 'touch';
    if (touch) {
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onEnd);
      document.addEventListener('touchcancel', onCancel);
    } else {
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onEnd);
      document.addEventListener('pointercancel', onCancel);
    }
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onCancel);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onEnd);
      document.removeEventListener('pointercancel', onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-subscribe only when a drag starts or ends
  }, [drag?.id]);

  function onChipPointerDown(id: string, event: ReactPointerEvent<HTMLButtonElement>) {
    if (drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
    clearPress();
    const p: Press = {
      id,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      timer: null,
    };
    if (event.pointerType === 'touch') {
      p.timer = window.setTimeout(() => {
        if (press.current !== p) return;
        p.timer = null;
        begin(p);
      }, TAB_LONG_PRESS_MS);
    }
    press.current = p;
  }

  function onChipPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const p = press.current;
    if (!p || drag || event.pointerId !== p.pointerId) return;
    const distance = Math.hypot(event.clientX - p.startX, event.clientY - p.startY);
    if (p.pointerType === 'touch') {
      // Moving before the long-press fires is a normal scroll of the strip.
      if (distance > TOUCH_MOVE_CANCEL_PX) clearPress();
      return;
    }
    if (distance >= MOUSE_DRAG_START_PX) {
      p.timer = null;
      begin(p);
    }
  }

  function onChipPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag && press.current?.pointerId === event.pointerId) clearPress();
  }

  let ordered = lists;
  if (drag) {
    const dragged = lists[drag.fromIndex];
    ordered = lists.filter((l) => l.id !== drag.id);
    ordered.splice(drag.overIndex, 0, dragged);
  }

  return (
    <div ref={stripRef} className="pw-listtabs" role="tablist" aria-label="Task lists" data-dragging={drag ? 'true' : undefined}>
      {ordered.map((list) => {
        const active = list.id === activeId;
        const lifted = drag?.id === list.id;
        return (
          <button
            key={list.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-list-id={list.id}
            data-lifted={lifted || undefined}
            className="pw-listtab"
            onPointerDown={(event) => onChipPointerDown(list.id, event)}
            onPointerMove={onChipPointerMove}
            onPointerUp={onChipPointerUp}
            onPointerCancel={() => !drag && clearPress()}
            onContextMenu={(event) => event.preventDefault()}
            onClick={() => {
              if (swallowClick.current) return;
              onSelect(list.id);
            }}
          >
            <span className="pw-listtab-name">{list.name}</span>
            <span className="pw-listtab-count">{list.tasks.length}</span>
          </button>
        );
      })}
      <button type="button" className="pw-listtab" data-new="true" aria-label="New list" onClick={onSelectNew}>
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}
