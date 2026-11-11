import { defineConfig } from 'vitest/config'

// PTY tests wait up to 5-10 s for terminal output; the 5 s default timeout fires first on loaded CI runners.
export default defineConfig({ test: { testTimeout: 30_000 } })
