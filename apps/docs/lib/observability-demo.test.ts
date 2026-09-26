import { describe, expect, it } from 'vitest'
import { createInvestigation } from './observability-demo'
import type { AdapterFactory } from '@agentskit/core'

describe('Conf42 real AgentsKit fixture execution', () => {
  for (const mode of ['agentic', 'deterministic'] as const) {
    it(`${mode}: recovers only after explicit approval`, async () => {
      const run = createInvestigation({ mode, paceMs: 0 })
      await run.start()
      expect(run.snapshot().status).toBe('approval')
      expect(run.snapshot().events.filter(e => e.name === 'deploy.get' && e.status === 'error')).toHaveLength(2)
      expect(run.snapshot().events.some(e => e.name === 'deploy.audit' && e.status === 'ok')).toBe(true)
      expect(run.snapshot().events.some(e => e.name === 'rollback.execute')).toBe(false)
      await Promise.all([run.approve(), run.approve()])
      expect(run.snapshot().status).toBe('recovered')
      expect(run.snapshot().events.filter(e => e.name === 'rollback.execute' && e.status === 'ok')).toHaveLength(1)
      expect(run.snapshot().events.at(-1)?.name).toBe('recovery.verified')
      expect(run.exportTrace()).not.toContain('secret')
      expect(run.exportTrace()).not.toContain('confirm-')
      expect(run.snapshot().events.filter(e => e.kind === 'tool' && e.status !== 'running').every(e => e.evidence.input)).toBe(true)
      expect(JSON.parse(run.exportTrace()).modelTokens).toBeNull()
      run.dispose()
    })
  }
  it('rejects safely and cannot approve before proposal or after denial', async () => {
    const run = createInvestigation({ mode: 'agentic', paceMs: 0 })
    await run.approve()
    expect(run.snapshot().events).toHaveLength(0)
    await run.start()
    await run.reject()
    await run.approve()
    expect(run.snapshot().status).toBe('escalated')
    expect(run.snapshot().events.some(e => e.name === 'rollback.execute')).toBe(false)
  })
  it('stops a paused run without stale events and gives replays new identities', async () => {
    const run = createInvestigation({ mode: 'agentic', paceMs: 1 })
    run.pause(true)
    const pending = run.start()
    const count = run.snapshot().events.length
    run.dispose()
    await pending
    expect(run.snapshot().events).toHaveLength(count)
    expect(createInvestigation({ mode: 'agentic', paceMs: 0 }).snapshot().id).not.toBe(run.snapshot().id)
  })
  it('holds execution while paused and resumes the same run', async () => {
    const run = createInvestigation({ mode: 'agentic', paceMs: 0 })
    run.pause(true)
    const pending = run.start()
    const count = run.snapshot().events.length
    await new Promise(resolve => setTimeout(resolve, 120))
    expect(run.snapshot().events).toHaveLength(count)
    run.pause(false)
    await pending
    expect(run.snapshot().status).toBe('approval')
    run.dispose()
  })
  it('supports the documented one-line adapter seam without duplicating its rollback proposal', async () => {
    let observedOriginalApproval = false
    const configuredProviderAdapter: AdapterFactory = { createSource: ({ messages }) => ({
      abort() {},
      async *stream() {
        const calls = messages.flatMap(message => message.toolCalls ?? [])
        let name: string | undefined
        if (!calls.some(call => call.name === 'deploy.audit')) name = 'deploy.audit'
        else if (!calls.some(call => call.id === 'provider-rollback')) name = 'rollback.execute'
        else if (calls.find(call => call.id === 'provider-rollback')?.status === 'complete' && !calls.some(call => call.name === 'health.check')) {
          observedOriginalApproval = true; name = 'health.check'
        }
        if (name) yield { type: 'tool_call', toolCall: { id: name === 'rollback.execute' ? 'provider-rollback' : name, name, args: JSON.stringify({ service: 'checkout-api', ...(name === 'rollback.execute' ? { target: 'v2.8.3' } : {}) }) } }
        yield { type: 'done' }
      },
    }) }
    const run = createInvestigation({ mode: 'agentic', paceMs: 0, adapter: configuredProviderAdapter })
    await run.start()
    expect(run.snapshot().pending?.id).toBe('provider-rollback')
    await run.approve()
    expect(observedOriginalApproval).toBe(true)
    expect(run.snapshot().status).toBe('recovered')
    expect(run.snapshot().events.filter(event => event.name === 'rollback.execute' && event.status === 'ok')).toHaveLength(1)
    run.dispose()
  })
})
