import { useState, type ReactElement, type ReactNode } from 'react'

export type QuotaState = 'ok' | 'warning' | 'blocked'

export interface QuotaBarLabels {
  readonly title?: string
  readonly ok?: string
  readonly warning?: string
  readonly blocked?: string
  /** Receives the rounded percentage (0-100+). */
  readonly valueText?: (percent: number) => string
}

export interface QuotaBarProps {
  /** `quota` from a turn snapshot. */
  readonly quota?: { readonly utilization: number; readonly warning: boolean }
  /** Alternative source: a CostStore window total and its limit. */
  readonly used?: number
  readonly limit?: number
  /** Utilization at which the warning state starts when `quota.warning` is absent. Default 0.8. */
  readonly warnAt?: number
  /** Utilization at which the bar is blocked. Default 1. */
  readonly blockAt?: number
  readonly labels?: QuotaBarLabels
  readonly className?: string
}

const defaultLabels = {
  title: 'Usage',
  ok: 'Within limit',
  warning: 'Approaching limit',
  blocked: 'Limit reached',
  valueText: (percent: number) => `${percent}% used`,
} as const

export const resolveQuotaState = (utilization: number, warning: boolean, blockAt = 1): QuotaState =>
  utilization >= blockAt ? 'blocked' : warning ? 'warning' : 'ok'

const stateColor: Record<QuotaState, string> = {
  ok: 'var(--ak-color-button, #2563eb)',
  warning: 'var(--ak-app-color-warning, #d97706)',
  blocked: 'var(--ak-app-color-danger, #dc2626)',
}

export const QuotaBar = ({ quota, used, limit, warnAt = 0.8, blockAt = 1, labels, className }: QuotaBarProps): ReactElement | null => {
  const utilization = quota?.utilization ?? (used !== undefined && limit !== undefined && limit > 0 ? used / limit : undefined)
  if (utilization === undefined) return null
  const state = resolveQuotaState(utilization, quota?.warning ?? utilization >= warnAt, blockAt)
  const text = { ...defaultLabels, ...labels }
  const percent = Math.round(utilization * 100)
  const clamped = Math.min(100, Math.max(0, percent))
  return (
    <div className={className} data-ak-quota-state={state} style={{ color: 'var(--ak-color-text, inherit)', fontFamily: 'var(--ak-font-family, inherit)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875em' }}>
        <span>{text.title}</span>
        <span>{text.valueText(percent)}</span>
      </div>
      <div
        role="progressbar"
        aria-label={text.title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-valuetext={`${text.valueText(percent)} — ${text[state]}`}
        style={{ height: 8, borderRadius: 'var(--ak-radius, 4px)', background: 'var(--ak-color-border, #e5e7eb)', overflow: 'hidden' }}
      >
        <div style={{ width: `${clamped}%`, height: '100%', background: stateColor[state] }} />
      </div>
      <div role={state === 'ok' ? 'status' : 'alert'} style={{ fontSize: '0.75em', color: state === 'ok' ? 'var(--ak-color-text-muted, inherit)' : stateColor[state] }}>
        {text[state]}
      </div>
    </div>
  )
}

export type ConfirmUndoPhase = 'pending' | 'approved' | 'denied'

export interface ConfirmUndoCardLabels {
  readonly title?: string
  readonly approve?: string
  readonly deny?: string
  readonly undo?: string
  readonly approved?: string
  readonly denied?: string
}

export interface ConfirmUndoCardProps {
  /** Tool or action name. */
  readonly action: string
  /** Human-readable proposal; a node or a short string. */
  readonly description?: ReactNode
  readonly onApprove: () => void
  readonly onDeny: () => void
  /** When set, an undo button appears after approval. */
  readonly onUndo?: () => void
  readonly labels?: ConfirmUndoCardLabels
  readonly className?: string
}

const defaultCardLabels = {
  title: 'Confirm action',
  approve: 'Approve',
  deny: 'Deny',
  undo: 'Undo',
  approved: 'Approved',
  denied: 'Denied',
} as const

export const ConfirmUndoCard = ({ action, description, onApprove, onDeny, onUndo, labels, className }: ConfirmUndoCardProps): ReactElement => {
  const [phase, setPhase] = useState<ConfirmUndoPhase>('pending')
  const text = { ...defaultCardLabels, ...labels }
  return (
    <section
      className={className}
      role="group"
      aria-label={`${text.title}: ${action}`}
      data-ak-confirm-phase={phase}
      style={{ border: '1px solid var(--ak-color-tool-border, #e5e7eb)', background: 'var(--ak-color-tool-bg, transparent)', color: 'var(--ak-color-text, inherit)', borderRadius: 'var(--ak-radius, 4px)', padding: 'var(--ak-spacing-md, 12px)' }}
    >
      <strong>{text.title}</strong>
      <div><code>{action}</code></div>
      {description === undefined ? null : <div>{description}</div>}
      {phase === 'pending' ? (
        <div>
          <button type="button" onClick={() => { setPhase('approved'); onApprove() }}>{text.approve}</button>
          <button type="button" onClick={() => { setPhase('denied'); onDeny() }}>{text.deny}</button>
        </div>
      ) : (
        <div role="status">
          <span>{phase === 'approved' ? text.approved : text.denied}</span>
          {phase === 'approved' && onUndo ? (
            <button type="button" onClick={() => { setPhase('pending'); onUndo() }}>{text.undo}</button>
          ) : null}
        </div>
      )}
    </section>
  )
}
