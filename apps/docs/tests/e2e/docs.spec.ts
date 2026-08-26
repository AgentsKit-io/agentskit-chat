import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const askMode = process.env.DOCS_ASK_MODE?.trim() || 'unconfigured'

const deterministicCases = [
  ['hi', /I know when not to guess/],
  ['how can I call you?', 'Call me AgentsKit Chat.'],
  ['toggle the mode', 'Theme toggled locally. No model call required.'],
  ['what day is today', 'Resolved without a model call.'],
] as const

for (const [prompt, expected] of deterministicCases) {
  test(`answers ${prompt} locally without an API request`, async ({ page }) => {
    let backendCalls = 0
    page.on('request', request => {
      if (new URL(request.url()).pathname === '/api/demo-ask') backendCalls += 1
    })
    await page.goto('/demo/deterministic-chat')
    const input = page.getByPlaceholder('Try a suggestion or ask anything…')
    await input.fill(prompt)
    await input.press('Enter')
    await expect(page.getByText(expected)).toBeVisible()
    expect(backendCalls).toBe(0)
  })
}

test('navigates the canonical docs and answers a known question locally', async ({ page }) => {
  await page.goto('/docs/getting-started/react')
  await expect(page.getByRole('heading', { name: 'React quick start' }).first()).toBeVisible()
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('pre')
    .exclude('code')
    .exclude('.text-ak-blue')
    .disableRules(['color-contrast', 'link-in-text-block'])
    .analyze()
  expect(accessibility.violations).toEqual([])
  await page.getByRole('button', { name: 'Ask the docs' }).click()
  const assistant = page.getByRole('complementary', { name: 'AgentsKit Chat documentation assistant' })
  const input = assistant.getByPlaceholder('Ask about AgentsKit Chat…')
  await input.fill('Which clients are supported?')
  await assistant.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(assistant.getByText(/React, React Native, Svelte, Vue, Angular, Solid, and Ink/)).toBeVisible()
  await expect(assistant.getByRole('heading', { name: 'Sources' })).toBeVisible()
  await assistant.getByRole('link', { name: 'Release compatibility' }).click()
  await expect(page).toHaveURL(/\/docs\/releases\/compatibility$/)
})

test('shows deterministic answers, custom date UI, and the mode switch', async ({ page }) => {
  await page.goto('/docs/examples/deterministic-chat')
  await page.getByRole('link', { name: 'Open the live demo →' }).click()
  const demo = page
  const accessibility = await new AxeBuilder({ page })
    .include('[data-demo-shell]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(accessibility.violations).toEqual([])
  const chat = demo.locator('[data-ak-app-chat]')
  await expect(demo.getByRole('heading', { name: 'Know when not to guess.' })).toBeVisible()
  const fullscreen = demo.getByRole('button', { name: 'Open demo in fullscreen' })
  await fullscreen.click()
  await expect(demo.locator('[data-demo-shell]')).toHaveClass(/is-fullscreen/)
  await demo.getByRole('button', { name: 'Exit demo fullscreen' }).click()
  await expect(demo.locator('[data-demo-shell]')).not.toHaveClass(/is-fullscreen/)
  const suggestions = demo.locator('.demo-autocomplete')
  const suggestionLayout = await suggestions.evaluate(element => {
    const buttons = [...element.querySelectorAll('button')]
    const first = buttons[0]?.getBoundingClientRect()
    const container = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return first === undefined ? undefined : {
      leftGap: first.left - container.left - Number.parseFloat(style.paddingLeft),
      alignItems: style.alignItems,
      paddingBottom: Number.parseFloat(style.paddingBottom),
    }
  })
  expect(suggestionLayout).toEqual(expect.objectContaining({ alignItems: 'center' }))
  expect(suggestionLayout?.leftGap).toBeLessThan(12)
  expect(suggestionLayout?.paddingBottom).toBeGreaterThanOrEqual(10)
  const input = demo.getByPlaceholder('Try a suggestion or ask anything…')
  const send = demo.getByRole('button', { name: 'Send', exact: true })

  await input.fill('hi')
  await send.click()
  await expect(demo.getByText(/I know when not to guess/)).toBeVisible()
  await expect(demo.getByText('LOCAL · deterministic')).toBeVisible()
  await expect(demo.getByRole('button', { name: 'Edit last message' })).toHaveCount(0)

  await input.fill('toggle the mode')
  await send.click()
  await expect(demo.locator('[data-demo-shell]')).toHaveClass(/is-light/)
  await expect(demo.getByText('Theme toggled locally. No model call required.')).toBeVisible()
  const lightAccessibility = await new AxeBuilder({ page })
    .include('[data-demo-shell]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(lightAccessibility.violations).toEqual([])

  await input.fill('what day is today')
  await send.click()
  await expect(demo.locator('[data-demo-date-card]')).toBeVisible()
  await expect(demo.getByText('Resolved without a model call.')).toBeVisible()

  const stableHeight = await chat.evaluate(element => element.getBoundingClientRect().height)
  await page.route('**/api/demo-ask**', async route => route.fulfill({
    status: 200,
    contentType: 'application/x-ndjson',
    body: '{"type":"text","delta":"Backend fallback confirmed."}\n{"type":"done","model":"test-fallback"}\n',
  }))
  await input.fill('unknown fallback prompt')
  await send.click()
  await expect(demo.getByText('Backend fallback confirmed.')).toBeVisible()
  await expect(demo.getByText('AI · OpenRouter')).toBeVisible()
  await expect.poll(() => chat.evaluate(element => element.getBoundingClientRect().height)).toBe(stableHeight)

  await page.unroute('**/api/demo-ask**')
  await page.route('**/api/demo-ask**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'demo unavailable' }) }))
  await input.fill('unknown fallback prompt')
  await send.click()
  await expect(chat.getByRole('alert')).toContainText('Ask request failed (503).')
  await expect(chat.locator('[data-ak-message][data-ak-role="assistant"][data-ak-status="error"]')).toHaveCount(0)
  await expect.poll(() => chat.evaluate(element => element.getBoundingClientRect().height)).toBe(stableHeight)
})

test('shows five selectable prompts in Deterministic and four in AI mode', async ({ page }) => {
  await page.goto('/demo/deterministic-chat')
  const suggestions = page.locator('[aria-label="Prompt suggestions"]')
  await expect(suggestions.getByRole('button')).toHaveCount(5)
  await expect(suggestions.getByRole('button', { name: 'Surprise me' })).toBeVisible()
  await page.getByRole('button', { name: 'AI', exact: true }).click()
  await expect(suggestions.getByRole('button')).toHaveCount(4)
  await expect(suggestions.getByRole('button', { name: 'Surprise me' })).toHaveCount(0)
})

test('uses Surprise me to demonstrate deterministic escalation with a live caption', async ({ page }) => {
  await page.route('**/api/demo-ask**', route => route.fulfill({
    status: 200,
    contentType: 'application/x-ndjson',
    body: '{"type":"text","delta":"The model handled the surprise."}\n{"type":"done","model":"test-caption"}\n',
  }))
  await page.goto('/demo/deterministic-chat')
  const demo = page
  const guide = demo.locator('[data-demo-guide]')
  await expect(guide).toContainText('Pick a known prompt')
  await demo.getByRole('button', { name: 'Surprise me' }).click()
  await expect(demo.getByPlaceholder('Try a suggestion or ask anything…')).toHaveValue('Surprise me')
  await demo.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(demo.getByText('The model handled the surprise.')).toBeVisible()
  await expect(guide).toContainText('Escalated to AI')
  await expect(guide).toContainText('No local rule matched')
})

test('keeps suggestion and response controls left-aligned, vertically centered, and padded', async ({ page }) => {
  await page.goto('/demo/deterministic-chat')
  const demo = page
  const input = demo.getByPlaceholder('Try a suggestion or ask anything…')
  const suggestions = demo.locator('.demo-autocomplete')
  await input.fill('today')
  await expect(suggestions.getByRole('button')).toHaveCount(1)
  await suggestions.getByRole('button', { name: 'what day is today' }).click()
  await expect(input).toHaveValue('what day is today')
  await input.press('Enter')
  await expect(demo.locator('[data-demo-date-card]')).toBeVisible()

  const layout = await demo.locator('[data-ak-app-chat]').evaluate(element => {
    const autocomplete = element.querySelector('.demo-autocomplete')
    const actions = element.querySelector('[aria-label="Response actions"]')
    if (!(autocomplete instanceof HTMLElement) || !(actions instanceof HTMLElement)) return undefined
    const firstSuggestion = autocomplete.querySelector('button')?.getBoundingClientRect()
    const autocompleteBox = autocomplete.getBoundingClientRect()
    const suggestionStyle = getComputedStyle(autocomplete)
    const actionStyle = getComputedStyle(actions)
    return {
      suggestionLeftGap: firstSuggestion === undefined ? undefined : firstSuggestion.left - autocompleteBox.left - Number.parseFloat(suggestionStyle.paddingLeft),
      suggestionAlignItems: suggestionStyle.alignItems,
      suggestionPaddingBottom: Number.parseFloat(suggestionStyle.paddingBottom),
      actionAlignItems: actionStyle.alignItems,
      actionPaddingTop: Number.parseFloat(actionStyle.paddingTop),
      actionPaddingBottom: Number.parseFloat(actionStyle.paddingBottom),
    }
  })
  expect(layout).toEqual(expect.objectContaining({ suggestionAlignItems: 'center', actionAlignItems: 'center' }))
  expect(layout?.suggestionLeftGap).toBeLessThan(12)
  expect(layout?.suggestionPaddingBottom).toBeGreaterThanOrEqual(10)
  expect(layout?.actionPaddingTop).toBeGreaterThanOrEqual(8)
  expect(layout?.actionPaddingBottom).toBeGreaterThanOrEqual(10)
  await expect(demo.getByRole('button', { name: 'Retry response' })).toBeVisible()
  await expect(demo.getByRole('button', { name: 'Regenerate response' })).toBeVisible()
  await expect(demo.getByRole('button', { name: 'Edit last message' })).toHaveCount(0)
})

test('renders AI markdown responses as readable structured content', async ({ page }) => {
  await page.route('**/api/demo-ask**', route => route.fulfill({
    status: 200,
    contentType: 'application/x-ndjson',
    body: '{"type":"text","delta":"I\\u0027m not sure which mode you\\u0027d like me to toggle.\\n\\n- **Tone/style** (e.g., more formal vs. casual)\\n- **Response format** (e.g., concise vs. detailed answers)"}\n{"type":"done","model":"test-markdown"}\n',
  }))
  await page.goto('/demo/deterministic-chat')
  const demo = page
  await demo.getByRole('button', { name: 'AI', exact: true }).click()
  await demo.getByPlaceholder('Ask the free model anything…').fill('toggle mode')
  await demo.getByRole('button', { name: 'Send', exact: true }).click()
  const markdown = demo.locator('[data-demo-markdown]')
  await expect(markdown).toBeVisible()
  await expect(markdown.locator('strong').first()).toHaveText('Tone/style')
  await expect(markdown.locator('ul > li')).toHaveCount(2)
  await expect(markdown.locator('ul > li').nth(1)).toContainText('Response format')
  await expect(markdown.locator('p')).toContainText("I'm not sure")
})

test('retries and regenerates the latest response through the lifecycle actions', async ({ page }) => {
  let attempts = 0
  await page.route('**/api/demo-ask**', route => {
    attempts += 1
    return route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: `${JSON.stringify({ type: 'text', delta: `Attempt ${attempts}` })}\n${JSON.stringify({ type: 'done', model: 'test-lifecycle' })}\n`,
    })
  })
  await page.goto('/demo/deterministic-chat')
  const demo = page
  await demo.getByPlaceholder('Try a suggestion or ask anything…').fill('unknown lifecycle prompt')
  await demo.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(demo.getByText('Attempt 1')).toBeVisible()
  await demo.getByRole('button', { name: 'Retry response' }).click()
  await expect(demo.getByText('Attempt 2')).toBeVisible()
  await demo.getByRole('button', { name: 'Regenerate response' }).click()
  await expect(demo.getByText('Attempt 3')).toBeVisible()
  expect(attempts).toBe(3)
})

test('recovers from a backend error when retry succeeds', async ({ page }) => {
  let attempts = 0
  await page.route('**/api/demo-ask**', route => {
    attempts += 1
    if (attempts === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"temporary"}' })
    return route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: '{"type":"text","delta":"Recovered after retry."}\n{"type":"done","model":"test-recovery"}\n',
    })
  })
  await page.goto('/demo/deterministic-chat')
  const demo = page
  const chat = demo.locator('[data-ak-app-chat]')
  await demo.getByPlaceholder('Try a suggestion or ask anything…').fill('temporary backend failure')
  await demo.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(chat.getByRole('alert')).toContainText('Ask request failed (503).')
  await demo.getByRole('button', { name: 'Retry response' }).click()
  await expect(demo.getByText('Recovered after retry.')).toBeVisible()
  await expect(chat.getByRole('alert')).toHaveCount(0)
})

test('keeps the chat scrolled to the newest content for long responses', async ({ page }) => {
  const longResponse = Array.from({ length: 48 }, (_, index) => `Line ${index + 1}`).join('\n')
  await page.route('**/api/demo-ask**', route => route.fulfill({
    status: 200,
    contentType: 'application/x-ndjson',
    body: `${JSON.stringify({ type: 'text', delta: longResponse })}\n{"type":"done","model":"test-scroll"}\n`,
  }))
  await page.goto('/demo/deterministic-chat')
  const demo = page
  const container = demo.locator('[data-ak-chat-container]')
  await demo.getByPlaceholder('Try a suggestion or ask anything…').fill('long response')
  await demo.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(demo.getByText('Line 48')).toBeVisible()
  await expect.poll(() => container.evaluate(element => element.scrollTop + element.clientHeight >= element.scrollHeight - 4)).toBe(true)
})

test('shows the loading state and disables input while an AI response streams', async ({ page }) => {
  await page.route('**/api/demo-ask**', async route => {
    await new Promise(resolve => setTimeout(resolve, 500))
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: '{"type":"text","delta":"Stream complete."}\n{"type":"done","model":"test-stream"}\n',
    })
  })
  await page.goto('/demo/deterministic-chat')
  const demo = page
  const input = demo.getByPlaceholder('Ask the free model anything…')
  await demo.getByRole('button', { name: 'AI', exact: true }).click()
  await input.fill('slow response')
  await demo.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(demo.getByText('routing the request')).toBeVisible()
  await expect(input).toBeDisabled()
  await expect(demo.getByText('Stream complete.')).toBeVisible()
  await expect(input).toBeEnabled()
})

test('locks and restores document scrolling when fullscreen is toggled', async ({ page }) => {
  await page.goto('/demo/deterministic-chat')
  const demo = page
  const fullscreen = demo.getByRole('button', { name: 'Open demo in fullscreen' })
  const initialOverflow = await page.locator('body').evaluate(element => getComputedStyle(element).overflow)
  await fullscreen.click()
  await expect(demo.locator('[data-demo-shell]')).toHaveClass(/is-fullscreen/)
  await expect.poll(() => page.locator('body').evaluate(element => getComputedStyle(element).overflow)).toBe('hidden')
  await demo.getByRole('button', { name: 'Exit demo fullscreen' }).click()
  await expect.poll(() => page.locator('body').evaluate(element => getComputedStyle(element).overflow)).toBe(initialOverflow)
})

test('fits the complete demo at the smallest supported mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/demo/deterministic-chat')
  const shell = page.locator('[data-demo-shell]')
  const chat = page.locator('[data-ak-app-chat]')
  await expect.poll(() => shell.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await expect.poll(() => chat.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await expect(page.getByRole('button', { name: 'Fullscreen' })).toBeVisible()
  await expect(page.getByPlaceholder('Try a suggestion or ask anything…')).toBeVisible()
})

test('submits suggestions from the keyboard and keeps narrow layouts inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/demo/deterministic-chat')
  const demo = page
  const input = demo.getByPlaceholder('Try a suggestion or ask anything…')
  await input.fill('how can')
  await expect(demo.locator('.demo-autocomplete').getByRole('button')).toHaveCount(1)
  await input.fill('how can I call you?')
  await input.press('Enter')
  await expect(demo.getByText('Call me AgentsKit Chat.')).toBeVisible()
  await expect.poll(() => demo.locator('[data-demo-shell]').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await expect.poll(() => demo.locator('[data-ak-app-chat]').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
})

test('starts a clean session when switching between deterministic and AI modes', async ({ page }) => {
  await page.route('**/api/demo-ask**', route => route.fulfill({
    status: 200,
    contentType: 'application/x-ndjson',
    body: '{"type":"text","delta":"Fresh AI session."}\n{"type":"done","model":"test"}\n',
  }))
  await page.goto('/demo/deterministic-chat')
  const demo = page
  await demo.getByPlaceholder('Try a suggestion or ask anything…').fill('hi')
  await demo.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(demo.getByText(/I know when not to guess/)).toBeVisible()
  await demo.getByRole('button', { name: 'AI', exact: true }).click()
  await expect(demo.getByText(/I know when not to guess/)).toHaveCount(0)
  await demo.getByPlaceholder('Ask the free model anything…').fill('hi')
  await demo.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(demo.getByText('Fresh AI session.')).toBeVisible()
  await expect(demo.getByText('AI · OpenRouter')).toBeVisible()
  await demo.getByRole('button', { name: 'Deterministic', exact: true }).click()
  await expect(demo.getByText('Fresh AI session.')).toHaveCount(0)
})

test('honors reduced motion without breaking deterministic interaction', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/demo/deterministic-chat')
  const demo = page
  const motion = await demo.locator('[data-demo-shell]').evaluate(element => ({
    animationDuration: getComputedStyle(element).animationDuration,
    scrollBehavior: getComputedStyle(element.querySelector('[data-ak-chat-container]')!).scrollBehavior,
  }))
  expect(Number.parseFloat(motion.animationDuration) * 1000).toBeLessThanOrEqual(0.01)
  expect(motion.scrollBehavior).toBe('auto')
  await demo.getByPlaceholder('Try a suggestion or ask anything…').fill('hi')
  await demo.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(demo.getByText(/I know when not to guess/)).toBeVisible()
})

test('keeps the AI path direct and usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  let requestBody: { messages?: Array<{ role: string; content: string }> } | undefined
  await page.route('**/api/demo-ask**', async route => {
    requestBody = route.request().postDataJSON() as typeof requestBody
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: '{"type":"text","delta":"AI path confirmed."}\n{"type":"done","model":"test"}\n',
    })
  })
  await page.goto('/demo/deterministic-chat')
  const demo = page
  const shell = demo.locator('[data-demo-shell]')
  const chat = demo.locator('[data-ak-app-chat]')
  await demo.getByRole('button', { name: 'AI', exact: true }).click()
  const input = demo.getByPlaceholder('Ask the free model anything…')
  await input.fill('hi')
  await demo.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(demo.getByText('AI path confirmed.')).toBeVisible()
  await expect.poll(() => requestBody?.messages).toEqual([{ role: 'user', content: 'hi' }])
  const box = await shell.boundingBox()
  expect(box).not.toBeNull()
  expect(box?.x).toBeGreaterThanOrEqual(0)
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390)
  const stableHeight = await chat.evaluate(element => element.getBoundingClientRect().height)
  await input.fill('hi')
  await demo.getByRole('button', { name: 'Send', exact: true }).click()
  await expect.poll(() => chat.evaluate(element => element.getBoundingClientRect().height)).toBe(stableHeight)
})

test('uses the product landing as the entry point and docs as the learning path', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: /One agent experience/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /One definition\. Everything else plugs in/i })).toBeVisible()
  await expect(page.getByText('live', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Works with', { exact: false }).first()).toBeVisible()
  const worksWith = page.getByRole('region', { name: 'Works with' })
  await expect(worksWith.locator('img')).toHaveCount(0)
  await expect(worksWith.locator('svg')).toHaveCount(7)
  await expect(page.getByRole('link', { name: 'Build the interface' })).toHaveAttribute('href', '/docs/getting-started')
  await expect(page.getByRole('link', { name: /See every surface/i })).toHaveAttribute('href', '#surfaces')
  const footer = page.locator('footer')
  await expect(footer).toBeVisible()
  await expect(footer.getByText('One agent experience. Every surface.')).toBeVisible()
  await expect(footer.getByRole('navigation', { name: 'AgentsKit products' }).getByRole('link')).toHaveCount(6)
  await expect(footer.getByRole('link', { name: 'Code Review' })).toHaveCount(0)
  // no useless product chrome
  await expect(page.getByText('agentskit.chat')).toHaveCount(0)
  await page.getByRole('link', { name: 'Build the interface' }).click()
  await expect(page).toHaveURL(/\/docs\/getting-started/)
})

test('keeps the product navigation semantic, sticky, searchable, and touch friendly', async ({ page }) => {
  await page.goto('/')
  const navigation = page.getByRole('navigation', { name: 'AgentsKit Chat', exact: true })
  await expect(navigation).toBeVisible()
  const header = navigation.locator('..')
  await expect.poll(() => header.evaluate(element => getComputedStyle(element).position)).toBe('sticky')
  await expect.poll(() => header.evaluate(element => element.getBoundingClientRect().height)).toBe(56)

  const search = navigation.getByRole('button', { name: 'Open Search' })
  await expect.poll(() => search.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
  await search.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.setViewportSize({ width: 390, height: 844 })
  await navigation.getByRole('button', { name: 'Open product navigation' }).click()
  const mobile = page.getByRole('navigation', { name: 'AgentsKit Chat mobile' })
  await expect(mobile).toBeVisible()
  for (const link of await mobile.getByRole('link').all()) {
    expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  }
})

test('follows the system color scheme without losing product contrast', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await expect.poll(() => page.locator('html').evaluate(element => element.classList.contains('dark'))).toBe(false)
  await expect.poll(() => page.locator('body').evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(255, 255, 255)')
  await expect.poll(() => page.getByRole('heading', { name: /One agent experience/i }).evaluate(element => getComputedStyle(element).color)).toBe('rgb(13, 17, 23)')

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect.poll(() => page.locator('html').evaluate(element => element.classList.contains('dark'))).toBe(true)
  await expect.poll(() => page.locator('body').evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(13, 17, 23)')
  await expect.poll(() => page.getByRole('heading', { name: /One agent experience/i }).evaluate(element => getComputedStyle(element).color)).toBe('rgb(230, 237, 243)')
})

test('keeps framework install tabs interactive on getting started', async ({ page }) => {
  await page.goto('/docs/getting-started')
  await expect(page.getByRole('heading', { name: 'Get started' }).first()).toBeVisible()
  const tablist = page.getByRole('tablist', { name: 'Choose a renderer' }).first()
  await expect(tablist).toBeVisible()
  for (const tab of await tablist.getByRole('tab').all()) {
    expect((await tab.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  }
  await page.getByRole('tab', { name: 'Vue' }).first().click()
  await expect(page.getByText(/--renderer vue/)).toBeVisible()
  await page.locator('a[href="/docs/getting-started/react"]').first().click()
  await expect(page).toHaveURL(/\/docs\/getting-started\/react$/)
})

test('keeps the animated demo foreground and controls legible', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.goto('/')
  const demo = page.locator('[data-hero-demo]')
  await expect(demo).toBeVisible()
  await expect.poll(() => demo.evaluate(element => getComputedStyle(element).color)).toBe('rgb(230, 237, 243)')
  const tabs = demo.getByRole('tablist', { name: 'Interactive agent demos' })
  await expect(tabs).toBeVisible()
  for (const tab of await tabs.getByRole('tab').all()) {
    expect((await tab.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  }
  await tabs.getByRole('tab').nth(1).click()
  await expect(tabs.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true')
})

test('keeps the interactive assistant usable on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/docs/getting-started/react')
  await page.getByRole('button', { name: 'Ask the docs' }).click()
  const assistant = page.getByRole('complementary', { name: 'AgentsKit Chat documentation assistant' })
  await expect(assistant).toBeInViewport()
  await expect(page.getByPlaceholder('Ask about AgentsKit Chat…')).toBeVisible()
  const box = await assistant.boundingBox()
  expect(box).not.toBeNull()
  expect(box?.x).toBeGreaterThanOrEqual(0)
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390)
  await expect(assistant).toHaveScreenshot('mobile-assistant.png', {
    animations: 'disabled',
    mask: [assistant.locator('strong'), assistant.locator('p'), assistant.locator('button'), assistant.locator('input')],
    maxDiffPixelRatio: 0.01,
  })
})

test('supports keyboard focus and restores it when the assistant closes', async ({ page }) => {
  await page.goto('/docs/backend')
  const assistant = page.getByRole('button', { name: 'Ask the docs' })
  await assistant.focus()
  await expect(assistant).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Close documentation assistant' })).toBeFocused()
  await page.getByRole('button', { name: 'Close documentation assistant' }).click()
  await expect(page.getByRole('button', { name: 'Ask the docs' })).toBeFocused()
})

test('enforces the selected hosted Ask smoke profile', async ({ page }) => {
  await page.goto('/docs/backend')
  await page.getByRole('button', { name: 'Ask the docs' }).click()
  const input = page.getByPlaceholder('Ask about AgentsKit Chat…')
  await input.fill('Compare every deployment topology')
  await page.getByRole('button', { name: 'Send', exact: false }).click()
  if (askMode === 'configured') {
    await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()
    await expect(page.getByText('Ask request failed (503).')).toHaveCount(0)
  } else {
    await expect(page.getByText('Ask request failed (503).')).toBeVisible()
  }
})

test('publishes public docs surface and machine-readable artifacts', async ({ request }) => {
  const [
    home, docs, guide, index, llms, llmsFull, knowledge,
    raw, rawIndex, rawPrivate, architectureDoc, product,
    forAgents, search, sitemap, robots, architectureAsset, openGraphImage,
  ] = await Promise.all([
    request.get('/'),
    request.get('/docs'),
    request.get('/docs/guides/install-and-run'),
    request.get('/docs/getting-started'),
    request.get('/llms.txt'),
    request.get('/llms-full.txt'),
    request.get('/deterministic/knowledge.json'),
    request.get('/raw/backend.mdx'),
    request.get('/raw/index.mdx'),
    request.get('/raw/architecture/overview.md'),
    request.get('/docs/architecture/overview'),
    request.get('/docs/product/PRD'),
    request.get('/for-agents'),
    request.get('/api/search?query=react'),
    request.get('/sitemap.xml'),
    request.get('/robots.txt'),
    request.get('/assets/agentschat-architecture.svg'),
    request.get('/opengraph-image'),
  ])

  expect(home.ok()).toBe(true)
  const homeHtml = await home.text()
  expect(homeHtml).toMatch(/One agent experience/i)
  const structuredDataMatch = homeHtml.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)
  expect(structuredDataMatch?.[1]).toBeDefined()
  const structuredData = JSON.parse(structuredDataMatch?.[1] ?? '{}')
  expect(structuredData['@graph']).toContainEqual(expect.objectContaining({
    '@type': 'SoftwareSourceCode',
    codeRepository: 'https://github.com/AgentsKit-io/agentskit-chat',
  }))
  expect(docs.ok()).toBe(true)
  expect(guide.ok()).toBe(true)
  expect(await guide.text()).toContain('Install and run')
  expect(index.ok()).toBe(true)
  expect(await index.text()).toContain('Get started')

  expect(llms.ok()).toBe(true)
  const concise = await llms.text()
  expect(concise).toContain('AgentsKit Chat')
  expect(concise.length).toBeLessThan(10_000)
  expect(concise).not.toContain('architecture/overview')
  expect(concise).not.toContain('for-agents/index')
  for (const productUrl of [
    'https://www.agentskit.io/docs',
    'https://registry.agentskit.io/docs',
    'https://chat.agentskit.io/docs',
    'https://playbook.agentskit.io/docs',
    'https://doc-bridge.agentskit.io/',
    'https://github.com/AgentsKit-io/code-review-cli#readme',
    'https://akos.agentskit.io/docs',
  ]) expect(concise).toContain(productUrl)

  expect(llmsFull.ok()).toBe(true)
  const complete = await llmsFull.text()
  expect(complete).toContain('canonical documentation corpus')
  expect(complete.length).toBeGreaterThan(concise.length)
  expect(complete).not.toMatch(/<!-- architecture\//)

  // Entry point redirects maintainers to the repo tree (not public docs).
  expect(forAgents.status()).toBeLessThan(400)
  expect(forAgents.url()).toMatch(/github\.com\/AgentsKit-io\/agentskit-chat/)

  expect(knowledge.ok()).toBe(true)
  expect((await knowledge.json()).protocol).toBe('agentskit.chat.knowledge')

  expect(raw.ok()).toBe(true)
  expect(await raw.text()).toMatch(/createAskServiceHandler|Ask backend|Hosted and self-hosted/i)
  expect(rawIndex.ok()).toBe(true)
  expect(await rawIndex.text()).toContain('title: AgentsKit Chat')
  expect(rawPrivate.status()).toBe(404)
  expect(architectureDoc.status()).toBe(404)
  expect(product.status()).toBe(404)

  expect(architectureAsset.ok()).toBe(true)
  expect(architectureAsset.headers()['content-type']).toContain('image/svg+xml')
  expect(openGraphImage.ok()).toBe(true)
  expect(openGraphImage.headers()['content-type']).toContain('image/png')
  expect(search.ok()).toBe(true)
  expect(await search.text()).toContain('React quick start')
  expect(sitemap.ok()).toBe(true)
  expect(await sitemap.text()).toContain('/docs/getting-started')
  expect(robots.ok()).toBe(true)
  expect(await robots.text()).toContain('Sitemap:')
})

test('serves the public portal with baseline security headers', async ({ request }) => {
  const response = await request.get('/')
  expect(response.ok()).toBe(true)
  expect(response.headers()).toEqual(expect.objectContaining({
    'content-security-policy': expect.stringContaining("script-src 'self' 'unsafe-inline' https://www.agentskit.io"),
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  }))
})
