import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSwipe, lockAxis, resolveSwipe, SLIDE_MS } from '@/app/lib/use-swipe';

describe('lockAxis', () => {
  test('stays undecided until movement reaches 10px', () => {
    expect(lockAxis(5, 5)).toBeNull();
    expect(lockAxis(9, 0)).toBeNull();
  });
  test('locks horizontal or vertical by the dominant direction', () => {
    expect(lockAxis(12, 3)).toBe('x');
    expect(lockAxis(-12, 3)).toBe('x');
    expect(lockAxis(3, -12)).toBe('y');
  });
  test('a tie favors vertical so scrolling wins', () => {
    expect(lockAxis(10, 10)).toBe('y');
  });
});

describe('resolveSwipe', () => {
  const width = 400;
  test('commits past 25% of the width (left = next, right = prev)', () => {
    expect(resolveSwipe({ dx: -150, dy: 5, dt: 400, width })).toBe('next');
    expect(resolveSwipe({ dx: 150, dy: 5, dt: 400, width })).toBe('prev');
  });
  test('exactly 25% does not commit when slow', () => {
    expect(resolveSwipe({ dx: -100, dy: 0, dt: 1000, width })).toBe('cancel');
  });
  test('a short slow drag cancels', () => {
    expect(resolveSwipe({ dx: -60, dy: 0, dt: 400, width })).toBe('cancel');
  });
  test('a short fast fling commits', () => {
    expect(resolveSwipe({ dx: -60, dy: 0, dt: 80, width })).toBe('next');
  });
  test('a fast but tiny flick (under 40px) cancels', () => {
    expect(resolveSwipe({ dx: -30, dy: 0, dt: 20, width })).toBe('cancel');
  });
  test('vertical-dominant gestures resolve to vertical', () => {
    expect(resolveSwipe({ dx: -100, dy: -150, dt: 300, width })).toBe('vertical');
  });
  test('a zero duration does not divide by zero', () => {
    expect(resolveSwipe({ dx: -60, dy: 0, dt: 0, width })).toBe('next');
  });
});

function Harness(props: { onLeft?: () => void; onRight?: () => void; onInnerClick?: () => void }) {
  const { ref, handlers } = useSwipe({ onSwipeLeft: props.onLeft, onSwipeRight: props.onRight });
  return (
    <div ref={ref} data-testid="surface" {...handlers}>
      <button onClick={props.onInnerClick}>inner</button>
    </div>
  );
}

let nowMs = 0;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  nowMs = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function getSurface(): HTMLElement {
  const el = screen.getByTestId('surface');
  Object.defineProperty(el, 'clientWidth', { value: 400, configurable: true });
  return el;
}

function pointer(x: number, y: number, pointerType = 'touch', pointerId = 1) {
  return { pointerId, pointerType, clientX: x, clientY: y };
}

function drag(el: HTMLElement, { dx, dy = 0, ms = 400, pointerType = 'touch' }: { dx: number; dy?: number; ms?: number; pointerType?: string }) {
  fireEvent.pointerDown(el, pointer(200, 300, pointerType));
  nowMs += ms / 2;
  fireEvent.pointerMove(el, pointer(200 + dx / 2, 300 + dy / 2, pointerType));
  nowMs += ms / 2;
  fireEvent.pointerMove(el, pointer(200 + dx, 300 + dy, pointerType));
  fireEvent.pointerUp(el, pointer(200 + dx, 300 + dy, pointerType));
}

describe('useSwipe', () => {
  test('columns follow the finger while dragging horizontally', () => {
    render(<Harness onLeft={vi.fn()} />);
    const el = getSurface();
    fireEvent.pointerDown(el, pointer(200, 300));
    fireEvent.pointerMove(el, pointer(140, 302));
    expect(el.style.getPropertyValue('--swipe-x')).toBe('-60px');
    expect(el.dataset.swipe).toBeUndefined();
  });

  test('a left swipe past the threshold calls onSwipeLeft after the slide-out', () => {
    const onLeft = vi.fn();
    const onRight = vi.fn();
    render(<Harness onLeft={onLeft} onRight={onRight} />);
    const el = getSurface();
    drag(el, { dx: -150 });
    expect(el.dataset.swipe).toBe('anim');
    expect(el.style.getPropertyValue('--swipe-x')).toBe('-400px');
    expect(onLeft).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SLIDE_MS);
    expect(onLeft).toHaveBeenCalledTimes(1);
    expect(onRight).not.toHaveBeenCalled();
  });

  test('a right swipe past the threshold calls onSwipeRight', () => {
    const onLeft = vi.fn();
    const onRight = vi.fn();
    render(<Harness onLeft={onLeft} onRight={onRight} />);
    drag(getSurface(), { dx: 150 });
    vi.advanceTimersByTime(SLIDE_MS);
    expect(onRight).toHaveBeenCalledTimes(1);
    expect(onLeft).not.toHaveBeenCalled();
  });

  test('after the swipe the new content slides back to rest', () => {
    render(<Harness onLeft={vi.fn()} />);
    const el = getSurface();
    drag(el, { dx: -150 });
    vi.advanceTimersByTime(SLIDE_MS);
    expect(el.style.getPropertyValue('--swipe-x')).toBe('400px');
    vi.advanceTimersByTime(60);
    expect(el.style.getPropertyValue('--swipe-x')).toBe('0px');
    expect(el.dataset.swipe).toBe('anim');
  });

  test('a short slow drag cancels and snaps back', () => {
    const onLeft = vi.fn();
    render(<Harness onLeft={onLeft} />);
    const el = getSurface();
    drag(el, { dx: -40, ms: 800 });
    vi.advanceTimersByTime(1000);
    expect(onLeft).not.toHaveBeenCalled();
    expect(el.style.getPropertyValue('--swipe-x')).toBe('0px');
  });

  test('a short fast fling commits', () => {
    const onLeft = vi.fn();
    render(<Harness onLeft={onLeft} />);
    drag(getSurface(), { dx: -60, ms: 80 });
    vi.advanceTimersByTime(SLIDE_MS);
    expect(onLeft).toHaveBeenCalledTimes(1);
  });

  test('a vertical gesture is ignored and never moves the columns', () => {
    const onLeft = vi.fn();
    const onRight = vi.fn();
    render(<Harness onLeft={onLeft} onRight={onRight} />);
    const el = getSurface();
    drag(el, { dx: 5, dy: 200 });
    vi.advanceTimersByTime(1000);
    expect(onLeft).not.toHaveBeenCalled();
    expect(onRight).not.toHaveBeenCalled();
    expect(el.style.getPropertyValue('--swipe-x')).toBe('');
  });

  test('mouse drags are ignored', () => {
    const onLeft = vi.fn();
    render(<Harness onLeft={onLeft} />);
    const el = getSurface();
    drag(el, { dx: -200, pointerType: 'mouse' });
    vi.advanceTimersByTime(1000);
    expect(onLeft).not.toHaveBeenCalled();
    expect(el.style.getPropertyValue('--swipe-x')).toBe('');
  });

  test('with no callbacks supplied nothing happens', () => {
    render(<Harness />);
    const el = getSurface();
    drag(el, { dx: -200 });
    expect(el.style.getPropertyValue('--swipe-x')).toBe('');
  });

  test('the click that follows a swipe is swallowed, but a plain tap click is not', () => {
    const onInnerClick = vi.fn();
    render(<Harness onLeft={vi.fn()} onInnerClick={onInnerClick} />);
    const el = getSurface();
    drag(el, { dx: -150 });
    fireEvent.click(screen.getByText('inner'));
    expect(onInnerClick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    fireEvent.click(screen.getByText('inner'));
    expect(onInnerClick).toHaveBeenCalledTimes(1);
  });

  test('pointercancel (the browser took over for scrolling) snaps back without navigating', () => {
    const onLeft = vi.fn();
    render(<Harness onLeft={onLeft} />);
    const el = getSurface();
    fireEvent.pointerDown(el, pointer(200, 300));
    fireEvent.pointerMove(el, pointer(120, 300));
    fireEvent.pointerCancel(el, pointer(120, 300));
    vi.advanceTimersByTime(1000);
    expect(onLeft).not.toHaveBeenCalled();
    expect(el.style.getPropertyValue('--swipe-x')).toBe('0px');
  });

  test('a second finger cancels the swipe', () => {
    const onLeft = vi.fn();
    render(<Harness onLeft={onLeft} />);
    const el = getSurface();
    fireEvent.pointerDown(el, pointer(200, 300, 'touch', 1));
    fireEvent.pointerMove(el, pointer(100, 300, 'touch', 1));
    fireEvent.pointerDown(el, pointer(50, 300, 'touch', 2));
    expect(el.style.getPropertyValue('--swipe-x')).toBe('0px');
    fireEvent.pointerUp(el, pointer(100, 300, 'touch', 1));
    vi.advanceTimersByTime(1000);
    expect(onLeft).not.toHaveBeenCalled();
  });

  test('with prefers-reduced-motion the callback fires immediately with no slide', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    const onLeft = vi.fn();
    render(<Harness onLeft={onLeft} />);
    const el = getSurface();
    drag(el, { dx: -150 });
    expect(onLeft).toHaveBeenCalledTimes(1);
    expect(el.style.getPropertyValue('--swipe-x')).toBe('0px');
    expect(el.dataset.swipe).toBeUndefined();
  });
});
