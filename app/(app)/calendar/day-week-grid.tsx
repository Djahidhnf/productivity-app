'use client';

import { useEffect, useImperativeHandle, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from 'react';
import { CalendarTaskBlock } from './calendar-task-block';
import { HOUR_PX, minutesFromOffset, rangeFromDrag, type MinuteRange } from './calendar-views';
import { useSwipe, type SwipeDirection, type SwipeStrength } from '@/app/lib/use-swipe';
import { addDays } from '@/app/lib/calendar-dates';
import { formatTime, todayKey } from '@/app/lib/date-format';
import type { TaskDTO } from './queries';

export interface DayWeekGridNav {
  /** Slides to the previous/next range with the same animation as a swipe. */
  slide: (direction: SwipeDirection) => void;
}

export interface DayWeekGridProps {
  dateKeys: string[];
  timedTasksFor: (dateKey: string) => TaskDTO[];
  untimedTasksFor: (dateKey: string) => TaskDTO[];
  onTaskOpen: (task: TaskDTO) => void;
  onGridClick: (dateKey: string, minutes: number) => void;
  /** Called after dragging out a time range on an empty part of a day column. */
  onRangeSelect?: (dateKey: string, startMinutes: number, durationMinutes: number) => void;
  onTaskDragStart: (task: TaskDTO) => void;
  onGridDrop: (dateKey: string, minutes: number) => void;
  onTaskToggleDone?: (taskId: string) => void;
  /** Clicking a day's header (multi-day views) opens that day. */
  onDayOpen?: (dateKey: string) => void;
  onSwipePrev?: (strength: SwipeStrength) => void;
  onSwipeNext?: (strength: SwipeStrength) => void;
  navRef?: Ref<DayWeekGridNav>;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MOUSE_DRAG_START_PX = 4;
const TOUCH_LONG_PRESS_MS = 400;
const TOUCH_MOVE_CANCEL_PX = 8;

function dayHeaderParts(dateKey: string): { weekday: string; dayNum: string } {
  const d = new Date(`${dateKey}T00:00:00`);
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNum: String(d.getDate()),
  };
}

interface Press {
  pointerId: number;
  pointerType: string;
  dateKey: string;
  column: HTMLElement;
  startX: number;
  startY: number;
  anchorMinutes: number;
  selecting: boolean;
  timer: number | null;
}

interface Selection {
  dateKey: string;
  range: MinuteRange;
}

function offsetInColumn(column: HTMLElement, clientY: number): number {
  return clientY - column.getBoundingClientRect().top;
}

export function DayWeekGrid({
  dateKeys,
  timedTasksFor,
  untimedTasksFor,
  onTaskOpen,
  onGridClick,
  onRangeSelect,
  onTaskDragStart,
  onGridDrop,
  onTaskToggleDone,
  onDayOpen,
  onSwipePrev,
  onSwipeNext,
  navRef,
}: DayWeekGridProps) {
  const count = dateKeys.length;
  const viewportRef = useRef<HTMLDivElement>(null);
  const { ref, peek, slide, cancel, handlers } = useSwipe({
    onSwipeLeft: onSwipeNext,
    onSwipeRight: onSwipePrev,
    distance: (strength) => {
      const width = viewportRef.current?.clientWidth ?? 0;
      return strength === 'short' ? width / count : width;
    },
  });
  const press = useRef<Press | null>(null);
  const swallowClick = useRef(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [touchSelecting, setTouchSelecting] = useState(false);

  useImperativeHandle(navRef, () => ({ slide: (direction) => slide(direction, 'long') }));

  const prevKeys = dateKeys.map((_, i) => addDays(dateKeys[0], i - count));
  const nextKeys = dateKeys.map((_, i) => addDays(dateKeys[count - 1], i + 1));

  function clearPress() {
    const p = press.current;
    if (p?.timer != null) window.clearTimeout(p.timer);
    press.current = null;
  }

  useEffect(() => () => clearPress(), []);

  // Holding to select a time range must not scroll the grid. The browser only
  // lets a touchmove cancel scrolling if a non-passive listener was already
  // registered when the touch began, so keep one on the grid all along.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onTouchMove(event: TouchEvent) {
      if (press.current?.selecting && event.cancelable) event.preventDefault();
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, [ref]);

  function commitSelection(sel: Selection | null) {
    clearPress();
    setSelection(null);
    setTouchSelecting(false);
    if (!sel) return;
    swallowClick.current = true;
    window.setTimeout(() => {
      swallowClick.current = false;
    }, 50);
    if (onRangeSelect) onRangeSelect(sel.dateKey, sel.range.start, sel.range.end - sel.range.start);
    else onGridClick(sel.dateKey, sel.range.start);
  }

  function updateSelection(clientY: number) {
    const p = press.current;
    if (!p) return null;
    const next: Selection = {
      dateKey: p.dateKey,
      range: rangeFromDrag(p.anchorMinutes, minutesFromOffset(offsetInColumn(p.column, clientY), 15, 'floor')),
    };
    setSelection(next);
    return next;
  }

  // Once a touch long-press turns into a range selection, follow the finger
  // with native, non-passive listeners: they stop the page from scrolling
  // (React's synthetic touch listeners are passive) and keep tracking even if
  // the browser stops delivering pointer events.
  useEffect(() => {
    if (!touchSelecting) return;
    let latest: Selection | null = null;
    function onMove(event: TouchEvent) {
      event.preventDefault();
      const touch = event.touches[0];
      if (touch) latest = updateSelection(touch.clientY) ?? latest;
    }
    function onEnd() {
      const p = press.current;
      commitSelection(latest ?? (p ? { dateKey: p.dateKey, range: rangeFromDrag(p.anchorMinutes, p.anchorMinutes) } : null));
    }
    function onCancel() {
      clearPress();
      setSelection(null);
      setTouchSelecting(false);
    }
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onCancel);
    return () => {
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the listeners read the latest handlers through press.current
  }, [touchSelecting]);

  function onColumnPointerDown(dateKey: string, event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('.pw-cal-block')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    clearPress();
    const column = event.currentTarget;
    const anchorMinutes = minutesFromOffset(offsetInColumn(column, event.clientY), 15, 'floor');
    const p: Press = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      dateKey,
      column,
      startX: event.clientX,
      startY: event.clientY,
      anchorMinutes,
      selecting: false,
      timer: null,
    };
    if (event.pointerType === 'touch') {
      p.timer = window.setTimeout(() => {
        if (press.current !== p) return;
        p.timer = null;
        p.selecting = true;
        cancel();
        navigator.vibrate?.(10);
        setSelection({ dateKey, range: rangeFromDrag(anchorMinutes, anchorMinutes) });
        setTouchSelecting(true);
      }, TOUCH_LONG_PRESS_MS);
    }
    press.current = p;
  }

  function onColumnPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const p = press.current;
    if (!p || event.pointerId !== p.pointerId) return;
    if (p.pointerType === 'touch') {
      if (p.selecting) {
        event.stopPropagation();
        return;
      }
      if (Math.hypot(event.clientX - p.startX, event.clientY - p.startY) > TOUCH_MOVE_CANCEL_PX) clearPress();
      return;
    }
    if (!p.selecting) {
      if (Math.abs(event.clientY - p.startY) < MOUSE_DRAG_START_PX) return;
      p.selecting = true;
      p.column.setPointerCapture?.(event.pointerId);
    }
    updateSelection(event.clientY);
  }

  function onColumnPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const p = press.current;
    if (!p || event.pointerId !== p.pointerId) return;
    if (p.pointerType === 'touch') {
      // A committed touch selection is finished by the native touchend listener.
      if (!p.selecting) clearPress();
      else event.stopPropagation();
      return;
    }
    if (!p.selecting) {
      clearPress();
      return;
    }
    commitSelection(updateSelection(event.clientY));
  }

  function onColumnPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    const p = press.current;
    if (!p || event.pointerId !== p.pointerId || (p.pointerType === 'touch' && p.selecting)) return;
    clearPress();
    setSelection(null);
  }

  function panels(render: (keys: string[], live: boolean) => ReactNode, viewport?: Ref<HTMLDivElement>) {
    return (
      <div ref={viewport} className="pw-calgrid-viewport">
        <div className="pw-calgrid-track">
          {peek && (
            <div className="pw-calgrid-panel" data-side="prev" aria-hidden="true">
              {render(prevKeys, false)}
            </div>
          )}
          {render(dateKeys, true)}
          {peek && (
            <div className="pw-calgrid-panel" data-side="next" aria-hidden="true">
              {render(nextKeys, false)}
            </div>
          )}
        </div>
      </div>
    );
  }

  const today = todayKey();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  function renderHeader(keys: string[], live: boolean) {
    const clickable = live && !!onDayOpen && count > 1;
    return keys.map((key) => {
      const { weekday, dayNum } = dayHeaderParts(key);
      return (
        <div
          key={key}
          className="pw-calgrid-dayhead"
          data-clickable={clickable || undefined}
          role={clickable ? 'button' : undefined}
          tabIndex={clickable ? 0 : undefined}
          aria-label={clickable ? `Open ${weekday} ${dayNum}` : undefined}
          onClick={clickable ? () => onDayOpen?.(key) : undefined}
          onKeyDown={
            clickable
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onDayOpen?.(key);
                  }
                }
              : undefined
          }
          style={{ flex: 1, minWidth: 0, padding: '8px 4px' }}
        >
          <span className="pw-calgrid-weekday">{weekday}</span>
          <span className="pw-calgrid-daynum" data-today={key === today || undefined}>{dayNum}</span>
        </div>
      );
    });
  }

  function renderAllDay(keys: string[], live: boolean) {
    return keys.map((key) => (
      <div
        key={key}
        style={{ flex: 1, minWidth: 0, borderLeft: '1px solid var(--border-1)', padding: 4, display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {untimedTasksFor(key).map((task) => (
          <div
            key={task.id}
            onClick={
              live
                ? (event) => {
                    event.stopPropagation();
                    onTaskOpen(task);
                  }
                : undefined
            }
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: 6,
              background: 'var(--surface-1)',
              border: '1px solid var(--border-2)',
              color: task.done ? 'var(--fg-3)' : 'var(--fg-1)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textDecoration: task.done ? 'line-through' : 'none',
            }}
          >
            {task.text}
          </div>
        ))}
      </div>
    ));
  }

  function renderColumns(keys: string[], live: boolean) {
    return keys.map((key) => (
      <div
        key={key}
        className="pw-calgrid-col"
        data-daykey={live ? key : undefined}
        onPointerDown={live ? (event) => onColumnPointerDown(key, event) : undefined}
        onPointerMove={live ? onColumnPointerMove : undefined}
        onPointerUp={live ? onColumnPointerUp : undefined}
        onPointerCancel={live ? onColumnPointerCancel : undefined}
        onContextMenu={live ? (event) => press.current?.pointerType === 'touch' && event.preventDefault() : undefined}
        onClick={
          live
            ? (event) => {
                if (swallowClick.current) return;
                const rect = event.currentTarget.getBoundingClientRect();
                onGridClick(key, minutesFromOffset(event.clientY - rect.top, 30));
              }
            : undefined
        }
        onDragOver={live ? (event) => event.preventDefault() : undefined}
        onDrop={
          live
            ? (event) => {
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                onGridDrop(key, minutesFromOffset(event.clientY - rect.top, 15));
              }
            : undefined
        }
      >
        {HOURS.map((h) => (
          <div key={h} className="pw-calgrid-hourline" style={{ top: h * HOUR_PX }} />
        ))}
        {live && key === today && <div className="pw-calgrid-now" style={{ top: (nowMinutes / 60) * HOUR_PX }} />}
        {timedTasksFor(key).map((task) => (
          <CalendarTaskBlock
            key={task.id}
            task={task}
            onOpen={onTaskOpen}
            onToggleDone={live ? onTaskToggleDone : undefined}
            draggable={live}
            onDragStart={() => onTaskDragStart(task)}
          />
        ))}
        {live && selection?.dateKey === key && (
          <div
            className="pw-calgrid-selection"
            style={{ top: (selection.range.start / 60) * HOUR_PX, height: ((selection.range.end - selection.range.start) / 60) * HOUR_PX }}
          >
            {formatTime(selection.range.start)} – {formatTime(selection.range.end % (24 * 60))}
          </div>
        )}
      </div>
    ));
  }

  return (
    <div ref={ref} className="pw-calgrid pw-scroll" data-dense={count > 3} data-selecting={!!selection || undefined} {...handlers}>
      <div className="pw-calgrid-header">
        <div className="pw-calgrid-gutter" />
        {panels(renderHeader)}
      </div>
      <div className="pw-calgrid-allday">
        <div className="pw-calgrid-gutter pw-calgrid-allday-label">All day</div>
        {panels(renderAllDay)}
      </div>
      <div className="pw-calgrid-body" style={{ height: HOUR_PX * 24 }}>
        <div className="pw-calgrid-gutter">
          {HOURS.map((h) => (
            <div key={h} style={{ height: HOUR_PX, position: 'relative' }}>
              {h > 0 && <span className="pw-calgrid-hour">{String(h).padStart(2, '0')}:00</span>}
            </div>
          ))}
        </div>
        {panels(renderColumns, viewportRef)}
      </div>
    </div>
  );
}
