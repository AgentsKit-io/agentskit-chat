import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, it } from 'vitest'

it('publishes partial-Ivy declarations for AOT consumers', async () => {
  const output = await readFile(join(process.cwd(), 'dist/fesm2022/agentskit-chat-angular.mjs'), 'utf8')
  expect(output).toContain('ɵɵngDeclareComponent')
  expect(output).not.toContain('__decorateClass')
  const manifest = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8')) as { types: string, exports: { '.': { types: string } } }
  expect(manifest.exports['.'].types).toBe(manifest.types)
  await expect(access(join(process.cwd(), manifest.types))).resolves.toBeUndefined()
})
