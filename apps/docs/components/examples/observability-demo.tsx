'use client'

import { useEffect, useRef, useState } from 'react'
import { ToolConfirmation } from '@agentskit/react'
import { createInvestigation, type InvestigationMode, type InvestigationSnapshot } from '@/lib/observability-demo'
import styles from './observability-demo.module.css'

type Run = ReturnType<typeof createInvestigation>
const source = 'https://github.com/AgentsKit-io/agentskit-chat/tree/codex/conf42-observable-demo/apps/docs/lib/observability-demo.ts'
const initial: InvestigationSnapshot = { id: '', mode: 'agentic', status: 'ready', paused: false, events: [] }
const labels = { ready: 'Ready to investigate', running: 'Investigation running', approval: 'Awaiting your approval', recovered: 'Recovery verified', escalated: 'Safely escalated', error: 'Execution stopped' }

export function ObservabilityDemo() {
  const [state, setState] = useState(initial)
  const [mode, setMode] = useState<InvestigationMode>('agentic')
  const [pace, setPace] = useState(1400)
  const [selected, setSelected] = useState<string | null>(null)
  const [failures, setFailures] = useState(false)
  const [focus, setFocus] = useState(false)
  const [light, setLight] = useState(false)
  const [compare, setCompare] = useState(false)
  const run = useRef<Run | null>(null)
  const unsubscribe = useRef<(() => void) | null>(null)
  const timeline = useRef<HTMLDivElement>(null)
  const terminal = ['recovered', 'escalated', 'error'].includes(state.status)
  const visible = state.events.filter(e => e.status !== 'running' && (!failures || e.status === 'error'))
  const current = state.events.find(e => e.id === selected) ?? state.events.at(-1)
  const errors = state.events.filter(e => e.kind === 'tool' && e.status === 'error').length
  const calls = state.events.filter(e => e.kind === 'tool' && e.status === 'running').length
  const resolved = state.status === 'recovered'

  useEffect(() => () => { unsubscribe.current?.(); run.current?.dispose() }, [])
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setFocus(false) }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key) }, [])
  useEffect(() => { if (selected === null && timeline.current) timeline.current.scrollTop = timeline.current.scrollHeight }, [state.events.length, selected, failures, focus])

  function reset(nextMode = mode) {
    unsubscribe.current?.(); run.current?.dispose(); run.current = null
    setMode(nextMode); setState({ ...initial, mode: nextMode }); setSelected(null); setFailures(false)
  }
  function start() {
    if (state.status !== 'ready') reset()
    const next = createInvestigation({ mode, paceMs: pace })
    run.current = next; unsubscribe.current = next.subscribe(() => setState(next.snapshot()))
    void next.start()
  }
  function download() {
    if (!run.current) return
    const url = URL.createObjectURL(new Blob([run.current.exportTrace()], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = `${state.id}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <main className={`${styles.shell} ${light ? styles.light : ''} ${focus ? styles.focus : ''}`} data-observability-demo>
    <header className={styles.header}>
      <a href="/docs" className={styles.wordmark}><span aria-hidden="true">◈</span> AgentsKit <small> / execution lab</small></a>
      <div className={styles.utilities}><span className={styles.sandbox}>SIMULATION · NO LLM</span><button onClick={() => setLight(!light)} aria-label={light ? 'Use dark theme' : 'Use light theme'}>{light ? 'Dark' : 'Light'}</button><button onClick={() => setFocus(!focus)}>{focus ? 'Exit focus' : 'Focus mode'}</button><a href={source} target="_blank" rel="noreferrer">Source ↗</a></div>
    </header>
    <section className={styles.intro}>
      <div><p className={styles.eyebrow}>CONF42 OBSERVABILITY 2026</p><h1>Don’t trust the answer.<br /><span>Follow the evidence.</span></h1></div>
      <p className={styles.description}>One incident. Two execution paths.<br />Every decision, failure and recovery — visible.</p>
    </section>
    <div className={styles.toolbar}>
      <div className={styles.segment} role="group" aria-label="Execution path"><button aria-pressed={mode === 'agentic'} onClick={() => reset('agentic')}>Scripted agent</button><button aria-pressed={mode === 'deterministic'} onClick={() => reset('deterministic')}>Deterministic runbook</button></div>
      <div className={styles.playback}><label>Pace <select value={pace} onChange={e => { const value = Number(e.target.value); setPace(value); run.current?.setPace(value) }}><option value={1400}>Presentation</option><option value={500}>Fast</option><option value={30}>Instant</option></select></label>{state.status === 'running' && <button onClick={() => run.current?.pause(!state.paused)}>{state.paused ? 'Resume' : 'Pause'}</button>}<button onClick={() => reset()} disabled={state.status === 'ready'}>Reset</button><button className={styles.primary} disabled={state.status === 'running' || state.status === 'approval'} onClick={start}>{terminal ? '↻ Replay investigation' : '▶ Run investigation'}</button></div>
    </div>
    <div className={styles.workspace}>
      <section className={styles.incident} aria-labelledby="incident-heading">
        <div className={styles.sectionLabel}><span>01 / INCIDENT</span><span className={styles.tag}>FIXTURE INC-042</span></div>
        <h2 id="incident-heading">Checkout API<br />is failing.</h2>
        <p className={styles.prompt}>“Errors increased after the latest deploy. Investigate and propose the safest next step.”</p>
        <div className={styles.signal}>
          <div><span>5xx error rate</span><strong className={resolved ? styles.success : styles.danger}>{resolved ? '0.2' : '18.4'}<small>%</small></strong></div>
          <svg viewBox="0 0 250 80" role="img" aria-label={resolved ? 'Fixture error rate returns to baseline after rollback' : 'Fixture error rate rises sharply after deployment'}><path d="M0 70H250M0 40H250M0 10H250" className={styles.gridline}/><path d={resolved ? 'M0 15 L35 15 L65 20 L90 12 L110 25 L140 68 L175 70 L210 68 L250 70' : 'M0 70 L40 68 L70 70 L100 65 L125 15 L155 20 L180 8 L210 14 L250 10'} className={resolved ? styles.healthyLine : styles.errorLine}/></svg>
          <div className={styles.chartCaption}><span>Controlled fixture data</span><span>baseline 0.2%</span></div>
        </div>
        <dl className={styles.facts}><div><dt>Service</dt><dd>checkout-api</dd></div><div><dt>Deployment</dt><dd>v2.8.4 → v2.8.3</dd></div><div><dt>Instructions</dt><dd>runbook-v3</dd></div><div><dt>Context</dt><dd>snapshot-v7</dd></div></dl>
        <div className={styles.narrator} role="status" aria-live="polite"><p className={styles.eyebrow}>{state.paused ? 'PAUSED FOR NARRATION' : labels[state.status]}</p><p>{state.status === 'ready' ? 'Start the investigation. The trace will reveal what a final answer cannot.' : current?.summary}</p></div>
      </section>
      <section className={styles.trace} aria-labelledby="trace-heading">
        <div className={styles.sectionLabel}><h2 id="trace-heading">02 / EXECUTION TRACE</h2><button className={styles.filter} aria-pressed={failures} onClick={() => setFailures(!failures)}>{failures ? 'Show all' : `Failures (${errors})`}</button></div>
        <div className={styles.traceId}><span className={state.status === 'running' && !state.paused ? styles.pulse : styles.dot} />{state.id ? state.id.slice(0, 20) : 'Awaiting execution'}<span>{state.events.length} events</span></div>
        <div ref={timeline} className={styles.timeline} tabIndex={0} aria-label="Execution trace events">
          {visible.length === 0 ? <div className={styles.empty}><span aria-hidden="true">⌁</span><h3>{failures ? 'No failures recorded.' : 'An answer is not a trace.'}</h3><p>{failures ? 'Failures appear here when a tool actually fails.' : 'Run the incident to see context, tool boundaries, policy and recovery unfold.'}</p></div> : <ol>{visible.map(e => <li key={e.id}><button className={`${styles.event} ${selected === e.id ? styles.selected : ''}`} onClick={() => setSelected(selected === e.id ? null : e.id)} aria-pressed={selected === e.id}><span className={`${styles.eventMark} ${e.status === 'error' ? styles.danger : e.status === 'waiting' ? styles.warning : ''}`}>{e.status === 'error' ? '×' : e.status === 'waiting' ? 'Ⅱ' : '✓'}</span><span className={styles.eventText}><strong>{e.name}</strong><small>{e.kind} · {e.status}</small></span><span className={styles.time}>{e.durationMs !== undefined ? `${e.durationMs} ms` : `+${(e.elapsedMs / 1000).toFixed(1)}s`}</span></button></li>)}</ol>}
        </div>
        <div className={styles.traceFooter}><span>Application trace · actual fixture execution</span><button onClick={download} disabled={!state.id}>Export JSON ↓</button></div>
      </section>
      <aside className={styles.inspector} aria-labelledby="evidence-heading">
        <div className={styles.sectionLabel}><h2 id="evidence-heading">03 / EVIDENCE</h2>{selected && <button onClick={() => setSelected(null)}>Follow latest</button>}</div>
        {state.status === 'approval' && state.pending && !selected ? <div className={styles.approval}><span className={styles.approvalIcon} aria-hidden="true">◇</span><p className={styles.eyebrow}>HUMAN IN THE LOOP</p><h3>Approve simulated rollback</h3><p>The evidence supports returning checkout-api to <strong>v2.8.3</strong>. Nothing executes until you approve.</p><ToolConfirmation toolCall={state.pending} onApprove={() => { void run.current?.approve() }} onDeny={() => { void run.current?.reject() }}/><small>Local demonstration only. No production access.</small></div> : <>
          <div className={styles.evidenceTitle}><p className={styles.eyebrow}>{current?.kind ?? 'INSPECTABLE BY DESIGN'}</p><h3>{resolved && !selected ? 'Recovered. With proof.' : current?.name ?? 'Nothing hidden.'}</h3><p>{current?.summary ?? 'Select an event to inspect the exact evidence it produced. No hidden chain of thought. No raw customer data.'}</p></div>
          {current ? <pre className={styles.json} aria-label="Event evidence"><code>{JSON.stringify(current.evidence, null, 2)}</code></pre> : <div className={styles.checklist}><p>✓ Versioned context</p><p>✓ Structured tool boundaries</p><p>✓ Attributable approvals</p><p>✓ Verified outcomes</p></div>}
        </>}
        <div className={styles.disclosure}><strong>No live model in this run.</strong><span>Tokens & cost: N/A</span><p>Decisions and tool data are fixtures. Durations include deliberate playback pacing, not provider benchmarks.</p></div>
      </aside>
    </div>
    <footer className={styles.bottom}><div><strong>{calls}</strong> tool calls <span>/</span><strong>{errors}</strong> preserved failures <span>/</span><strong>{resolved ? 'Verified' : 'Pending'}</strong> recovery</div><button aria-expanded={compare} onClick={() => setCompare(!compare)}>{compare ? 'Hide comparison' : 'Compare execution paths'} ↗</button></footer>
    {compare && <section className={styles.comparison} aria-label="Execution path comparison"><h2>Same evidence. Different control flow.</h2><div><article><h3>Deterministic runbook</h3><p>A fixed sequence selects tools. Retry and fallback are predefined branches.</p></article><article><h3>Scripted agent</h3><p>The adapter selects the next tool from observed results. Replace the mock adapter with a configured provider behind a trusted backend.</p></article><article><h3>Shared safety boundary</h3><p>Both paths use AgentsKit execution, scoped human approval and validated recovery evidence. This is not a model-quality benchmark.</p></article></div><a href={source} target="_blank" rel="noreferrer">Inspect the implementation ↗</a></section>}
  </main>
}
