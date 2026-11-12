import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'
import { defineConfig } from 'vitest/config'
import { ciBudget } from '../../vitest.budget'
import { coverage } from '../../vitest.coverage'

export default defineConfig({ test: { environment: 'happy-dom', include: ['tests/{agent-chat,protocol-conformance}.test.ts'], coverage, ...ciBudget() }, plugins: [svelte(), svelteTesting()] })
