import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'
import { ciBudget } from '../../vitest.budget'

export default defineConfig({ test: { environment: 'node', include: ['tests/ssr.test.ts'], ...ciBudget() }, ssr: { noExternal: ['@agentskit/svelte'] }, plugins: [svelte()] })
