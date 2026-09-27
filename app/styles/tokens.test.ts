import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const stylesDir = path.resolve(__dirname, 'still');

describe('Still design tokens', () => {
  test('colors.css defines the sage accent and the dark graphite background', () => {
    const css = readFileSync(path.join(stylesDir, 'tokens/colors.css'), 'utf-8');
    expect(css).toContain('--accent:var(--sage-600)');
    expect(css).toContain('--bg-app:var(--gray-950)');
  });

  test('globals.css imports every token file styles.css imports, even though it does not import styles.css directly', () => {
    // app/globals.css imports the token files itself instead of going through
    // still/styles.css (see the comment at the top of globals.css for why) -
    // so if the design system adds a token file to styles.css, this catches
    // globals.css not picking it up too.
    const stylesCss = readFileSync(path.join(stylesDir, 'styles.css'), 'utf-8');
    const globalsCss = readFileSync(path.resolve(__dirname, '../globals.css'), 'utf-8');
    const importedFiles = [...stylesCss.matchAll(/@import url\('tokens\/([^']+)'\)/g)].map((m) => m[1]);
    expect(importedFiles.length).toBeGreaterThan(0);
    for (const file of importedFiles) {
      expect(globalsCss).toContain(`still/tokens/${file}`);
    }
  });

  test('compat.css keeps the 4px-based spacing scale the components were laid out on', () => {
    const css = readFileSync(path.resolve(__dirname, 'compat.css'), 'utf-8');
    expect(css).toContain('--space-4: 1rem');
    expect(css).toContain('--surface: var(--surface-1)');
  });

  test('colors.css defines vivid priority hues for light and dark themes', () => {
    const css = readFileSync(path.join(stylesDir, 'tokens/colors.css'), 'utf-8');
    for (const name of ['red', 'yellow', 'blue', 'green']) {
      expect(css.match(new RegExp(`--prio-${name}:`, 'g'))?.length).toBe(2);
    }
  });
});
