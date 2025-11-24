import { beforeAll, afterAll, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

beforeAll(async () => {
  // Global test setup
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Global test teardown
});

beforeEach(() => {
  // Reset before each test
});
