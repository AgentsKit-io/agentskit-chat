import { ApprovalRequestPropsSchema, ButtonGroupPropsSchema, ConfirmationPropsSchema, ErrorNoticePropsSchema, FileAttachmentPropsSchema, FormPropsSchema, LinkCardPropsSchema, ProgressPropsSchema, SourceListPropsSchema, TablePropsSchema, ToolCallPropsSchema, createComponentInteraction, resolveComponentFrame, resolveComponentFallback, type ComponentManifest } from '@agentskit/chat'
import type { ComponentInteractionEvent, ComponentRenderFrame } from '@agentskit/chat-protocol'
import { Box, Text, useInput } from 'ink'
import { useRef, useState, type ReactElement } from 'react'

export interface StandardComponentProps { readonly frame: ComponentRenderFrame; readonly manifest: ComponentManifest; readonly onInteract: (event: ComponentInteractionEvent) => void; readonly isActive?: boolean }
interface TerminalAction { readonly label: string; readonly event: string; readonly value?: unknown }

const presentation = (frame: ComponentRenderFrame, manifest: ComponentManifest): { readonly title: string; readonly lines: readonly string[]; readonly actions: readonly TerminalAction[] } => {
  const key = frame.componentKey
  if (key === 'button-group') { const item = ButtonGroupPropsSchema.parse(frame.props); return { title: item.label, lines: [], actions: item.buttons.filter(button => !button.disabled).map(button => ({ label: button.label, event: 'select', value: button.id })) } }
  if (key === 'form') { const item = FormPropsSchema.parse(frame.props); return { title: item.title ?? 'Form', lines: item.fields.map(field => `${field.label}${field.required ? ' *' : ''}`), actions: [{ label: item.submitLabel, event: 'submit', value: {} }] } }
  if (key === 'confirmation') { const item = ConfirmationPropsSchema.parse(frame.props); return { title: item.title, lines: [item.message], actions: [{ label: item.confirmLabel, event: 'confirm' }, { label: item.cancelLabel, event: 'cancel' }] } }
  if (key === 'progress') { const item = ProgressPropsSchema.parse(frame.props); return { title: item.label, lines: [`${item.value}%${item.status ? ` — ${item.status}` : ''}`], actions: [] } }
  if (key === 'source-list') { const item = SourceListPropsSchema.parse(frame.props); return { title: item.label, lines: item.sources.map(source => `${source.title}${source.snippet ? ` — ${source.snippet}` : ''}`), actions: item.sources.filter(source => source.url).map(source => ({ label: `Open ${source.title}`, event: 'open', value: source.id })) } }
  if (key === 'link-card') { const item = LinkCardPropsSchema.parse(frame.props); return { title: item.title, lines: [item.description ?? item.href], actions: [{ label: item.label ?? 'Open', event: 'open', value: item.href }] } }
  if (key === 'error-notice') { const item = ErrorNoticePropsSchema.parse(frame.props); return { title: item.title, lines: [item.message, item.code ?? ''], actions: item.retryLabel ? [{ label: item.retryLabel, event: 'retry' }] : [] } }
  if (key === 'tool-call') { const item = ToolCallPropsSchema.parse(frame.props); return { title: item.name, lines: [item.status, item.arguments ? JSON.stringify(item.arguments) : '', item.result === undefined ? '' : JSON.stringify(item.result)], actions: [] } }
  if (key === 'approval-request') { const item = ApprovalRequestPropsSchema.parse(frame.props); return { title: item.title, lines: [item.description], actions: [{ label: item.approveLabel, event: 'approve' }, { label: item.denyLabel, event: 'deny' }] } }
  if (key === 'table') { const item = TablePropsSchema.parse(frame.props); return { title: item.caption, lines: [item.columns.map(column => column.label).join(' | '), ...item.rows.map(row => item.columns.map(column => String(row[column.key] ?? '')).join(' | '))], actions: [] } }
  if (key === 'file-attachment') { const item = FileAttachmentPropsSchema.parse(frame.props); return { title: item.name, lines: [item.mimeType, item.sizeBytes === undefined ? '' : `${item.sizeBytes} bytes`], actions: item.url ? [{ label: 'Open', event: 'open', value: item.url }] : [] } }
  return { title: resolveComponentFallback(frame, manifest) ?? key, lines: [], actions: [] }
}

export const StandardComponent = ({ frame, manifest, onInteract, isActive = true }: StandardComponentProps): ReactElement | null => {
  const resolved = resolveComponentFrame(frame, manifest)
  if (!resolved.ok || frame.componentKey === 'choice-list') return null
  const item = presentation(frame, manifest)
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)
  useInput((_input, key) => {
    if (!isActive || item.actions.length === 0) return
    if (key.upArrow) activeRef.current = Math.max(0, activeRef.current - 1)
    if (key.downArrow) activeRef.current = Math.min(item.actions.length - 1, activeRef.current + 1)
    if (key.upArrow || key.downArrow) setActive(activeRef.current)
    if (key.return) { const action = item.actions[activeRef.current]!; onInteract(createComponentInteraction(frame, manifest, action.event, action.value)) }
  })
  return <Box flexDirection="column"><Text bold>{item.title}</Text>{item.lines.filter(Boolean).map((line, index) => <Text key={index}>{line}</Text>)}{item.actions.map((action, index) => <Text key={action.label} inverse={index === active}>{index + 1}. {action.label}</Text>)}</Box>
}
