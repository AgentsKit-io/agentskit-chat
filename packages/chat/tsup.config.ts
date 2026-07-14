import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    protocol: '../protocol/src/index.ts',
    'protocol-fixtures': '../protocol/src/fixtures.ts',
    server: '../server/src/index.ts',
    devtools: '../devtools/src/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  noExternal: ['@agentskit/chat/protocol'],
})
