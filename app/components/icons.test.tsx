import { render } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { Icon, type IconName } from '@/app/components/icons';

const ALL_ICONS: IconName[] = [
  'home', 'check-square', 'calendar', 'grid', 'flame', 'book',
  'plus', 'check', 'left', 'right', 'trash', 'pencil', 'grip',
  'flag', 'panel', 'menu', 'ban', 'sun', 'moon',
];

describe('Icon', () => {
  test.each(ALL_ICONS)('renders an svg with at least one shape for "%s"', (name) => {
    const { container } = render(<Icon name={name} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.children.length).toBeGreaterThan(0);
  });

  test('applies the requested size', () => {
    const { container } = render(<Icon name="home" size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });
});
