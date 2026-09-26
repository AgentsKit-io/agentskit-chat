import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const baseURL = process.env.CHAT_BASE_URL ?? 'http://localhost:3103'
const outputDir = path.resolve('../../.codex/verification/ui/chat-home')
await mkdir(outputDir, { recursive: true })

const results = []
const browser = await chromium.launch({ headless: true })

async function check(id, pass, details = {}) {
  results.push({ id, status: pass ? 'passed' : 'failed', ...details })
}

async function saveScreenshot(page, name, viewport) {
  const file = path.join(outputDir, `${name}.png`)
  const image = await page.screenshot({ path: file, fullPage: true, animations: 'disabled' })
  return { path: file, sha256: createHash('sha256').update(image).digest('hex'), viewport }
}

try {
  for (const { name, viewport, isMobile, hasTouch } of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 }, isMobile: false, hasTouch: false },
    { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  ]) {
    const context = await browser.newContext({ viewport, isMobile, hasTouch, colorScheme: 'dark', reducedMotion: 'no-preference' })
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const page = await context.newPage()
    const consoleErrors = []
    const requestFailures = []
    const badResponses = []
    page.on('pageerror', error => consoleErrors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
    page.on('requestfailed', request => requestFailures.push(`${request.url()}: ${request.failure()?.errorText}`))
    page.on('response', response => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`) })

    const startedAt = Date.now()
    const response = await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.locator('main.chat-marketing h1').waitFor()
    await page.waitForTimeout(700)
    await check(`${name}-home-loads`, response?.ok() && await page.getByRole('heading', { level: 1 }).count() === 1, { httpStatus: response?.status(), durationMs: Date.now() - startedAt })
    await check(`${name}-dark-default`, await page.locator('html').evaluate(el => el.classList.contains('dark')))
    await check(`${name}-home-shell-aurora`, await page.locator('agentskit-aurora').count() === 1 && await page.locator('agentskit-aurora').getAttribute('aria-hidden') === 'true')

    const hero = page.locator('main.chat-marketing > section').first()
    const heroActions = hero.getByRole('link', { name: 'Build the interface' })
    const heroReel = hero.locator('[data-kinetic-reel]')
    const [actionsBox, reelBox] = await Promise.all([heroActions.boundingBox(), heroReel.boundingBox()])
    await check(`${name}-framework-reel-follows-primary-cta`, Boolean(actionsBox && reelBox && (isMobile ? reelBox.y >= actionsBox.y : Math.abs((reelBox.y + reelBox.height / 2) - (actionsBox.y + actionsBox.height / 2)) < 12 && reelBox.x >= actionsBox.x + actionsBox.width && reelBox.x - (actionsBox.x + actionsBox.width) < 32)), { actionsBox, reelBox })
    await check(`${name}-see-every-surface-link-removed`, await hero.getByRole('link', { name: 'See every surface' }).count() === 0)
    await check(`${name}-hero-github-link-removed`, await hero.getByRole('link', { name: 'GitHub' }).count() === 0)
    await check(`${name}-architecture-outer-border-removed`, await page.locator('#surfaces').evaluate(element => {
      const style = getComputedStyle(element)
      return style.borderTopWidth === '0px' && style.borderBottomWidth === '0px'
    }))
    await check(`${name}-final-cta-outer-border-removed`, await page.locator('.chat-home-cta').evaluate(element => {
      const style = getComputedStyle(element)
      return style.borderTopWidth === '0px' && style.borderRightWidth === '0px' && style.borderBottomWidth === '0px' && style.borderLeftWidth === '0px'
    }))

    const reel = page.locator('[data-kinetic-reel]')
    const reelStart = await reel.getAttribute('data-current')
    await page.waitForFunction(initial => document.querySelector('[data-kinetic-reel]')?.getAttribute('data-current') !== initial, reelStart, { timeout: 7000 }).catch(() => undefined)
    const reelNext = await reel.getAttribute('data-current')
    await check(`${name}-framework-reel-rotates`, reelStart !== reelNext, { reelStart, reelNext })

    await page.waitForFunction(() => {
      const element = document.querySelector('agentskit-ecosystem')
      return Boolean(element?.shadowRoot?.querySelectorAll('[role="tab"]').length)
    }, undefined, { timeout: 12000 }).catch(() => undefined)
    const ecosystemProducts = await page.locator('agentskit-ecosystem').evaluate(element =>
      Array.from(element.shadowRoot?.querySelectorAll('[role="tab"] .akx-tab-name') ?? []).map(tab => tab.textContent?.trim()),
    )
    const ecosystemVisual = await page.locator('agentskit-ecosystem').getAttribute('data-visual')
    await check(`${name}-ecosystem-showcase-is-current-and-neutral`, ecosystemProducts.length === 6 && !ecosystemProducts.some(name => name?.includes('Playbook')) && ecosystemProducts.includes('Code Review') && ecosystemProducts.includes('Harness') && ecosystemVisual === 'agentskit-home', { ecosystemProducts, ecosystemVisual })

    const rendererShowcase = page.getByRole('tablist', { name: 'Chat renderer examples' })
    const rendererNames = ['React', 'Vue', 'Svelte', 'Solid', 'Angular', 'React Native', 'Ink']
    const rendererModules = ['react', 'vue', 'svelte', 'solid', 'angular', 'react-native', 'ink']
    await check(`${name}-all-renderer-examples-present`, await rendererShowcase.getByRole('tab').allTextContents().then(labels => rendererNames.every(label => labels.includes(label))), { rendererNames })
    for (const [index, label] of rendererNames.entries()) {
      await rendererShowcase.getByRole('tab', { name: label, exact: true }).click()
      const code = await page.locator('#renderer-example-panel pre code').innerText()
      await check(`${name}-renderer-example-${rendererModules[index]}`, code.includes(`@agentskit/chat/${rendererModules[index]}`), { renderer: label, code })
    }
    const solidTab = rendererShowcase.getByRole('tab', { name: 'Solid', exact: true })
    await solidTab.focus()
    await page.keyboard.press('Enter')
    await check(`${name}-renderer-example-keyboard`, await solidTab.getAttribute('aria-selected') === 'true' && (await page.locator('#renderer-example-panel pre code').innerText()).includes('@agentskit/chat/solid'))
    await page.getByRole('heading', { name: 'Ship the chat your product actually runs.' }).waitFor()
    await check(`${name}-impactful-cta-links`, await page.getByRole('link', { name: 'Build your chat' }).getAttribute('href') === '/docs/getting-started' && await page.getByRole('link', { name: 'CLI reference' }).getAttribute('href') === '/docs/cli')
    const shellFooter = page.locator('agentskit-footer')
    await check(`${name}-shell-footer`, await shellFooter.count() === 1 && await shellFooter.getAttribute('current') === 'agentskit-chat' && await shellFooter.getAttribute('repo') === 'AgentsKit-io/agentskit-chat')

    if (!isMobile) {
      await heroActions.hover()
      await page.waitForTimeout(220)
      await check('desktop-primary-cta-hover-lifts', await heroActions.evaluate(element => {
        const style = getComputedStyle(element)
        return style.transform !== 'none' || style.translate !== 'none'
      }))
    }

    const rendererTabs = page.getByRole('tablist', { name: 'Choose a renderer' })
    await rendererTabs.getByRole('tab', { name: 'Vue' }).click()
    const command = page.locator('.not-prose code')
    const selectedRenderer = await rendererTabs.getByRole('tab', { name: 'Vue' }).getAttribute('aria-selected')
    const commandText = (await command.innerText()).trim()
    await check(`${name}-renderer-selection`, commandText.includes('--renderer vue') && selectedRenderer === 'true', { selectedRenderer, commandText })
    await page.locator('.not-prose').getByRole('button', { name: 'Copy' }).click()
    const copiedCommand = await page.evaluate(() => navigator.clipboard.readText())
    await check(`${name}-install-command-copy`, copiedCommand === (await command.innerText()).trim())

    if (isMobile) {
      const menuButton = page.locator('button[aria-controls="product-navigation-menu"]')
      await menuButton.click()
      const menuVisible = await page.getByRole('navigation', { name: 'AgentsKit Chat mobile' }).isVisible()
      await check('mobile-product-navigation', menuVisible)
      if (menuVisible) await menuButton.click()
    }

    const demoTabs = page.getByRole('tablist', { name: 'Interactive agent demos' })
    const before = await demoTabs.getByRole('tab', { selected: true }).innerText()
    await page.getByRole('button', { name: 'Next demo' }).click()
    const after = await demoTabs.getByRole('tab', { selected: true }).innerText()
    await check(`${name}-chat-demo-controls`, before !== after)

    await page.keyboard.press('Tab')
    await check(`${name}-keyboard-focus-visible`, await page.evaluate(() => {
      const el = document.activeElement
      return el instanceof HTMLElement && (el.matches(':focus-visible') || el === document.body)
    }))
    await check(`${name}-no-horizontal-overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))

    const axe = await new AxeBuilder({ page })
      .include('main.chat-marketing')
      .include('header.product-header')
      .include('agentskit-footer')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    await check(`${name}-axe-accessibility`, axe.violations.length === 0, { violations: axe.violations.map(({ id, impact, description, nodes }) => ({ id, impact, description, count: nodes.length })) })

    await rendererTabs.getByRole('tab', { name: 'React', exact: true }).click()
    await rendererShowcase.getByRole('tab', { name: 'React', exact: true }).click()
    await demoTabs.getByRole('tab', { name: 'weather' }).click()
    await page.waitForTimeout(4500)
    const screenshot = await saveScreenshot(page, name, viewport)
    await check(`${name}-browser-errors`, consoleErrors.length === 0 && requestFailures.length === 0 && badResponses.length === 0, { consoleErrors, requestFailures, badResponses, screenshot })
    if (results.at(-1)?.id !== `${name}-browser-errors`) results.push({ id: `${name}-screenshot`, status: 'passed', screenshot })
    else results.at(-1).screenshot = screenshot

    if (!isMobile) {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await rendererShowcase.getByRole('tab', { name: 'Vue', exact: true }).click()
      await check('reduced-motion-disables-code-transition', await page.locator('#renderer-example-panel').evaluate(el => getComputedStyle(el).animationName === 'none'))
      const reducedReelStart = await reel.getAttribute('data-current')
      await page.waitForTimeout(2300)
      await check('reduced-motion-stops-framework-reel', await reel.getAttribute('data-current') === reducedReelStart, { reducedReelStart, reducedReelEnd: await reel.getAttribute('data-current') })
    }
    await context.close()
  }
  const docsPage = await (await browser.newContext()).newPage()
  const docsResponse = await docsPage.goto(`${baseURL}/docs`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null)
  await check('docs-remain-calm', docsResponse?.ok() === true && await docsPage.locator('agentskit-aurora').count() === 0 && await docsPage.locator('main.chat-marketing').count() === 0, { httpStatus: docsResponse?.status() ?? null, reason: docsResponse ? undefined : 'Internal docs route did not return before browser timeout.' })
} catch (error) {
  results.push({ id: 'browser-run', status: 'failed', error: error instanceof Error ? error.message : String(error) })
} finally {
  await browser.close()
}

const report = { status: results.every(item => item.status === 'passed') ? 'passed' : 'failed', baseURL, criteria: results }
await writeFile(path.join(outputDir, 'result.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
if (report.status !== 'passed') process.exitCode = 1
