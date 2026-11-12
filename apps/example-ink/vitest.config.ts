import { defineConfig } from 'vitest/config'
import { ciBudget } from '../../vitest.budget'

// PTY tests wait up to 5-10 s for terminal output; the 5 s default timeout fires first on loaded CI runners.
// Exception to the 10 s pull-request cap: the PTY tests need the full 30 s even on PRs (see .factory/pr-notes.md).
export default defineConfig({ test: { testTimeout: 30_000, ...ciBudget() } })
