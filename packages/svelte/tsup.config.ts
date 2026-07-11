import { defineConfig } from 'tsup'
import esbuildSvelte from 'esbuild-svelte'

export default defineConfig({ entry: { index: 'src/index.ts' }, format: ['esm', 'cjs'], external: ['svelte', 'svelte/store', 'svelte/internal', '@agentskit/svelte'], esbuildPlugins: [esbuildSvelte()], dts: true, clean: true })
