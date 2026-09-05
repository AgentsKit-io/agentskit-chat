import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { createRequire } from 'node:module'

const mode = process.argv[2] ?? 'browser'
const root = process.cwd()
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim()
const sourceFiles = spawnSync('git', ['ls-files', '-co', '--exclude-standard', 'apps/docs', 'docs/examples', 'docs/architecture/adrs/0034-observability-recording-demo.md', 'scripts/observability-check.mjs', '.codex/verification.json'], { encoding: 'utf8' }).stdout.trim().split('\n').filter(Boolean)
const sourceHash = createHash('sha256')
for (const file of [...new Set(sourceFiles)].sort()) sourceHash.update(file).update(readFileSync(file))
const configurationHash = createHash('sha256').update(readFileSync('.codex/verification.json')).digest('hex')
const runId = `observability-${mode}-${Date.now()}`
const output = resolve('.codex/verification/observability', runId)
mkdirSync(output, { recursive: true })
const result = { runId, revision, sourceHash: sourceHash.digest('hex'), configurationHash, status: 'failed', ...(mode === 'integration' ? {} : { capability: 'real-browser' }), capabilities: mode === 'integration' ? [] : ['real-browser', 'screenshot'], criteria: {}, artifacts: [], failures: [] }
const requireDocs = createRequire(resolve('apps/docs/package.json'))
const criterionIds = mode === 'remote' ? ['demo-remote'] : mode === 'integration' ? ['demo-behavior', 'demo-source'] : ['demo-behavior', 'demo-visual']
try {
  if (mode === 'integration') {
    const run = spawnSync(resolve('apps/docs/node_modules/.bin/vitest'), ['run', 'lib/observability-demo.test.ts', '--coverage', '--coverage.include=lib/observability-demo.ts', '--coverage.thresholds.lines=80'], { cwd: resolve('apps/docs'), encoding: 'utf8' })
    writeFileSync(resolve(output, 'tests.log'), run.stdout + run.stderr)
    if (run.status !== 0) throw new Error(run.stdout + run.stderr)
    const doc = readFileSync('docs/examples/agent-observability.mdx', 'utf8')
    for (const term of ['createInvestigation', 'adapter:', 'Approve', 'No live LLM']) if (!doc.includes(term)) throw new Error(`Missing documentation: ${term}`)
  } else {
    const baseURL = mode === 'remote' ? process.env.OBSERVABILITY_REMOTE_URL : process.env.OBSERVABILITY_BASE_URL ?? 'http://127.0.0.1:4190'
    if (!baseURL) throw new Error('OBSERVABILITY_REMOTE_URL is required; remote validation cannot be replaced with local evidence')
    const { chromium } = requireDocs('@playwright/test')
    const AxeBuilder = requireDocs('@axe-core/playwright').default
    const browser = await chromium.launch({ headless: true })
    try {
      const context = await browser.newContext({ acceptDownloads: true })
      const page = await context.newPage()
      page.on('pageerror', error => result.failures.push(error.message))
      page.on('console', message => { if (message.type() === 'error') result.failures.push(message.text()) })
      page.on('response', response => { if (response.status() >= 400) result.failures.push(`HTTP ${response.status()}: ${response.url()}`) })
      page.on('requestfailed', request => result.failures.push(`Network failure: ${request.method()} ${request.url()} ${request.failure()?.errorText}`))
      const shot = async (name) => {
        const path = resolve(output, `${name}.png`)
        await page.screenshot({ path, fullPage: true })
        const viewport = page.viewportSize()
        result.artifacts.push({ type: 'screenshot', path: relative(root, path), sha256: createHash('sha256').update(readFileSync(path)).digest('hex'), viewport: `${viewport.width}x${viewport.height}`, url: page.url() })
      }
      const assert = (condition, message) => { if (!condition) throw new Error(message) }
      const cleanLayout = async () => {
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Horizontal page overflow')
        const audit = await new AxeBuilder({ page }).include('[data-observability-demo]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
        if (audit.violations.length) await shot('accessibility-failure')
        assert(audit.violations.length === 0, JSON.stringify(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))))
      }
      await page.setViewportSize({ width: 1440, height: 1000 })
      await page.goto(`${baseURL}/demo/agent-observability`, { waitUntil: 'networkidle' })
      await page.getByRole('heading', { name: 'Don’t trust the answer.' }).waitFor()
      await cleanLayout(); await shot('ready')
      const providerRequests = []
      page.on('request', request => { if (/openai|anthropic|openrouter|\/api\/(ask|demo-ask)/.test(request.url())) providerRequests.push(request.url()) })
      await page.getByRole('combobox').selectOption('30')
      for (const path of ['Scripted agent', 'Deterministic runbook']) {
        await page.getByRole('button', { name: path, exact: true }).click()
        await page.getByRole('button', { name: 'Run investigation' }).click()
        await page.getByRole('heading', { name: 'Approve simulated rollback' }).waitFor()
        assert(await page.locator('[data-ak-tool-confirmation]').count() === 1, 'Missing native AgentsKit confirmation')
        await page.getByRole('button', { name: 'Failures (2)' }).click()
        await page.locator('ol button').first().click()
        assert((await page.getByLabel('Event evidence').innerText()).includes('TIMEOUT'), 'Cannot inspect evidence while approval is pending')
        await page.getByRole('button', { name: 'Follow latest' }).click()
        await page.getByRole('button', { name: 'Show all' }).click()
        await cleanLayout(); await shot(path === 'Scripted agent' ? 'approval' : 'runbook-approval')
        if (path === 'Scripted agent') {
          await page.setViewportSize({ width: 375, height: 1000 })
          await cleanLayout(); await shot('mobile-approval')
          await page.setViewportSize({ width: 1920, height: 1080 })
          await page.getByRole('button', { name: 'Focus mode', exact: true }).click()
          await cleanLayout(); await shot('recording-approval')
          await page.keyboard.press('Escape')
          await page.setViewportSize({ width: 1440, height: 1000 })
        }
        await page.getByRole('button', { name: 'Approve', exact: true }).focus()
        await page.keyboard.press('Enter')
        await page.getByRole('heading', { name: 'Recovered. With proof.' }).waitFor()
        await page.getByRole('button', { name: 'Failures (2)' }).click()
        assert(await page.locator('ol button').count() === 2, 'Timeout attempts not retained')
        await page.locator('ol button').first().click()
        assert((await page.getByLabel('Event evidence').innerText()).includes('TIMEOUT'), 'Inspector not showing failure evidence')
        await page.getByRole('button', { name: 'Follow latest' }).click()
        await page.getByRole('button', { name: 'Show all' }).click()
        await shot(path === 'Scripted agent' ? 'recovered' : 'runbook-recovered')
      }
      assert(providerRequests.length === 0, 'Unexpected provider request')
      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Export JSON' }).click()
      const download = await downloadPromise
      const downloadPath = resolve(output, 'trace.json'); await download.saveAs(downloadPath)
      const trace = JSON.parse(readFileSync(downloadPath, 'utf8'))
      assert(trace.modelTokens === null && trace.status === 'recovered', 'Incorrect exported trace')
      await page.getByRole('button', { name: 'Replay investigation' }).click()
      await page.getByRole('heading', { name: 'Approve simulated rollback' }).waitFor()
      await page.getByRole('button', { name: 'Deny', exact: true }).click()
      await page.getByText('Safely escalated', { exact: true }).waitFor()
      await shot('denied')
      await page.getByRole('button', { name: 'Reset', exact: true }).click()
      await page.getByRole('combobox').selectOption('1400')
      await page.getByRole('button', { name: 'Run investigation' }).click()
      await page.getByRole('button', { name: 'Pause', exact: true }).click()
      await page.getByText('PAUSED FOR NARRATION', { exact: true }).waitFor()
      const pausedCount = await page.locator('ol button').count()
      await page.waitForTimeout(1700)
      assert(await page.locator('ol button').count() === pausedCount, 'Execution advanced while paused')
      await page.getByRole('button', { name: 'Resume', exact: true }).click()
      await page.waitForFunction(count => document.querySelectorAll('ol button').length > count, pausedCount)
      await page.getByRole('button', { name: 'Reset', exact: true }).click()
      await page.getByText('Ready to investigate', { exact: true }).waitFor()
      for (const width of [375, 768, 1280, 1440, 1920]) {
        await page.setViewportSize({ width, height: width === 1920 ? 1080 : 1000 })
        await cleanLayout(); await shot(`responsive-${width}`)
      }
      await page.getByRole('button', { name: 'Use light theme' }).click(); await cleanLayout(); await shot('light')
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.getByRole('button', { name: 'Focus mode', exact: true }).click()
      await cleanLayout(); await shot('focus')
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Focus mode', exact: true }).waitFor()
      await page.keyboard.press('Tab')
      assert(await page.evaluate(() => document.activeElement !== document.body), 'Keyboard focus missing')
      await page.getByRole('button', { name: 'Compare execution paths' }).click()
      await page.getByRole('heading', { name: 'Same evidence. Different control flow.' }).waitFor()
      await cleanLayout(); await shot('comparison')
      if (result.failures.length) throw new Error(result.failures.join('\n'))
    } finally { await browser.close() }
  }
  result.status = 'passed'
} catch (error) { result.failures.push(error instanceof Error ? error.message : String(error)) }
result.criteria = Object.fromEntries(criterionIds.map(id => [id, { status: result.status }]))
writeFileSync(resolve(output, 'result.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result))
if (result.status !== 'passed') process.exitCode = 1
