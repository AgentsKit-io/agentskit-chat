import { defineConfig } from 'drizzle-kit'

/** Generates the shipped `drizzle/` migrations from the session and decision tables. */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/drizzle-pg.ts',
  out: './drizzle',
})
