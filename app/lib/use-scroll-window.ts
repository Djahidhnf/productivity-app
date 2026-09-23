'use client';

import { useLayoutEffect, useRef, useState, type UIEvent } from 'react';

export interface UseScrollWindowOptions {
  /** The unit index the parent wants in view. */
  anchor: number;
  /** Lowest and highest unit index that may be rendered (inclusive). */
  min: number;
  max: number;
  /** Units rendered before/after the anchor initially, and added on each extension. */
  span: number;
  /** Pixels kept above a unit's top edge when scrolling to it (e.g. a sticky header's height). */
  scrollOffset?: number;
  /** Called when a different unit becomes the one at the top of the view. */
  onVisibleChange?: (index: number) => void;
}

// A unit counts as "at the top" while its bottom edge is below this many px under the container's top.
const PROBE_PX = 80;

function windowAround(anchor: number, span: number, min: number, max: number) {
  return { start: Math.max(min, anchor - span), end: Math.min(max, anchor + span) };
}

/**
 * Windowed, growable vertical scroll over integer "units" (months or years).
 * Consumers render one element per unit in `start..end` (ascending) as direct
 * children of the container, each tagged `data-unit={index}`.
 */
export function useScrollWindow({ anchor, min, max, span, scrollOffset = 0, onVisibleChange }: UseScrollWindowOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const restore = useRef<{ height: number; top: number } | null>(null);
  const [range, setRange] = useState(() => windowAround(anchor, span, min, max));
  const [synced, setSynced] = useState(anchor);
  const [scrollTarget, setScrollTarget] = useState({ index: anchor });

  // The parent moved the anchor (arrows, picker, Today...): recenter if needed and scroll to it.
  // A unit the hook itself reported as visible is already synced, so it never re-scrolls.
  if (anchor !== synced) {
    setSynced(anchor);
    if (anchor < range.start || anchor > range.end) setRange(windowAround(anchor, span, min, max));
    setScrollTarget({ index: anchor });
  }

  useLayoutEffect(() => {
    restore.current = null; // a pending prepend-compensation must not override an explicit jump
    const el = containerRef.current;
    const target = el?.querySelector<HTMLElement>(`[data-unit="${scrollTarget.index}"]`);
    if (!el || !target) return;
    el.scrollTop = target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - scrollOffset;
  }, [scrollTarget, scrollOffset]);

  // Units were added above the viewport: keep what the user was looking at in place
  // (iOS Safari has no scroll anchoring).
  useLayoutEffect(() => {
    const el = containerRef.current;
    const saved = restore.current;
    if (!el || !saved) return;
    restore.current = null;
    el.scrollTop = saved.top + (el.scrollHeight - saved.height);
  }, [range.start]);

  function onScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    const nearTop = el.scrollTop < el.clientHeight;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < el.clientHeight;
    if (nearTop && range.start > min) {
      restore.current = { height: el.scrollHeight, top: el.scrollTop };
      setRange((r) => ({ ...r, start: Math.max(min, r.start - span) }));
    }
    if (nearBottom && range.end < max) {
      setRange((r) => ({ ...r, end: Math.min(max, r.end + span) }));
    }

    const probe = el.getBoundingClientRect().top + PROBE_PX;
    for (const unit of el.querySelectorAll<HTMLElement>('[data-unit]')) {
      if (unit.getBoundingClientRect().bottom > probe) {
        const index = Number(unit.dataset.unit);
        if (index !== synced) {
          setSynced(index);
          onVisibleChange?.(index);
        }
        break;
      }
    }
  }

  return { containerRef, onScroll, start: range.start, end: range.end };
}
