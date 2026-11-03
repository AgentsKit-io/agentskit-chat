import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { include: ['tests/storage-pg/node.test.ts', 'tests/storage-pg/workerd.test.ts', 'tests/storage-pg/migration.test.ts'] } })
