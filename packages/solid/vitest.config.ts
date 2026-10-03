import solidPlugin from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'
import { coverage } from '../../vitest.coverage'

export default defineConfig({ test: { environment: 'happy-dom', coverage }, plugins: [solidPlugin()] })
