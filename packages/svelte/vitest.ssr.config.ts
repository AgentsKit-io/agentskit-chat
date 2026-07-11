import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

export default defineConfig({ test: { environment: 'node', include: ['tests/ssr.test.ts'] }, ssr: { noExternal: ['@agentskit/svelte'] }, plugins: [svelte()] })
