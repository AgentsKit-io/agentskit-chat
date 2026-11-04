import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConfirmUndoCard, QuotaBar, resolveQuotaState } from '../src/index.js'
import type { ConfirmUndoToolCall } from '../src/index.js'

afterEach(cleanup)

const quotaLabels = { title: 'Usage', ok: 'Within limit', warning: 'Approaching limit', blocked: 'Limit reached', valueText: (p: number) => `${p}% used` }
const cardLabels = { title: 'Confirm action', approve: 'Approve', deny: 'Deny', approved: 'Approved', denied: 'Denied', undo: 'Undo' }

describe('QuotaBar', () => {
  it('renders ok, warning and blocked states from a snapshot quota', () => {
    const view = render(<QuotaBar quota={{ utilization: 0.4, warning: false }}  labels={quotaLabels} />)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('40')
    expect(screen.getByRole('status').textContent).toBe('Within limit')
    view.rerender(<QuotaBar quota={{ utilization: 0.85, warning: true }}  labels={quotaLabels} />)
    expect(screen.getByRole('alert').textContent).toBe('Approaching limit')
    view.rerender(<QuotaBar quota={{ utilization: 1.2, warning: true }}  labels={quotaLabels} />)
    expect(screen.getByRole('alert').textContent).toBe('Limit reached')
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
  })

  it('derives state from a CostStore window with configurable thresholds and labels', () => {
    const { container } = render(<QuotaBar used={6} limit={10} warnAt={0.5} blockAt={0.9} labels={{ ...quotaLabels, title: 'Uso', warning: 'Perto do limite', valueText: p => `${p}% usado` }} />)
    expect(container.querySelector('[data-ak-quota-state]')?.getAttribute('data-ak-quota-state')).toBe('warning')
    expect(screen.getByText('Perto do limite')).toBeTruthy()
    expect(screen.getByText('60% usado')).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-label')).toBe('Uso')
  })

  it('uses 80% as the default warning threshold and 100% as exhausted', () => {
    const state = (used: number) => render(<QuotaBar used={used} limit={100} labels={quotaLabels} />).container.querySelector('[data-ak-quota-state]')?.getAttribute('data-ak-quota-state')
    expect(state(79)).toBe('ok')
    cleanup()
    expect(state(80)).toBe('warning')
    cleanup()
    expect(state(100)).toBe('blocked')
  })

  it('renders only caller-supplied texts', () => {
    const labels = { title: 'T', ok: 'O', warning: 'W', blocked: 'B', valueText: (p: number) => `V${p}` }
    const { container } = render(<QuotaBar used={1} limit={10} labels={labels} />)
    expect(container.textContent).toBe('TV10O')
  })

  it('renders nothing without usable data', () => {
    expect(render(<QuotaBar  labels={quotaLabels} />).container.innerHTML).toBe('')
    expect(render(<QuotaBar used={1} limit={0}  labels={quotaLabels} />).container.innerHTML).toBe('')
  })

  it('resolves states', () => {
    expect(resolveQuotaState(0.1, false)).toBe('ok')
    expect(resolveQuotaState(0.9, true)).toBe('warning')
    expect(resolveQuotaState(1, true)).toBe('blocked')
  })
})

const call = (status: ConfirmUndoToolCall['status'], error?: string): ConfirmUndoToolCall => ({ id: 'tc1', name: 'send_email', args: { to: 'a@b.invalid' }, status, ...(error ? { error } : {}) })

describe('ConfirmUndoCard', () => {
  it('shows the upstream confirmation and reports approve with the tool call id', () => {
    const onApprove = vi.fn(), onDeny = vi.fn()
    render(<ConfirmUndoCard toolCall={call('requires_confirmation')} description="Send to a@b.invalid" onApprove={onApprove} onDeny={onDeny}  labels={cardLabels} />)
    expect(screen.getByText('Send to a@b.invalid')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onApprove).toHaveBeenCalledWith('tc1')
    expect(onDeny).not.toHaveBeenCalled()
  })

  it('does not change phase locally: it follows toolCall.status', () => {
    const view = render(<ConfirmUndoCard toolCall={call('requires_confirmation')} onApprove={vi.fn()} onDeny={vi.fn()}  labels={cardLabels} />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(view.container.querySelector('[data-ak-confirm-phase]')?.getAttribute('data-ak-confirm-phase')).toBe('pending')
    view.rerender(<ConfirmUndoCard toolCall={call('complete')} onApprove={vi.fn()} onDeny={vi.fn()}  labels={cardLabels} />)
    expect(screen.getByRole('status').textContent).toContain('Approved')
  })

  it('reports deny and renders the denied phase with custom labels', () => {
    const onDeny = vi.fn()
    const view = render(<ConfirmUndoCard toolCall={call('requires_confirmation')} onApprove={vi.fn()} onDeny={onDeny} labels={{ ...cardLabels, denied: 'Negado' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Deny' }))
    expect(onDeny).toHaveBeenCalledWith('tc1')
    view.rerender(<ConfirmUndoCard toolCall={call('error', 'Permission denied: user denied access')} onApprove={vi.fn()} onDeny={onDeny} labels={{ ...cardLabels, denied: 'Negado' }} />)
    expect(screen.getByRole('status').textContent).toContain('Negado')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('offers undo only after approval when onUndo is set, and keeps focus on the status region', () => {
    const onUndo = vi.fn()
    const view = render(<ConfirmUndoCard toolCall={call('requires_confirmation')} onApprove={vi.fn()} onDeny={vi.fn()} onUndo={onUndo}  labels={cardLabels} />)
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
    view.rerender(<ConfirmUndoCard toolCall={call('complete')} onApprove={vi.fn()} onDeny={vi.fn()} onUndo={onUndo}  labels={cardLabels} />)
    expect(document.activeElement).toBe(screen.getByRole('status'))
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onUndo).toHaveBeenCalledWith('tc1')
    expect(document.activeElement).toBe(screen.getByRole('status'))
  })

  it('moves focus to Approve when the call returns to pending, and to status after deny', () => {
    const view = render(<ConfirmUndoCard toolCall={call('complete')} onApprove={vi.fn()} onDeny={vi.fn()} onUndo={vi.fn()}  labels={cardLabels} />)
    view.rerender(<ConfirmUndoCard toolCall={call('requires_confirmation')} onApprove={vi.fn()} onDeny={vi.fn()} onUndo={vi.fn()}  labels={cardLabels} />)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Approve' }))
    view.rerender(<ConfirmUndoCard toolCall={call('error', 'Permission denied: x')} onApprove={vi.fn()} onDeny={vi.fn()}  labels={cardLabels} />)
    expect(document.activeElement).toBe(screen.getByRole('status'))
  })

  it('renders approve/deny/undo only from labels', () => {
    const labels = { title: 'Confirmar', approve: 'Sim', deny: 'Não', approved: 'Aprovado', denied: 'Negado', undo: 'Desfazer' }
    const view = render(<ConfirmUndoCard labels={labels} toolCall={call('requires_confirmation')} onApprove={vi.fn()} onDeny={vi.fn()} onUndo={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Sim' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Não' })).toBeTruthy()
    view.rerender(<ConfirmUndoCard labels={labels} toolCall={call('complete')} onApprove={vi.fn()} onDeny={vi.fn()} onUndo={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Desfazer' })).toBeTruthy()
    expect(view.container.textContent).not.toMatch(/Approve|Deny|Undo|Approved/)
  })

  it('shows no undo button when approved without onUndo', () => {
    render(<ConfirmUndoCard toolCall={call('running')} onApprove={vi.fn()} onDeny={vi.fn()}  labels={cardLabels} />)
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
  })
})
