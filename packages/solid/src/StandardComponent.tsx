import { ApprovalRequestPropsSchema, ButtonGroupPropsSchema, ConfirmationPropsSchema, ErrorNoticePropsSchema, FileAttachmentPropsSchema, FormPropsSchema, LinkCardPropsSchema, ProgressPropsSchema, SourceListPropsSchema, TablePropsSchema, ToolCallPropsSchema, createComponentInteraction, resolveComponentFallback, resolveComponentFrame, type ComponentManifest } from '@agentskit/chat'
import type { ComponentInteractionEvent, ComponentRenderFrame } from '@agentskit/chat-protocol'
import { createSignal, For, Show, type JSX } from 'solid-js'

export interface StandardComponentProps { readonly frame: ComponentRenderFrame; readonly manifest: ComponentManifest; readonly onInteract: (event: ComponentInteractionEvent) => void; readonly disabled?: boolean }

const StandardForm = (props: StandardComponentProps): JSX.Element => {
  const item = FormPropsSchema.parse(props.frame.props)
  const [values, setValues] = createSignal<Readonly<Record<string, string | boolean>>>({})
  return <form aria-label={item.title ?? 'Form'} data-ak-component="form" onSubmit={event => { event.preventDefault(); props.onInteract(createComponentInteraction(props.frame, props.manifest, 'submit', values())) }}>
    <Show when={item.title}>{title => <h3>{title()}</h3>}</Show>
    <For each={item.fields}>{field => <label>{field.label}{field.type === 'select'
      ? <select required={field.required} disabled={props.disabled} value={String(values()[field.id] ?? '')} onInput={event => setValues(current => ({ ...current, [field.id]: event.currentTarget.value }))}><option value="" disabled>Select…</option><For each={field.options}>{option => <option value={option.id}>{option.label}</option>}</For></select>
      : <input type={field.type} required={field.required} disabled={props.disabled} placeholder={field.placeholder} onInput={event => setValues(current => ({ ...current, [field.id]: field.type === 'checkbox' ? event.currentTarget.checked : event.currentTarget.value }))} />}</label>}</For>
    <button type="submit" disabled={props.disabled}>{item.submitLabel}</button>
  </form>
}

export const StandardComponent = (props: StandardComponentProps): JSX.Element | null => {
  if (!resolveComponentFrame(props.frame, props.manifest).ok || props.frame.componentKey === 'choice-list') return null
  const emit = (event: string, value?: unknown): void => props.onInteract(createComponentInteraction(props.frame, props.manifest, event, value))
  const key = props.frame.componentKey
  if (key === 'button-group') { const item = ButtonGroupPropsSchema.parse(props.frame.props); return <fieldset aria-label={item.label} data-ak-component={key}><legend>{item.label}</legend><For each={item.buttons}>{button => <button type="button" disabled={props.disabled || button.disabled} onClick={() => emit('select', button.id)}>{button.label}</button>}</For></fieldset> }
  if (key === 'form') return <StandardForm {...props} />
  if (key === 'confirmation') { const item = ConfirmationPropsSchema.parse(props.frame.props); return <section aria-label={item.title} data-ak-component={key}><h3>{item.title}</h3><p>{item.message}</p><button disabled={props.disabled} onClick={() => emit('confirm')}>{item.confirmLabel}</button><button disabled={props.disabled} onClick={() => emit('cancel')}>{item.cancelLabel}</button></section> }
  if (key === 'progress') { const item = ProgressPropsSchema.parse(props.frame.props); return <div data-ak-component={key}><label>{item.label}<progress max="100" value={item.value} /></label><Show when={item.status}>{status => <p>{status()}</p>}</Show></div> }
  if (key === 'source-list') { const item = SourceListPropsSchema.parse(props.frame.props); return <section data-ak-component={key}><h3>{item.label}</h3><ul><For each={item.sources}>{source => <li>{source.url ? <a href={source.url} onClick={event => { event.preventDefault(); emit('open', source.id) }}>{source.title}</a> : source.title}<Show when={source.snippet}>{snippet => <p>{snippet()}</p>}</Show></li>}</For></ul></section> }
  if (key === 'link-card') { const item = LinkCardPropsSchema.parse(props.frame.props); return <a data-ak-component={key} href={item.href} onClick={event => { event.preventDefault(); emit('open', item.href) }}><strong>{item.title}</strong><span>{item.description}</span><span>{item.label}</span></a> }
  if (key === 'error-notice') { const item = ErrorNoticePropsSchema.parse(props.frame.props); return <section role="alert" data-ak-component={key}><strong>{item.title}</strong><p>{item.message}</p><code>{item.code}</code><Show when={item.retryLabel}>{label => <button disabled={props.disabled} onClick={() => emit('retry')}>{label()}</button>}</Show></section> }
  if (key === 'tool-call') { const item = ToolCallPropsSchema.parse(props.frame.props); return <section role="status" data-ak-component={key}><strong>{item.name}</strong><span>{item.status}</span><pre>{item.arguments ? JSON.stringify(item.arguments, null, 2) : ''}</pre><pre>{item.result === undefined ? '' : JSON.stringify(item.result, null, 2)}</pre></section> }
  if (key === 'approval-request') { const item = ApprovalRequestPropsSchema.parse(props.frame.props); return <section aria-label={item.title} data-ak-component={key}><h3>{item.title}</h3><p>{item.description}</p><button disabled={props.disabled} onClick={() => emit('approve')}>{item.approveLabel}</button><button disabled={props.disabled} onClick={() => emit('deny')}>{item.denyLabel}</button></section> }
  if (key === 'table') { const item = TablePropsSchema.parse(props.frame.props); return <table data-ak-component={key}><caption>{item.caption}</caption><thead><tr><For each={item.columns}>{column => <th scope="col">{column.label}</th>}</For></tr></thead><tbody><For each={item.rows}>{row => <tr><For each={item.columns}>{column => <td>{String(row[column.key] ?? '')}</td>}</For></tr>}</For></tbody></table> }
  if (key === 'file-attachment') { const item = FileAttachmentPropsSchema.parse(props.frame.props); return <article data-ak-component={key}><strong>{item.name}</strong><span>{item.mimeType}</span><span>{item.sizeBytes === undefined ? '' : `${item.sizeBytes} bytes`}</span>{item.url ? <a href={item.url} onClick={event => { event.preventDefault(); emit('open', item.url) }}>Open</a> : null}</article> }
  return <p data-ak-component-fallback="">{resolveComponentFallback(props.frame, props.manifest)}</p>
}
