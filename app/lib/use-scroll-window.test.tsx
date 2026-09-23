import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { useScrollWindow } from '@/app/lib/use-scroll-window';

const UNIT_PX = 100;
const VIEW_PX = 300;

function rect(top: number, height: number): DOMRect {
  return { top, bottom: top + height, left: 0, right: 0, width: 0, height, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
}

// jsdom does no layout: fake a 300px-high viewport whose units are 100px tall.
beforeEach(() => {
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(VIEW_PX);
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function (this: Element) {
    return this.querySelectorAll('[data-unit]').length * UNIT_PX;
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.unit === undefined) return rect(0, VIEW_PX);
    const container = this.parentElement as HTMLElement;
    const first = Number((container.querySelector('[data-unit]') as HTMLElement).dataset.unit);
    return rect((Number(this.dataset.unit) - first) * UNIT_PX - container.scrollTop, UNIT_PX);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Harness({
  anchor,
  min = 0,
  max = 100,
  span = 3,
  scrollOffset,
  onVisible,
}: {
  anchor: number;
  min?: number;
  max?: number;
  span?: number;
  scrollOffset?: number;
  onVisible?: (index: number) => void;
}) {
  const { containerRef, onScroll, start, end } = useScrollWindow({ anchor, min, max, span, scrollOffset, onVisibleChange: onVisible });
  const units = [];
  for (let i = start; i <= end; i++) units.push(<div key={i} data-unit={i}>unit {i}</div>);
  return (
    <div ref={containerRef} onScroll={onScroll} data-testid="c">
      {units}
    </div>
  );
}

// Behaves like a real parent: it adopts the unit the hook reports as its new anchor.
function AdoptingHarness({ initial, onVisible }: { initial: number; onVisible: (index: number) => void }) {
  const [anchor, setAnchor] = useState(initial);
  return (
    <Harness
      anchor={anchor}
      onVisible={(index) => {
        setAnchor(index);
        onVisible(index);
      }}
    />
  );
}

const container = () => screen.getByTestId('c');
const hasUnit = (index: number) => container().querySelector(`[data-unit="${index}"]`) !== null;

describe('useScrollWindow', () => {
  test('renders the anchor plus/minus span, clamped to the bounds', () => {
    render(<Harness anchor={10} />);
    expect(hasUnit(7)).toBe(true);
    expect(hasUnit(13)).toBe(true);
    expect(hasUnit(6)).toBe(false);
    expect(hasUnit(14)).toBe(false);
  });

  test('clamps the window at the minimum', () => {
    render(<Harness anchor={1} min={0} />);
    expect(hasUnit(0)).toBe(true);
    expect(hasUnit(-1)).toBe(false);
    expect(hasUnit(4)).toBe(true);
    expect(hasUnit(5)).toBe(false);
  });

  test('scrolls the anchor unit to the top on mount', () => {
    render(<Harness anchor={10} />);
    expect(container().scrollTop).toBe(300); // unit 10 is the 4th unit of the 7..13 window
  });

  test('keeps scrollOffset px above the unit when scrolling to it', () => {
    render(<Harness anchor={10} scrollOffset={28} />);
    expect(container().scrollTop).toBe(272);
  });

  test('an external anchor inside the window just scrolls; one outside resets the window', () => {
    const { rerender } = render(<Harness anchor={10} />);
    rerender(<Harness anchor={11} />);
    expect(container().scrollTop).toBe(400);
    expect(hasUnit(6)).toBe(false);

    rerender(<Harness anchor={50} />);
    expect(hasUnit(47)).toBe(true);
    expect(hasUnit(53)).toBe(true);
    expect(hasUnit(13)).toBe(false);
    expect(container().scrollTop).toBe(300);
  });

  test('grows downward when scrolled within one viewport of the bottom', () => {
    render(<AdoptingHarness initial={10} onVisible={vi.fn()} />);
    container().scrollTop = 350; // 700 - 350 - 300 = 50 < 300
    fireEvent.scroll(container());
    expect(hasUnit(16)).toBe(true);
    expect(hasUnit(17)).toBe(false);
  });

  test('grows upward and compensates scrollTop by the added height', () => {
    render(<AdoptingHarness initial={10} onVisible={vi.fn()} />);
    container().scrollTop = 100; // 100 < 300, and 700 - 100 - 300 = 300 is not near the bottom
    fireEvent.scroll(container());
    expect(hasUnit(4)).toBe(true);
    expect(container().scrollTop).toBe(400); // 100 + (1000 - 700)
  });

  test('does not grow past the bounds', () => {
    render(<AdoptingHarness initial={1} onVisible={vi.fn()} />);
    container().scrollTop = 0;
    fireEvent.scroll(container());
    expect(hasUnit(-1)).toBe(false);
  });

  test('reports the unit at the top of the view once per change', () => {
    const onVisible = vi.fn();
    render(<AdoptingHarness initial={10} onVisible={onVisible} />);
    fireEvent.scroll(container()); // the browser's scroll event after the initial programmatic scroll
    expect(onVisible).not.toHaveBeenCalled(); // unit 10 is the anchor itself

    container().scrollTop = 500;
    fireEvent.scroll(container());
    expect(onVisible).toHaveBeenCalledTimes(1);
    expect(onVisible).toHaveBeenCalledWith(12);

    fireEvent.scroll(container());
    expect(onVisible).toHaveBeenCalledTimes(1);
  });
});
