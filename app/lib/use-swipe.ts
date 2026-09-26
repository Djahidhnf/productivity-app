'use client';

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { flushSync } from 'react-dom';

export type SwipeResult = 'next' | 'prev' | 'cancel' | 'vertical';

export const AXIS_LOCK_PX = 10;
export const COMMIT_RATIO = 0.25;
export const FLING_MIN_DISTANCE_PX = 40;
export const FLING_MIN_VELOCITY = 0.5; // px per ms
export const SLIDE_MS = 280;
export const LONG_SWIPE_RATIO = 0.6;

export type SwipeStrength = 'short' | 'long';
export type SwipeDirection = 'next' | 'prev';
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

export function swipeStrength(dx: number, width: number): SwipeStrength {
  return Math.abs(dx) >= width * LONG_SWIPE_RATIO ? 'long' : 'short';
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
  onSwipeLeft?: (strength: SwipeStrength) => void;
  onSwipeRight?: (strength: SwipeStrength) => void;
  /**
   * How far (px) the content travels to land on the new position for a swipe
   * of the given strength. Defaults to the surface's full width.
   */
  distance?: (strength: SwipeStrength, width: number) => number;
}

/**
 * Carousel-style horizontal swipe. The surface's `--swipe-x` custom property
 * follows the finger; the consumer renders neighbouring content (while `peek`
 * is true) just outside the visible area so it slides in with the finger. On
 * commit the content glides the rest of the way to the neighbour, then the
 * callback swaps the data and the offset resets to 0 in the same frame, so
 * there is no jump or blank flash.
 */
export function useSwipe({ onSwipeLeft, onSwipeRight, distance }: UseSwipeOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onSwipeLeft, onSwipeRight, distance });
  const gesture = useRef<Gesture | null>(null);
  const busy = useRef(false);
  const pendingFinish = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  const timers = useRef<number[]>([]);
  const [peek, setPeek] = useState(false);

  useEffect(() => {
    callbacks.current = { onSwipeLeft, onSwipeRight, distance };
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

  function hasCallbacks() {
    return !!(callbacks.current.onSwipeLeft || callbacks.current.onSwipeRight);
  }

  function fire(direction: SwipeDirection, strength: SwipeStrength) {
    if (direction === 'next') callbacks.current.onSwipeLeft?.(strength);
    else callbacks.current.onSwipeRight?.(strength);
  }

  function travel(strength: SwipeStrength): number {
    const width = ref.current?.clientWidth ?? 0;
    return callbacks.current.distance ? callbacks.current.distance(strength, width) : width;
  }

  function finish(direction: SwipeDirection, strength: SwipeStrength) {
    const el = ref.current;
    if (!el) return;
    // Complete any slide still in flight first so rapid taps chain cleanly.
    pendingFinish.current?.();
    const px = travel(strength);
    if (prefersReducedMotion() || px <= 0) {
      setOffset(0, false);
      setPeek(false);
      fire(direction, strength);
      return;
    }
    busy.current = true;
    // Mount the neighbour panel before the transition starts.
    flushSync(() => setPeek(true));
    const done = () => {
      pendingFinish.current = null;
      busy.current = false;
      // Swap the data synchronously, then drop the offset in the same frame:
      // the new layout at 0 is pixel-identical to the old one at +/-px.
      flushSync(() => {
        fire(direction, strength);
        setPeek(false);
      });
      setOffset(0, false);
    };
    pendingFinish.current = done;
    setOffset(direction === 'next' ? -px : px, true);
    later(() => {
      if (pendingFinish.current === done) done();
    }, SLIDE_MS);
  }

  function snapBack() {
    setOffset(0, true);
    later(() => {
      if (!gesture.current && !busy.current) setPeek(false);
    }, SLIDE_MS);
  }

  function swallowNextClick() {
    suppressClick.current = true;
    later(() => {
      suppressClick.current = false;
    }, CLICK_SWALLOW_MS);
  }

  /** Programmatic navigation (e.g. header arrows) with the same slide. */
  function slide(direction: SwipeDirection, strength: SwipeStrength = 'long') {
    gesture.current = null;
    finish(direction, strength);
  }

  /** Abandons an in-progress touch gesture (another interaction took over). */
  function cancel() {
    const g = gesture.current;
    gesture.current = null;
    if (g?.axis === 'x') snapBack();
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch' || busy.current) return;
    if (!hasCallbacks()) return;
    if (gesture.current) {
      // A second finger: abandon the swipe.
      if (gesture.current.axis === 'x') snapBack();
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
      if (g.axis === 'x') {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setPeek(true);
      }
    }
    if (g.axis === 'x') setOffset(dx, false);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || event.pointerId !== g.pointerId) return;
    gesture.current = null;
    if (g.axis !== 'x') return;
    swallowNextClick();
    const dx = event.clientX - g.startX;
    const width = ref.current?.clientWidth || 1;
    const result = resolveSwipe({ dx, dy: event.clientY - g.startY, dt: performance.now() - g.startT, width });
    if (result === 'next' || result === 'prev') finish(result, swipeStrength(dx, width));
    else snapBack();
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || event.pointerId !== g.pointerId) return;
    gesture.current = null;
    if (g.axis === 'x') snapBack();
  }

  function onClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.stopPropagation();
    event.preventDefault();
  }

  return {
    ref,
    peek,
    slide,
    cancel,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture },
  };
}
