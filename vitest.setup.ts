import '@testing-library/jest-dom/vitest';
import 'dotenv/config';
import bcrypt from 'bcryptjs';

process.env.SESSION_SECRET ??= 'test-session-secret-please-do-not-use-in-prod';
process.env.AUTH_EMAIL ??= 'owner@example.com';
// Low cost factor (4) keeps the test suite fast; never use this factor in production.
process.env.AUTH_PASSWORD_HASH ??= bcrypt.hashSync('correct-password', 4);
