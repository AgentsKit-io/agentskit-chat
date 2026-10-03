import { defineConfig } from 'vitest/config'
import { coverage } from '../../vitest.coverage'

export default defineConfig({ test: { environment: 'happy-dom', setupFiles: ['./tests/setup.ts'], coverage } })
