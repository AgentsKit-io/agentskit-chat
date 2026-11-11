import { defineConfig } from 'vitest/config'
import { ciBudget } from '../../vitest.budget'
import { coverage } from '../../vitest.coverage'

export default defineConfig({ test: { environment: 'happy-dom', setupFiles: ['./tests/setup.ts'], coverage, ...ciBudget() } })
