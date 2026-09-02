'use client'

import { AgentChat, StandardComponent } from '@agentskit/chat/react'
import { createAskAdapter, defineChat } from '@agentskit/chat'
import type { ComponentRenderFrame } from '@agentskit/chat/protocol'
import type { ComponentProps } from 'react'
import { Fragment, useMemo, useRef, useState, type ReactNode } from 'react'
import { InputBar, Message, ThinkingIndicator } from '@agentskit/react'
import {
  createDemoDeterministicAdapter,
  DateCardPropsSchema,
  DEMO_DATE_CARD_KEY,
  DEMO_PROMPTS,
  DEMO_SURPRISE_PROMPT,
  demoComponentManifest,
} from '@/lib/demo-knowledge'
import '@agentskit/react/theme'

type Mode = 'deterministic' | 'ai'
type Palette = 'dark' | 'light'

type GuideCopy = { readonly step: string, readonly title: string, readonly description: string }

const INITIAL_GUIDE: GuideCopy = {
  step: '01',
  title: 'Pick a known prompt',
  description: 'Exact local answers resolve instantly and skip the model entirely.',
}

const DARK_THEME = {
  colors: { background: '#0d1117', surface: '#161b22', border: '#30363d', text: '#e6edf3', muted: '#c7bdd8', accent: '#b48cff', onAccent: '#0d1117', danger: '#f85149' },
} as const

const LIGHT_THEME = {
  colors: { background: '#f6f2ff', surface: '#ffffff', border: '#d9d0ee', text: '#261a3a', muted: '#554467', accent: '#5e3aa9', onAccent: '#ffffff', danger: '#b42318' },
} as const

const DateCard = ({ frame }: { readonly frame: ComponentRenderFrame }) => {
  const props = DateCardPropsSchema.parse(frame.props)
  return (
    <article className="demo-date-card" data-demo-date-card role="status">
      <div className="demo-date-card-top"><span>LOCAL CLOCK</span><span>{props.timezone}</span></div>
      <div className="demo-date-card-date"><strong>{props.day}</strong><div><span>{props.weekday}</span><b>{props.month} {props.year}</b></div></div>
      <p>Resolved without a model call.</p>
    </article>
  )
}

function DemoInput({ chat, placeholder, disabled }: ComponentProps<typeof InputBar>) {
  const deterministic = placeholder?.startsWith('Try') === true
  const promptOptions = deterministic ? [...DEMO_PROMPTS, DEMO_SURPRISE_PROMPT] : [...DEMO_PROMPTS]
  const suggestions = promptOptions.filter(prompt => chat.input.trim() === '' || prompt.toLowerCase().includes(chat.input.toLowerCase())).slice(0, deterministic ? 5 : 4)
  return (
    <div className="demo-input-wrap">
      <div className="demo-autocomplete" aria-label="Prompt suggestions">
        {suggestions.map(prompt => <button key={prompt} type="button" onClick={() => chat.setInput(prompt)}>{prompt}</button>)}
      </div>
      <InputBar
        chat={chat}
        {...(placeholder === undefined ? {} : { placeholder })}
        {...(disabled === undefined ? {} : { disabled })}
      />
    </div>
  )
}

function DemoThinking({ visible }: ComponentProps<typeof ThinkingIndicator>) {
  if (!visible) return null
  return <div className="demo-thinking" role="status" aria-live="polite"><span className="demo-thinking-spinner" /><span>routing the request</span><span className="demo-thinking-dots">···</span></div>
}

const markdownHref = (value: string): string | undefined => {
  const href = value.trim()
  if (href.startsWith('/') || href.startsWith('#')) return href
  try {
    const url = new URL(href)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

const renderMarkdownInline = (value: string): ReactNode[] => {
  const pattern = /(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\[[^\]\n]+\]\([^\s)]+\)|\*[^*\n]+\*)/g
  const result: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = pattern.exec(value)) !== null) {
    if (match.index > cursor) result.push(value.slice(cursor, match.index))
    const token = match[0]
    if (token.startsWith('**') || token.startsWith('__')) {
      result.push(<strong key={`strong-${key++}`}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      result.push(<code key={`code-${key++}`}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^\s)]+)\)$/.exec(token)
      if (link === null) result.push(token)
      else {
        const href = markdownHref(link[2] ?? '')
        result.push(href === undefined ? token : <a key={`link-${key++}`} href={href} target="_blank" rel="noreferrer">{link[1]}</a>)
      }
    } else {
      result.push(<em key={`em-${key++}`}>{token.slice(1, -1)}</em>)
    }
    cursor = match.index + token.length
  }
  if (cursor < value.length) result.push(value.slice(cursor))
  return result
}

const renderMarkdown = (content: string): ReactNode[] => {
  const lines = content.replaceAll('\r\n', '\n').split('\n')
  const blocks: ReactNode[] = []
  let paragraph: string[] = []
  let list: { ordered: boolean, items: string[] } | undefined
  let code: string[] | undefined

  const flushParagraph = (): void => {
    if (paragraph.length === 0) return
    const lines = paragraph
    blocks.push(<p key={`paragraph-${blocks.length}`}>{lines.map((line, index) => <Fragment key={index}>{index > 0 ? <br /> : null}{renderMarkdownInline(line)}</Fragment>)}</p>)
    paragraph = []
  }
  const flushList = (): void => {
    if (list === undefined) return
    const List = list.ordered ? 'ol' : 'ul'
    blocks.push(<List key={`list-${blocks.length}`}>{list.items.map((item, index) => <li key={index}>{renderMarkdownInline(item)}</li>)}</List>)
    list = undefined
  }
  const flushCode = (): void => {
    if (code === undefined) return
    blocks.push(<pre key={`code-${blocks.length}`}><code>{code.join('\n')}</code></pre>)
    code = undefined
  }

  lines.forEach(line => {
    if (code !== undefined) {
      if (line.trim().startsWith('```')) flushCode()
      else code.push(line)
      return
    }
    if (line.trim().startsWith('```')) {
      flushParagraph()
      flushList()
      code = []
      return
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading !== null) {
      flushParagraph()
      flushList()
      const Heading = `h${heading[1]?.length ?? 1}` as 'h1' | 'h2' | 'h3'
      blocks.push(<Heading key={`heading-${blocks.length}`}>{renderMarkdownInline(heading[2] ?? '')}</Heading>)
      return
    }
    const unordered = /^\s*[-*+]\s+(.+)$/.exec(line)
    const ordered = /^\s*\d+[.]\s+(.+)$/.exec(line)
    if (unordered !== null || ordered !== null) {
      flushParagraph()
      const orderedList = ordered !== null
      if (list === undefined || list.ordered !== orderedList) {
        flushList()
        list = { ordered: orderedList, items: [] }
      }
      const item = (ordered ?? unordered)?.[1]
      if (item !== undefined) list.items.push(item)
      return
    }
    if (line.trim() === '') {
      flushParagraph()
      flushList()
      return
    }
    paragraph.push(line)
  })
  flushParagraph()
  flushList()
  flushCode()
  return blocks
}

function DemoMessage({ message, avatar, actions }: ComponentProps<typeof Message>) {
  if (message.role === 'assistant' && message.status === 'error' && message.content.trim() === '') return null
  if (message.role !== 'assistant') return <Message message={message} avatar={avatar} actions={actions} />
  return <div data-ak-message="" data-ak-role={message.role} data-ak-status={message.status}>
    {avatar ? <div data-ak-avatar="">{avatar}</div> : null}
    <div data-ak-content="" data-ak-markdown="" data-demo-markdown="">{renderMarkdown(message.content)}</div>
    {actions ? <div data-ak-actions="">{actions}</div> : null}
  </div>
}

const renderDemoComponent = (props: ComponentProps<typeof StandardComponent>) =>
  props.frame.componentKey === DEMO_DATE_CARD_KEY ? <DateCard frame={props.frame} /> : <StandardComponent {...props} />

export function DeterministicChatDemo() {
  const [mode, setMode] = useState<Mode>('deterministic')
  const [palette, setPalette] = useState<Palette>('dark')
  const [fullscreenFallback, setFullscreenFallback] = useState(false)
  const [lastPath, setLastPath] = useState<'local' | 'ai'>('local')
  const [guide, setGuide] = useState<GuideCopy>(INITIAL_GUIDE)
  const shellRef = useRef<HTMLDivElement>(null)
  const ask = useMemo(() => createAskAdapter({ endpoint: '/api/demo-ask', corpus: 'deterministic-demo' }), [])
  const definition = useMemo(() => {
    const adapter = mode === 'deterministic'
      ? createDemoDeterministicAdapter({
        fallback: ask,
        onDecision: decision => {
          if (decision.outcome !== 'answer') return
          if (decision.provenance?.source === 'local') {
            setLastPath('local')
            const query = decision.query.trim().toLowerCase()
            if (query === 'toggle the mode') {
              setPalette(current => current === 'dark' ? 'light' : 'dark')
              setGuide({ step: '03', title: 'Local UI action', description: 'The theme changed without a model call.' })
            } else if (query === 'what day is today') {
              setGuide({ step: '02', title: 'Custom component', description: 'The browser clock became a rendered date card.' })
            } else {
              setGuide({ step: '01', title: 'Exact local match', description: 'A prepared answer resolved instantly with deterministic provenance.' })
            }
          } else if (decision.provenance?.source === 'backend') {
            setLastPath('ai')
            setGuide({ step: '04', title: 'Escalated to AI', description: 'No local rule matched, so the request went to OpenRouter.' })
          }
        },
      })
      : ask
    return defineChat({
      id: `deterministic-ai-demo-${mode}`,
      revision: mode === 'deterministic' ? 1 : 2,
      components: demoComponentManifest,
      chat: { adapter },
    })
  }, [ask, mode])

  return (
    <section ref={shellRef} className={`deterministic-demo ${palette === 'light' ? 'is-light' : ''} ${fullscreenFallback ? 'is-fullscreen' : ''}`} data-demo-shell>
      <header className="demo-header">
        <div><p className="demo-kicker">AgentsKit Chat / live experiment</p><h2>Know when not to guess.</h2></div>
        <button type="button" className="demo-fullscreen" onClick={() => setFullscreenFallback(current => !current)} aria-label={fullscreenFallback ? 'Exit demo fullscreen' : 'Open demo in fullscreen'}>⛶ <span>{fullscreenFallback ? 'Exit fullscreen' : 'Fullscreen'}</span></button>
      </header>
      <div className="demo-controls">
        <div className="demo-segment" aria-label="Agent mode" role="group">
          <span>Agent mode</span>
          <button type="button" aria-pressed={mode === 'deterministic'} onClick={() => { setGuide(INITIAL_GUIDE); setMode('deterministic') }}>Deterministic</button>
          <button type="button" aria-pressed={mode === 'ai'} onClick={() => { setLastPath('ai'); setGuide({ step: '05', title: 'AI mode is direct', description: 'Every prompt in this mode is sent to the model.' }); setMode('ai') }}>AI</button>
        </div>
        <div className="demo-path" data-demo-path={lastPath}><span className="demo-status-dot" />{lastPath === 'local' ? 'LOCAL · deterministic' : 'AI · OpenRouter'}</div>
      </div>
      <div className="demo-note"><span>Same prompt.</span><span className="demo-arrow">→</span><span>Different path.</span><span className="demo-note-detail">Switching mode starts a clean session.</span></div>
      <div className="demo-guide" data-demo-guide data-demo-guide-step={guide.step} role="status" aria-live="polite">
        <span className="demo-guide-index">{guide.step}</span>
        <div><p className="demo-guide-kicker">What just happened</p><p className="demo-guide-title">{guide.title}</p><p className="demo-guide-description">{guide.description}</p></div>
      </div>
      <div className="demo-chat-frame">
        <AgentChat
          key={mode}
          definition={definition}
          placeholder={mode === 'deterministic' ? 'Try a suggestion or ask anything…' : 'Ask the free model anything…'}
          theme={palette === 'dark' ? DARK_THEME : LIGHT_THEME}
          slots={{ Message: DemoMessage, Input: DemoInput, Thinking: DemoThinking, StandardComponent: renderDemoComponent }}
        />
      </div>
      <footer className="demo-footer"><span>Exact local answers are instant.</span><span>Unknown input escalates.</span><span>AI mode always calls the model.</span></footer>
    </section>
  )
}
