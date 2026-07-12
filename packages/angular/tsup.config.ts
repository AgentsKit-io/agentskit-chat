import { defineConfig } from 'tsup'

export default defineConfig({ entry: { index: 'src/index.ts' }, format: ['esm', 'cjs'], external: ['@angular/core', '@angular/common', 'rxjs', '@agentskit/angular'], dts: true, clean: true })
