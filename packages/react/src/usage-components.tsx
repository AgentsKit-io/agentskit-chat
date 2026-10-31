import { ToolConfirmation } from '@agentskit/react'
import { useEffect, useRef, type ComponentProps, type ReactElement, type ReactNode } from 'react'

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
  warning: 'var(--ak-color-text, currentColor)',
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

export type ConfirmUndoToolCall = ComponentProps<typeof ToolConfirmation>['toolCall']

export interface ConfirmUndoCardLabels {
  readonly title?: string
  readonly approved?: string
  readonly denied?: string
  readonly undo?: string
}

export interface ConfirmUndoCardProps {
  /** The upstream tool call; the phase is derived from its `status`. */
  readonly toolCall: ConfirmUndoToolCall
  /** Human-readable proposal shown above the upstream confirmation controls. */
  readonly description?: ReactNode
  readonly onApprove: (toolCallId: string) => void
  readonly onDeny: (toolCallId: string, reason?: string) => void
  /** When set, an undo button appears after approval. */
  readonly onUndo?: (toolCallId: string) => void
  readonly labels?: ConfirmUndoCardLabels
  readonly className?: string
}

const defaultCardLabels = {
  title: 'Confirm action',
  approved: 'Approved',
  denied: 'Denied',
  undo: 'Undo',
} as const

/** `requires_confirmation` is pending; a deny is recorded upstream as an error starting with `Permission denied`. */
export const resolveConfirmPhase = (toolCall: ConfirmUndoToolCall): ConfirmUndoPhase =>
  toolCall.status === 'requires_confirmation' ? 'pending' : toolCall.status === 'error' && toolCall.error?.startsWith('Permission denied') ? 'denied' : 'approved'

export const ConfirmUndoCard = ({ toolCall, description, onApprove, onDeny, onUndo, labels, className }: ConfirmUndoCardProps): ReactElement => {
  const text = { ...defaultCardLabels, ...labels }
  const phase = resolveConfirmPhase(toolCall)
  const section = useRef<HTMLElement>(null)
  const status = useRef<HTMLDivElement>(null)
  const previous = useRef(phase)
  // The clicked control unmounts when the phase changes; keep keyboard focus inside the card.
  useEffect(() => {
    if (previous.current === phase) return
    previous.current = phase
    if (phase === 'pending') section.current?.querySelector<HTMLElement>('[data-ak-tool-confirmation-approve]')?.focus()
    else status.current?.focus()
  }, [phase])
  return (
    <section
      ref={section}
      className={className}
      role="group"
      aria-label={`${text.title}: ${toolCall.name}`}
      data-ak-confirm-phase={phase}
      style={{ border: '1px solid var(--ak-color-tool-border, #e5e7eb)', background: 'var(--ak-color-tool-bg, transparent)', color: 'var(--ak-color-text, inherit)', borderRadius: 'var(--ak-radius, 4px)', padding: 'var(--ak-spacing-md, 12px)' }}
    >
      <strong>{text.title}</strong>
      {description === undefined ? null : <div>{description}</div>}
      {phase === 'pending' ? (
        <ToolConfirmation toolCall={toolCall} onApprove={onApprove} onDeny={onDeny} />
      ) : (
        <div ref={status} role="status" tabIndex={-1}>
          <code>{toolCall.name}</code> <span>{phase === 'approved' ? text.approved : text.denied}</span>
          {phase === 'approved' && onUndo ? (
            <button type="button" onClick={() => { onUndo(toolCall.id); status.current?.focus() }}>{text.undo}</button>
          ) : null}
        </div>
      )}
    </section>
  )
}
