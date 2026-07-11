import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({ test: { environment: 'happy-dom', coverage: { provider: 'v8', reporter: ['text'], include: ['src/**/*.{ts,svelte}'] } }, plugins: [svelte(), svelteTesting()] })
