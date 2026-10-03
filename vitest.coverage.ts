import { basename } from 'node:path'
import { defineConfig } from 'vitest/config'

type CoverageFloor = { statements: number; branches: number; functions: number; lines: number }

const floors: Record<string, CoverageFloor> = {
  angular: { statements: 58, branches: 53, functions: 50, lines: 79 },
  chat: { statements: 87, branches: 74, functions: 87, lines: 92 },
  cli: { statements: 65, branches: 70, functions: 75, lines: 67 },
  devtools: { statements: 96, branches: 90, functions: 100, lines: 100 },
  ink: { statements: 81, branches: 65, functions: 82, lines: 88 },
  protocol: { statements: 92, branches: 86, functions: 93, lines: 94 },
  'react-native': { statements: 74, branches: 70, functions: 62, lines: 83 },
  react: { statements: 83, branches: 76, functions: 71, lines: 93 },
  server: { statements: 93, branches: 88, functions: 86, lines: 98 },
  solid: { statements: 81, branches: 71, functions: 82, lines: 86 },
  svelte: { statements: 82, branches: 67, functions: 74, lines: 86 },
  vue: { statements: 74, branches: 68, functions: 67, lines: 83 },
}

const packageName = basename(process.cwd())
const thresholds = floors[packageName]

if (!thresholds) throw new Error(`No coverage floors configured for ${packageName}`)

const coverage = {
  provider: 'v8' as const,
  reporter: ['text'] as ['text'],
  include: ['src/**/*.{ts,tsx,svelte}'],
  thresholds,
}

export { coverage }

export default defineConfig({ root: process.cwd(), test: { coverage } })
