import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { join, relative } from 'node:path'

const exec = promisify(execFile)
const root = process.cwd()
const outputDir = join(root, '.codex', 'verification', 'docs-ui')
const testResultsDir = join(root, 'apps', 'docs', 'test-results')
rmSync(outputDir, { recursive: true, force: true })
mkdirSync(outputDir, { recursive: true })

const result = { status: 'failed', capability: 'real-browser', artifacts: [], criteria: { 'docs-ui': { status: 'failed' } }, failures: [] }
try {
  await exec('pnpm', ['--filter', '@agentskit/chat-docs', 'test:e2e'], { cwd: root, env: { ...process.env, CI: process.env.CI ?? '1' }, maxBuffer: 20 * 1024 * 1024 })
  const screenshots = []
  const visit = (directory) => {
    if (!existsSync(directory)) return
    for (const name of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, name.name)
      if (name.isDirectory()) visit(path)
      else if (name.name === 'final.png') screenshots.push(path)
    }
  }
  visit(testResultsDir)
  for (const [index, path] of screenshots.slice(0, 4).entries()) {
    const target = join(outputDir, `docs-${index + 1}.png`)
    cpSync(path, target)
    result.artifacts.push({ type: 'screenshot', path: relative(root, target), sha256: createHash('sha256').update(readFileSync(target)).digest('hex'), viewport: '1280x720', theme: 'default' })
  }
  if (!result.artifacts.length) throw new Error('E2E passed without screenshot artifacts')
  result.status = 'pending-human-review'
  result.criteria['docs-ui'].status = 'passed'
} catch (error) {
  result.failures.push(error instanceof Error ? error.message : String(error))
}
writeFileSync(join(outputDir, 'result.json'), `${JSON.stringify(result)}\n`)
console.log(JSON.stringify(result))
if (result.status === 'failed') process.exitCode = 1
