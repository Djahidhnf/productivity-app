import '@testing-library/jest-dom/vitest';
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// vitest.config.ts sets `globals: false`, so @testing-library/react's
// automatic afterEach cleanup (which only registers when it finds a
// global `afterEach`) never runs on its own. Register it explicitly so
// each test's rendered DOM is torn down before the next one runs.
afterEach(() => {
  cleanup();
});

// Always use fixed, known values for these — never the developer's real
// .env secrets. Tests assert against specific credentials/tokens, and a
// real AUTH_PASSWORD_HASH (which is full of literal `$`-delimited
// segments) would otherwise flow in from `dotenv/config` above and
// silently break every test that expects the 'correct-password' fixture.
process.env.SESSION_SECRET = 'test-session-secret-please-do-not-use-in-prod';
process.env.AUTH_EMAIL = 'owner@example.com';
// Low cost factor (4) keeps the test suite fast; never use this factor in production.
process.env.AUTH_PASSWORD_HASH = bcrypt.hashSync('correct-password', 4);
// The second account is opt-in per test; never pick it up from a real .env.
delete process.env.AUTH_EMAIL_2;
delete process.env.AUTH_PASSWORD_HASH_2;
