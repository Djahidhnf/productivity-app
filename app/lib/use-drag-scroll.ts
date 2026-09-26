'use client';

import { useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';

/** Elements that keep their own mouse behaviour instead of starting a grab-scroll. */
const INTERACTIVE = 'input, textarea, select, button, a, label, [draggable="true"], [contenteditable="true"], [data-no-drag-scroll]';
export const DRAG_SCROLL_THRESHOLD_PX = 4;

interface Grab {
  pointerId: number;
  startX: number;
  startY: number;
  scrollLeft: number;
  /** The vertically scrollable element under the pointer, if any. */
  inner: HTMLElement | null;
  innerScrollTop: number;
  moved: boolean;
}

/**
 * Mouse "grab and drag" scrolling for a horizontally scrolling container:
 * dragging empty space pans the container sideways, and pans the nearest
 * `innerSelector` element (e.g. a column's task list) vertically. Touch and pen
 * input are left to native scrolling.
 */
export function useDragScroll<T extends HTMLElement>({ innerSelector }: { innerSelector?: string } = {}) {
  const ref = useRef<T>(null);
  const grab = useRef<Grab | null>(null);
  const swallowClick = useRef(false);

  function onPointerDown(event: ReactPointerEvent<T>) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest(INTERACTIVE)) return;
    const el = ref.current;
    if (!el) return;
    const inner = innerSelector ? target.closest<HTMLElement>(innerSelector) : null;
    grab.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: el.scrollLeft,
      inner,
      innerScrollTop: inner?.scrollTop ?? 0,
      moved: false,
    };
  }

  function onPointerMove(event: ReactPointerEvent<T>) {
    const g = grab.current;
    const el = ref.current;
    if (!g || !el || event.pointerId !== g.pointerId) return;
    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;
    if (!g.moved) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_SCROLL_THRESHOLD_PX) return;
      g.moved = true;
      el.setPointerCapture?.(event.pointerId);
      el.dataset.grabbing = 'true';
      window.getSelection?.()?.removeAllRanges();
    }
    event.preventDefault();
    el.scrollLeft = g.scrollLeft - dx;
    if (g.inner) g.inner.scrollTop = g.innerScrollTop - dy;
  }

  function end(event: ReactPointerEvent<T>) {
    const g = grab.current;
    if (!g || event.pointerId !== g.pointerId) return;
    grab.current = null;
    const el = ref.current;
    if (el) delete el.dataset.grabbing;
    if (g.moved) {
      swallowClick.current = true;
      window.setTimeout(() => {
        swallowClick.current = false;
      }, 0);
    }
  }

  function onClickCapture(event: ReactMouseEvent<T>) {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    event.stopPropagation();
    event.preventDefault();
  }

  return { ref, handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, onClickCapture } };
}
