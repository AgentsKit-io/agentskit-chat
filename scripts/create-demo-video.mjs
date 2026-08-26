import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const artifacts = join(root, 'artifacts')
const rawDir = join(artifacts, 'deterministic-chat-video')
const output = join(artifacts, 'deterministic-chat-demo.mp4')
const captionsFile = join(artifacts, 'deterministic-chat-demo.srt')
const demoUrl = process.env.DEMO_VIDEO_URL ?? 'http://127.0.0.1:4180/demo/deterministic-chat'

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

const toSrtTime = seconds => {
  const milliseconds = Math.max(0, Math.round(seconds * 1000))
  const hours = Math.floor(milliseconds / 3_600_000)
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000)
  const wholeSeconds = Math.floor((milliseconds % 60_000) / 1000)
  const remainder = milliseconds % 1000
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')},${String(remainder).padStart(3, '0')}`
}

const main = async () => {
  rmSync(rawDir, { recursive: true, force: true })
  mkdirSync(rawDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: { dir: rawDir, size: { width: 1600, height: 900 } },
    colorScheme: 'dark',
  })
  const page = await context.newPage()
  const captionTimeline = []
  const failedAiRequests = []
  let activeCaption
  const recordingStart = Date.now()

  page.on('response', response => {
    if (response.url().includes('/api/demo-ask') && !response.ok()) {
      failedAiRequests.push(`${response.status()} ${response.url()}`)
    }
  })

  await page.goto(demoUrl, { waitUntil: 'networkidle' })
  const demo = page.locator('[data-demo-shell]')
  await demo.getByRole('button', { name: 'Open demo in fullscreen' }).click()
  await page.evaluate(() => {
    const style = document.createElement('style')
    style.textContent = `
      .demo-recording-caption { position: fixed; z-index: 9998; left: 50%; bottom: 16px; width: min(1040px, calc(100vw - 56px)); min-height: 66px; display: grid; grid-template-rows: auto auto; gap: 5px; align-items: center; justify-items: stretch; transform: translateX(-50%); border: 1px solid #b48cff; border-radius: 16px; background: rgb(13 17 23 / .97); box-shadow: 0 12px 40px rgb(0 0 0 / .42); color: #fff; padding: 14px 26px 17px; font: 600 24px/1.25 Arial, sans-serif; text-align: left; }
      .demo-recording-caption::before { display: block; margin-bottom: 5px; color: #c5a9ff; content: 'AGENTSKIT CHAT  ·  LIVE DEMO'; font: 600 13px/1.1 Arial, sans-serif; letter-spacing: .12em; }
      .demo-recording-caption::before { justify-self: center; }
      .demo-recording-caption-text { display: block; width: 100%; }
      .demo-recording-caption.is-caption-entering { animation: demo-caption-in .42s cubic-bezier(.16, 1, .3, 1) both; }
      .demo-recording-char { display: inline-block; min-width: .02em; animation: demo-caption-character .28s cubic-bezier(.16, 1, .3, 1) both; }
      .demo-recording-pointer { position: fixed; z-index: 10000; width: 18px; height: 18px; border: 3px solid #fff; border-radius: 50%; background: #7048c8; box-shadow: 0 0 0 3px rgb(112 72 200 / .6), 0 4px 15px rgb(0 0 0 / .45); pointer-events: none; transform: translate(-50%, -50%); transition: left .22s ease, top .22s ease; }
      .demo-recording-ripple { position: fixed; z-index: 9999; width: 58px; height: 58px; border: 3px solid #b48cff; border-radius: 50%; pointer-events: none; transform: translate(-50%, -50%); animation: demo-recording-ripple .65s ease-out both; }
      .demo-chat-frame [data-ak-input] { caret-color: #b48cff; transition: box-shadow .25s ease, border-color .25s ease; }
      .demo-chat-frame [data-ak-input]:focus { border-color: #b48cff; box-shadow: 0 0 0 3px rgb(180 140 255 / .18), 0 0 28px rgb(180 140 255 / .2); }
      @keyframes demo-caption-in { from { opacity: 0; transform: translateX(-50%) translateY(10px) scale(.98); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
      @keyframes demo-caption-character { from { opacity: 0; filter: blur(5px); transform: translateY(5px) scale(.96); } to { opacity: 1; filter: blur(0); transform: translateY(0) scale(1); } }
      @keyframes demo-recording-ripple { from { opacity: 1; transform: translate(-50%, -50%) scale(.35); } to { opacity: 0; transform: translate(-50%, -50%) scale(1.25); } }
    `
    document.head.append(style)
    const caption = document.createElement('div')
    caption.className = 'demo-recording-caption'
    caption.setAttribute('aria-hidden', 'true')
    document.body.append(caption)
    const pointer = document.createElement('div')
    pointer.className = 'demo-recording-pointer'
    pointer.style.left = '50%'
    pointer.style.top = '50%'
    pointer.setAttribute('aria-hidden', 'true')
    document.body.append(pointer)
  })

  const setCaption = async text => {
    const now = (Date.now() - recordingStart) / 1000
    if (activeCaption !== undefined) activeCaption.end = now
    activeCaption = { start: now, end: now, text }
    captionTimeline.push(activeCaption)
    await page.evaluate(async value => {
      const caption = document.querySelector('.demo-recording-caption')
      if (!(caption instanceof HTMLElement)) return
      caption.textContent = ''
      caption.classList.remove('is-caption-entering')
      void caption.offsetWidth
      caption.classList.add('is-caption-entering')
      const textLayer = document.createElement('span')
      textLayer.className = 'demo-recording-caption-text'
      caption.append(textLayer)
      for (const character of value) {
        const glyph = document.createElement('span')
        glyph.className = 'demo-recording-char'
        glyph.textContent = character === ' ' ? '\u00a0' : character
        textLayer.append(glyph)
        await new Promise(resolve => setTimeout(resolve, 60))
      }
    }, text)
  }

  const clickWithIndicator = async locator => {
    const box = await locator.boundingBox()
    if (box === null) throw new Error('Cannot show click indicator for an invisible target')
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    await page.evaluate(({ x, y }) => {
      const pointer = document.querySelector('.demo-recording-pointer')
      if (pointer instanceof HTMLElement) {
        pointer.style.left = `${x}px`
        pointer.style.top = `${y}px`
      }
      const ripple = document.createElement('div')
      ripple.className = 'demo-recording-ripple'
      ripple.style.left = `${x}px`
      ripple.style.top = `${y}px`
      document.body.append(ripple)
      window.setTimeout(() => ripple.remove(), 700)
    }, point)
    await wait(350)
    await locator.click()
  }

  const input = demo.getByRole('textbox')
  const send = demo.getByRole('button', { name: 'Send', exact: true })
  const waitForAssistant = async previousCount => {
    const deadline = Date.now() + 45_000
    const responseNodes = demo.locator('[data-ak-message][data-ak-role="assistant"], [data-demo-date-card]')
    const messages = demo.locator('[data-ak-message][data-ak-role="assistant"]')
    while (Date.now() < deadline) {
      const responseCount = await responseNodes.count()
      const thinking = await demo.locator('.demo-thinking').isVisible()
      const stop = await demo.getByRole('button', { name: 'Stop', exact: true }).isVisible()
      if (responseCount > previousCount && !thinking && !stop) {
        const messageCount = await messages.count()
        if (messageCount > 0) {
          const last = messages.nth(messageCount - 1)
          const status = await last.getAttribute('data-ak-status')
          if (status === 'error') throw new Error('Real AI request rendered an error message')
          if (status !== 'complete') {
            await wait(250)
            continue
          }
        }
        return
      }
      await wait(250)
    }
    throw new Error('Timed out waiting for the assistant response to complete')
  }
  const typeAndSend = async (value, hold) => {
    const previousAssistantCount = await demo.locator('[data-ak-message][data-ak-role="assistant"], [data-demo-date-card]').count()
    await input.fill('')
    await input.pressSequentially(value, { delay: 120 })
    await wait(900)
    for (let attempt = 0; attempt < 15 && await send.isDisabled(); attempt += 1) await wait(100)
    if (await send.isDisabled()) await input.fill(value)
    await clickWithIndicator(send)
    await waitForAssistant(previousAssistantCount)
    await wait(hold)
  }

  await wait(500)
  await setCaption('Quatro prompts conhecidos: respostas locais, sem chute e sem modelo.')
  await wait(1_600)
  await setCaption('1 / 4  ·  hi → resposta determinística, sem chamada ao modelo.')
  await typeAndSend('hi', 2_500)
  await setCaption('2 / 4  ·  how can I call you? → resposta preparada e instantânea.')
  await typeAndSend('how can I call you?', 2_500)
  await setCaption('3 / 4  ·  what day is today → componente customizado local.')
  await typeAndSend('what day is today', 3_000)
  await setCaption('4 / 4  ·  toggle the mode → ação de interface local.')
  await typeAndSend('toggle the mode', 2_500)
  await setCaption('Mais uma vez → alternando de volta para o dark mode.')
  await typeAndSend('toggle the mode', 2_500)
  await setCaption('Surprise me → sem regra local: escalando para IA automaticamente.')
  await typeAndSend('Surprise me', 3_000)
  await setCaption('Agora, AI mode: qualquer prompt vai direto para o modelo.')
  await clickWithIndicator(demo.getByRole('button', { name: 'AI', exact: true }))
  await wait(1_200)
  await setCaption('Mesmo “hi”, outro caminho: a resposta agora vem da IA.')
  await typeAndSend('hi', 2_800)
  await setCaption('AI 2 / 4  ·  how can I call you? → modelo direto.')
  await typeAndSend('how can I call you?', 3_500)
  await setCaption('AI 3 / 4  ·  toggle the mode → Markdown renderizado na resposta.')
  await typeAndSend('toggle the mode', 4_000)
  await setCaption('AI 4 / 4  ·  what day is today → até perguntas conhecidas chamam o modelo.')
  await typeAndSend('what day is today', 3_500)
  await setCaption('Use IA onde precisa; seja determinístico onde conhece a resposta.')
  await clickWithIndicator(demo.getByRole('button', { name: 'Deterministic', exact: true }))
  await wait(2_500)
  if (failedAiRequests.length > 0) throw new Error(`Real AI request failed: ${failedAiRequests.join(', ')}`)
  if (activeCaption !== undefined) activeCaption.end = (Date.now() - recordingStart) / 1000

  await context.close()
  await browser.close()
  writeFileSync(captionsFile, captionTimeline.map((caption, index) => `${index + 1}\n${toSrtTime(caption.start)} --> ${toSrtTime(caption.end)}\n${caption.text}`).join('\n\n') + '\n')
  const recorded = join(rawDir, readdirSync(rawDir).find(file => file.endsWith('.webm')) ?? '')
  if (!recorded.endsWith('.webm')) throw new Error('Playwright did not produce a video file')
  execFileSync('ffmpeg', [
    '-y', '-i', recorded,
    '-vf', 'scale=1920:1080,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-r', '30', '-movflags', '+faststart', output,
  ], { stdio: 'inherit' })
  rmSync(rawDir, { recursive: true, force: true })
  console.log(`Created ${output}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
