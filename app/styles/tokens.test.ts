import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const stylesDir = path.resolve(__dirname, 'klivr');

describe('Klivr design tokens', () => {
  test('colors.css defines the signature accent and dark surface', () => {
    const css = readFileSync(path.join(stylesDir, 'tokens/colors.css'), 'utf-8');
    expect(css).toContain('--accent-500: #c6ff34');
    expect(css).toContain('--neutral-900: #171717');
  });

  test('spacing.css defines the card radius', () => {
    const css = readFileSync(path.join(stylesDir, 'tokens/spacing.css'), 'utf-8');
    expect(css).toContain('--radius-2xl: 28px');
  });

  test('styles.css imports all five token files', () => {
    const css = readFileSync(path.join(stylesDir, 'styles.css'), 'utf-8');
    for (const file of ['fonts.css', 'colors.css', 'typography.css', 'spacing.css', 'effects.css']) {
      expect(css).toContain(file);
    }
  });
});
