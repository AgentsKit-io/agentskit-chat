import { defineConfig } from 'tsup'
import { solidPlugin } from 'esbuild-plugin-solid'

export default defineConfig({ entry: { index: 'src/index.tsx' }, format: ['esm', 'cjs'], external: ['solid-js', 'solid-js/store', 'solid-js/web', '@agentskit/solid'], esbuildPlugins: [solidPlugin()], dts: true, clean: true })
