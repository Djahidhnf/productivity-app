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

  test('globals.css imports every token file styles.css imports, even though it does not import styles.css directly', () => {
    // app/globals.css imports the 5 token files itself instead of going
    // through klivr/styles.css (see the comment at the top of globals.css
    // for why) - so if the design system ever adds a new token file to
    // styles.css, this test catches globals.css not picking it up too.
    const stylesCss = readFileSync(path.join(stylesDir, 'styles.css'), 'utf-8');
    const globalsCss = readFileSync(path.resolve(__dirname, '../globals.css'), 'utf-8');
    const importedFiles = [...stylesCss.matchAll(/@import url\('\.\/tokens\/([^']+)'\)/g)].map((m) => m[1]);
    expect(importedFiles.length).toBeGreaterThan(0);
    for (const file of importedFiles) {
      expect(globalsCss).toContain(`tokens/${file}`);
    }
  });
});
