import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConfirmUndoCard, QuotaBar, resolveQuotaState } from '../src/index.js'

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

describe('ConfirmUndoCard', () => {
  it('approves then offers undo', () => {
    const onApprove = vi.fn(), onDeny = vi.fn(), onUndo = vi.fn()
    render(<ConfirmUndoCard action="send_email" description="Send to a@b.invalid" onApprove={onApprove} onDeny={onDeny} onUndo={onUndo} />)
    expect(screen.getByText('Send to a@b.invalid')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onApprove).toHaveBeenCalledOnce()
    expect(screen.getByRole('status').textContent).toContain('Approved')
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onUndo).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy()
    expect(onDeny).not.toHaveBeenCalled()
  })

  it('denies without undo and supports custom labels', () => {
    const onDeny = vi.fn()
    render(<ConfirmUndoCard action="delete" onApprove={vi.fn()} onDeny={onDeny} labels={{ deny: 'Negar', denied: 'Negado' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Negar' }))
    expect(onDeny).toHaveBeenCalledOnce()
    expect(screen.getByRole('status').textContent).toBe('Negado')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows no undo button when approved without onUndo', () => {
    render(<ConfirmUndoCard action="x" onApprove={vi.fn()} onDeny={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
  })
})
