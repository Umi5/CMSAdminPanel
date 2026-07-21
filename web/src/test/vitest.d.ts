import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

// This file is required to make the jest-dom matchers available in Vitest tests.
declare module "@vitest/expect" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends TestingLibraryMatchers<any, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<
    any,
    any
  > {}
}
