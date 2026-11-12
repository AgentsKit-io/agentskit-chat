import { configDefaults } from 'vitest/config'

// CI_TEST_PROFILE=pr (set by the CI test stage on pull requests) skips *.slow.test.* files.
// Configs that set testTimeout cap it themselves on pull requests (Math.min(10_000, value)); the rest keep the default.
export const ciBudget = (exclude: string[] = []) => ({
  // Report tests slower than 2 s.
  slowTestThreshold: 2_000,
  exclude: [
    ...configDefaults.exclude,
    ...exclude,
    ...(process.env.CI_TEST_PROFILE === 'pr' ? ['**/*.slow.test.*'] : []),
  ],
})
