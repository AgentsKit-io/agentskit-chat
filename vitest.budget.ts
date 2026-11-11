import { configDefaults } from 'vitest/config'

// CI_TEST_PROFILE=pr (set by the CI test stage on pull requests) skips *.slow.test.* files.
// No config sets testTimeout, so the 10 s cap on pull requests has no value to lower.
export const ciBudget = (exclude: string[] = []) => ({
  // Report tests slower than 2 s.
  slowTestThreshold: 2_000,
  exclude: [
    ...configDefaults.exclude,
    ...exclude,
    ...(process.env.CI_TEST_PROFILE === 'pr' ? ['**/*.slow.test.*'] : []),
  ],
})
