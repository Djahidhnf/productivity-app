'use client';

import { useEffect, useRef, useState, type RefObject, type TouchEvent as ReactTouchEvent } from 'react';
import type { TaskDTO } from './queries';

export const TASK_LONG_PRESS_MS = 350;
const TOUCH_MOVE_CANCEL_PX = 8;
const AUTOSCROLL_EDGE_PX = 56;
const AUTOSCROLL_MAX_STEP = 12;

/** Where a touch-dragged task would land: a group, before a task in it (null = at the end). */
export interface TouchDropSlot {
  groupId: string;
  beforeId: string | null;
}

/** What a board tells the gestures about its layout. */
export interface TouchTaskDragOptions {
  /** The `data-*` attribute (as a dataset key) that marks a drop group's container, e.g. `listCol` for `data-list-col`. */
  groupAttr: string;
  /** The open tasks of a group, in display order. */
  tasksIn: (groupId: string) => TaskDTO[];
  /** The list name shown in the preview. */
  listNameOf: (task: TaskDTO) => string;
  /** The scrollable element around a group's tasks, auto-scrolled during a drag. */
  scrollSelector: string;
  onMove: (taskId: string, groupId: string, beforeId: string | null) => void;
}

export interface TaskPreviewState {
  task: TaskDTO;
  listName: string;
  /** The pressed card's box, for placing the preview next to it. */
  anchor: { top: number; bottom: number };
}

interface Press {
  task: TaskDTO;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  el: HTMLElement;
  /** False: a long press only previews the task; moving never drags it. */
  canDrag: boolean;
  phase: 'pending' | 'preview' | 'drag';
  timer: number | null;
  slot: TouchDropSlot | null;
}

/**
 * Phone gestures for task cards. Long-press a card to peek at its full text;
 * keep holding and move to drag it to a new spot in the list. A quick tap
 * still opens the card, and a swipe still scrolls.
 */
export function useTouchTaskDrag(
  containerRef: RefObject<HTMLElement | null>,
  { groupAttr, tasksIn, listNameOf, scrollSelector, onMove }: TouchTaskDragOptions
) {
  const press = useRef<Press | null>(null);
  const detach = useRef<(() => void) | null>(null);
  const frame = useRef<number | null>(null);
  const swallowClick = useRef(false);
  const [preview, setPreview] = useState<TaskPreviewState | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dropSlot, setDropSlot] = useState<TouchDropSlot | null>(null);

  // The browser only lets a touchmove cancel scrolling when a non-passive
  // listener was registered before the touch began, so keep one on the board
  // all along; it cancels moves only while a press is engaged.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onTouchMove(event: TouchEvent) {
      const phase = press.current?.phase;
      if ((phase === 'preview' || phase === 'drag') && event.cancelable) event.preventDefault();
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, [containerRef]);

  useEffect(
    () => () => {
      detach.current?.();
      if (frame.current != null) cancelAnimationFrame(frame.current);
    },
    []
  );

  const groupSelector = `[data-${groupAttr.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}]`;

  function groupIdOf(el: Element | null | undefined) {
    return el?.closest<HTMLElement>(groupSelector)?.dataset[groupAttr];
  }

  /** The slot under a point: before/after the task row there, or the end of the group. */
  function slotAt(p: Press, x: number, y: number): TouchDropSlot | null {
    const under = document.elementFromPoint(x, y) as HTMLElement | null;
    const row = under?.closest<HTMLElement>('[data-task-id]');
    const rowGroupId = groupIdOf(row);
    if (row && rowGroupId) {
      if (row.dataset.taskId === p.task.id) return p.slot;
      const tasks = tasksIn(rowGroupId);
      const index = tasks.findIndex((t) => t.id === row.dataset.taskId);
      if (index !== -1) {
        const rect = row.getBoundingClientRect();
        if (y < rect.top + rect.height / 2) return { groupId: rowGroupId, beforeId: tasks[index].id };
        const next = tasks.slice(index + 1).find((t) => t.id !== p.task.id);
        return { groupId: rowGroupId, beforeId: next?.id ?? null };
      }
    }
    const groupId = groupIdOf(under);
    return groupId ? { groupId, beforeId: null } : null;
  }

  function updateSlot(p: Press) {
    const slot = slotAt(p, p.lastX, p.lastY);
    if (slot?.groupId === p.slot?.groupId && slot?.beforeId === p.slot?.beforeId) return;
    p.slot = slot;
    setDropSlot(slot);
  }

  /** Scrolls the list under the finger while it rests near the list's top or bottom edge. */
  function autoScroll() {
    const p = press.current;
    if (!p || p.phase !== 'drag') {
      frame.current = null;
      return;
    }
    const scroller = p.el.closest<HTMLElement>(scrollSelector);
    if (scroller) {
      const rect = scroller.getBoundingClientRect();
      const fromTop = p.lastY - rect.top;
      const fromBottom = rect.bottom - p.lastY;
      let step = 0;
      if (fromTop < AUTOSCROLL_EDGE_PX) step = -AUTOSCROLL_MAX_STEP * (1 - Math.max(0, fromTop) / AUTOSCROLL_EDGE_PX);
      else if (fromBottom < AUTOSCROLL_EDGE_PX) step = AUTOSCROLL_MAX_STEP * (1 - Math.max(0, fromBottom) / AUTOSCROLL_EDGE_PX);
      if (step !== 0) {
        scroller.scrollTop += step;
        updateSlot(p);
      }
    }
    frame.current = requestAnimationFrame(autoScroll);
  }

  function end(commit: boolean) {
    const p = press.current;
    detach.current?.();
    detach.current = null;
    press.current = null;
    if (!p) return;
    if (p.timer != null) window.clearTimeout(p.timer);
    if (p.phase === 'pending') return;
    // A long press is never a tap: keep the click the browser may still
    // synthesize from opening the card (or closing the preview).
    swallowClick.current = true;
    window.setTimeout(() => {
      swallowClick.current = false;
    }, 400);
    if (p.phase === 'drag') {
      setDragTaskId(null);
      setDropSlot(null);
      if (commit && p.slot) onMove(p.task.id, p.slot.groupId, p.slot.beforeId);
    } else if (!commit) {
      setPreview(null);
    }
  }

  function onCardTouchStart(task: TaskDTO, event: ReactTouchEvent<HTMLElement>, canDrag = true) {
    if (press.current || event.touches.length !== 1 || task.done) return;
    const touch = event.touches[0];
    const p: Press = {
      task,
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
      el: event.currentTarget,
      canDrag,
      phase: 'pending',
      timer: null,
      slot: null,
    };
    p.timer = window.setTimeout(() => {
      p.timer = null;
      p.phase = 'preview';
      navigator.vibrate?.(10);
      const rect = p.el.getBoundingClientRect();
      setPreview({
        task,
        listName: listNameOf(task),
        anchor: { top: rect.top, bottom: rect.bottom },
      });
    }, TASK_LONG_PRESS_MS);
    press.current = p;

    // Document-level, so the gesture keeps tracking wherever the finger goes.
    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      p.lastX = t.clientX;
      p.lastY = t.clientY;
      const moved = Math.hypot(t.clientX - p.startX, t.clientY - p.startY) > TOUCH_MOVE_CANCEL_PX;
      if (p.phase === 'pending') {
        if (moved) end(false);
        return;
      }
      if (e.cancelable) e.preventDefault();
      if (p.phase === 'preview') {
        if (!moved || !p.canDrag) return;
        p.phase = 'drag';
        setPreview(null);
        setDragTaskId(p.task.id);
        if (frame.current == null) frame.current = requestAnimationFrame(autoScroll);
      }
      updateSlot(p);
    }
    const onTouchEnd = () => end(true);
    const onTouchCancel = () => end(false);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchCancel);
    detach.current = () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
    };
  }

  return {
    preview,
    closePreview: () => {
      if (!swallowClick.current) setPreview(null);
    },
    dragTaskId,
    dropSlot,
    onCardTouchStart,
    /** True for a moment after a long press ends, while its stray click should be ignored. */
    isSwallowingClick: () => swallowClick.current,
    /** True while a finger is holding a card, so native drag/context menus can be suppressed. */
    isPressing: () => press.current != null,
  };
}
