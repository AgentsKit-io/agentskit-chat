import { defineConfig } from 'tsup'
import packageJson from './package.json'

export default defineConfig({
  entry: { index: 'src/index.ts', bin: 'src/bin.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
  define: { __CLI_VERSION__: JSON.stringify(packageJson.version) },
})
