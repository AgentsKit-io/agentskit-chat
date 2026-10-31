import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConfirmUndoCard, QuotaBar, resolveQuotaState } from '../src/index.js'
import type { ConfirmUndoToolCall } from '../src/index.js'

afterEach(cleanup)

describe('QuotaBar', () => {
  it('renders ok, warning and blocked states from a snapshot quota', () => {
    const view = render(<QuotaBar quota={{ utilization: 0.4, warning: false }} />)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('40')
    expect(screen.getByRole('status').textContent).toBe('Within limit')
    view.rerender(<QuotaBar quota={{ utilization: 0.85, warning: true }} />)
    expect(screen.getByRole('alert').textContent).toBe('Approaching limit')
    view.rerender(<QuotaBar quota={{ utilization: 1.2, warning: true }} />)
    expect(screen.getByRole('alert').textContent).toBe('Limit reached')
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
  })

  it('derives state from a CostStore window with configurable thresholds and labels', () => {
    const { container } = render(<QuotaBar used={6} limit={10} warnAt={0.5} blockAt={0.9} labels={{ title: 'Uso', warning: 'Perto do limite', valueText: p => `${p}% usado` }} />)
    expect(container.querySelector('[data-ak-quota-state]')?.getAttribute('data-ak-quota-state')).toBe('warning')
    expect(screen.getByText('Perto do limite')).toBeTruthy()
    expect(screen.getByText('60% usado')).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-label')).toBe('Uso')
  })

  it('renders nothing without usable data', () => {
    expect(render(<QuotaBar />).container.innerHTML).toBe('')
    expect(render(<QuotaBar used={1} limit={0} />).container.innerHTML).toBe('')
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
    render(<ConfirmUndoCard toolCall={call('requires_confirmation')} description="Send to a@b.invalid" onApprove={onApprove} onDeny={onDeny} />)
    expect(screen.getByText('Send to a@b.invalid')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onApprove).toHaveBeenCalledWith('tc1')
    expect(onDeny).not.toHaveBeenCalled()
  })

  it('does not change phase locally: it follows toolCall.status', () => {
    const view = render(<ConfirmUndoCard toolCall={call('requires_confirmation')} onApprove={vi.fn()} onDeny={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(view.container.querySelector('[data-ak-confirm-phase]')?.getAttribute('data-ak-confirm-phase')).toBe('pending')
    view.rerender(<ConfirmUndoCard toolCall={call('complete')} onApprove={vi.fn()} onDeny={vi.fn()} />)
    expect(screen.getByRole('status').textContent).toContain('Approved')
  })

  it('reports deny and renders the denied phase with custom labels', () => {
    const onDeny = vi.fn()
    const view = render(<ConfirmUndoCard toolCall={call('requires_confirmation')} onApprove={vi.fn()} onDeny={onDeny} labels={{ denied: 'Negado' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Deny' }))
    expect(onDeny).toHaveBeenCalledWith('tc1')
    view.rerender(<ConfirmUndoCard toolCall={call('error', 'Permission denied: user denied access')} onApprove={vi.fn()} onDeny={onDeny} labels={{ denied: 'Negado' }} />)
    expect(screen.getByRole('status').textContent).toContain('Negado')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('offers undo only after approval when onUndo is set, and keeps focus on the status region', () => {
    const onUndo = vi.fn()
    const view = render(<ConfirmUndoCard toolCall={call('requires_confirmation')} onApprove={vi.fn()} onDeny={vi.fn()} onUndo={onUndo} />)
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
    view.rerender(<ConfirmUndoCard toolCall={call('complete')} onApprove={vi.fn()} onDeny={vi.fn()} onUndo={onUndo} />)
    expect(document.activeElement).toBe(screen.getByRole('status'))
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onUndo).toHaveBeenCalledWith('tc1')
    expect(document.activeElement).toBe(screen.getByRole('status'))
  })

  it('moves focus to Approve when the call returns to pending, and to status after deny', () => {
    const view = render(<ConfirmUndoCard toolCall={call('complete')} onApprove={vi.fn()} onDeny={vi.fn()} onUndo={vi.fn()} />)
    view.rerender(<ConfirmUndoCard toolCall={call('requires_confirmation')} onApprove={vi.fn()} onDeny={vi.fn()} onUndo={vi.fn()} />)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Approve' }))
    view.rerender(<ConfirmUndoCard toolCall={call('error', 'Permission denied: x')} onApprove={vi.fn()} onDeny={vi.fn()} />)
    expect(document.activeElement).toBe(screen.getByRole('status'))
  })

  it('shows no undo button when approved without onUndo', () => {
    render(<ConfirmUndoCard toolCall={call('running')} onApprove={vi.fn()} onDeny={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
  })
})
