'use client';

import { useEffect, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';

export type SwipeResult = 'next' | 'prev' | 'cancel' | 'vertical';

export const AXIS_LOCK_PX = 10;
export const COMMIT_RATIO = 0.25;
export const FLING_MIN_DISTANCE_PX = 40;
export const FLING_MIN_VELOCITY = 0.5; // px per ms
export const SLIDE_MS = 150;
const SETTLE_DELAY_MS = 30;
const CLICK_SWALLOW_MS = 50;

export function lockAxis(dx: number, dy: number): 'x' | 'y' | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_PX) return null;
  return Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
}

export function resolveSwipe({ dx, dy, dt, width }: { dx: number; dy: number; dt: number; width: number }): SwipeResult {
  const absX = Math.abs(dx);
  if (Math.abs(dy) > absX) return 'vertical';
  const farEnough = absX > width * COMMIT_RATIO;
  const fastEnough = absX > FLING_MIN_DISTANCE_PX && absX / Math.max(dt, 1) > FLING_MIN_VELOCITY;
  if (!farEnough && !fastEnough) return 'cancel';
  return dx < 0 ? 'next' : 'prev';
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

interface Gesture {
  pointerId: number;
  startX: number;
  startY: number;
  startT: number;
  axis: 'x' | 'y' | null;
}

export interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function useSwipe({ onSwipeLeft, onSwipeRight }: UseSwipeOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onSwipeLeft, onSwipeRight });
  const gesture = useRef<Gesture | null>(null);
  const busy = useRef(false);
  const suppressClick = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    callbacks.current = { onSwipeLeft, onSwipeRight };
  });

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function setOffset(px: number, animated: boolean) {
    const el = ref.current;
    if (!el) return;
    if (animated) el.dataset.swipe = 'anim';
    else delete el.dataset.swipe;
    el.style.setProperty('--swipe-x', `${px}px`);
  }

  function finish(direction: 'next' | 'prev') {
    const el = ref.current;
    if (!el) return;
    const fire = () => {
      if (direction === 'next') callbacks.current.onSwipeLeft?.();
      else callbacks.current.onSwipeRight?.();
    };
    if (prefersReducedMotion()) {
      setOffset(0, false);
      fire();
      return;
    }
    const width = el.clientWidth || 1;
    const out = direction === 'next' ? -width : width;
    busy.current = true;
    setOffset(out, true);
    later(() => {
      // Jump the (now off-screen) columns to the opposite side, swap the
      // date, then slide the new days in from there.
      setOffset(-out, false);
      fire();
      later(() => {
        setOffset(0, true);
        later(() => {
          busy.current = false;
        }, SLIDE_MS);
      }, SETTLE_DELAY_MS);
    }, SLIDE_MS);
  }

  function swallowNextClick() {
    suppressClick.current = true;
    later(() => {
      suppressClick.current = false;
    }, CLICK_SWALLOW_MS);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch' || busy.current) return;
    if (!callbacks.current.onSwipeLeft && !callbacks.current.onSwipeRight) return;
    if (gesture.current) {
      // A second finger: abandon the swipe.
      if (gesture.current.axis === 'x') setOffset(0, true);
      gesture.current = null;
      return;
    }
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startT: performance.now(),
      axis: null,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || event.pointerId !== g.pointerId || g.axis === 'y') return;
    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;
    if (g.axis === null) {
      g.axis = lockAxis(dx, dy);
      if (g.axis === 'x') event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    if (g.axis === 'x') setOffset(dx, false);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || event.pointerId !== g.pointerId) return;
    gesture.current = null;
    if (g.axis !== 'x') return;
    swallowNextClick();
    const result = resolveSwipe({
      dx: event.clientX - g.startX,
      dy: event.clientY - g.startY,
      dt: performance.now() - g.startT,
      width: ref.current?.clientWidth || 1,
    });
    if (result === 'next' || result === 'prev') finish(result);
    else setOffset(0, true);
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || event.pointerId !== g.pointerId) return;
    gesture.current = null;
    if (g.axis === 'x') setOffset(0, true);
  }

  function onClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.stopPropagation();
    event.preventDefault();
  }

  return { ref, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture } };
}
