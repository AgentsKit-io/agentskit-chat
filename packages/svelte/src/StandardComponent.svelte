<script lang="ts">
  import { ApprovalRequestPropsSchema, ButtonGroupPropsSchema, ConfirmationPropsSchema, ErrorNoticePropsSchema, FileAttachmentPropsSchema, FormPropsSchema, LinkCardPropsSchema, ProgressPropsSchema, SourceListPropsSchema, TablePropsSchema, ToolCallPropsSchema, createComponentInteraction, resolveComponentFallback, resolveComponentFrame } from '@agentskit/chat'
  import type { ComponentManifest } from '@agentskit/chat'
  import type { ComponentInteractionEvent, ComponentRenderFrame } from '@agentskit/chat-protocol'

  let { frame, manifest, onInteract, disabled = false }: { frame: ComponentRenderFrame; manifest: ComponentManifest; onInteract: (event: ComponentInteractionEvent) => void; disabled?: boolean } = $props()
  let values: Record<string, string | boolean> = $state({})
  const emit = (event: string, value?: unknown): void => onInteract(createComponentInteraction(frame, manifest, event, value))
  const valid = $derived(resolveComponentFrame(frame, manifest).ok && frame.componentKey !== 'choice-list')
</script>

{#if valid}
  {#if frame.componentKey === 'button-group'}
    {@const item = ButtonGroupPropsSchema.parse(frame.props)}
    <fieldset aria-label={item.label} data-ak-component="button-group"><legend>{item.label}</legend>{#each item.buttons as button (button.id)}<button type="button" disabled={disabled || button.disabled} onclick={() => emit('select', button.id)}>{button.label}</button>{/each}</fieldset>
  {:else if frame.componentKey === 'form'}
    {@const item = FormPropsSchema.parse(frame.props)}
    <form aria-label={item.title ?? 'Form'} data-ak-component="form" onsubmit={event => { event.preventDefault(); emit('submit', { ...values }) }}>
      {#if item.title}<h3>{item.title}</h3>{/if}
      {#each item.fields as field (field.id)}<label>{field.label}{#if field.type === 'select'}<select required={field.required} {disabled} value={String(values[field.id] ?? '')} onchange={event => values[field.id] = event.currentTarget.value}><option value="" disabled>Select…</option>{#each field.options ?? [] as option}<option value={option.id}>{option.label}</option>{/each}</select>{:else}<input type={field.type} required={field.required} {disabled} placeholder={field.placeholder} oninput={event => values[field.id] = field.type === 'checkbox' ? event.currentTarget.checked : event.currentTarget.value} />{/if}</label>{/each}
      <button type="submit" {disabled}>{item.submitLabel}</button>
    </form>
  {:else if frame.componentKey === 'confirmation'}
    {@const item = ConfirmationPropsSchema.parse(frame.props)}<section aria-label={item.title} data-ak-component="confirmation"><h3>{item.title}</h3><p>{item.message}</p><button {disabled} onclick={() => emit('confirm')}>{item.confirmLabel}</button><button {disabled} onclick={() => emit('cancel')}>{item.cancelLabel}</button></section>
  {:else if frame.componentKey === 'progress'}
    {@const item = ProgressPropsSchema.parse(frame.props)}<div data-ak-component="progress"><label>{item.label}<progress max="100" value={item.value}></progress></label>{#if item.status}<p>{item.status}</p>{/if}</div>
  {:else if frame.componentKey === 'source-list'}
    {@const item = SourceListPropsSchema.parse(frame.props)}<section data-ak-component="source-list"><h3>{item.label}</h3><ul>{#each item.sources as source (source.id)}<li>{#if source.url}<a href={source.url} onclick={event => { event.preventDefault(); emit('open', source.id) }}>{source.title}</a>{:else}{source.title}{/if}{#if source.snippet}<p>{source.snippet}</p>{/if}</li>{/each}</ul></section>
  {:else if frame.componentKey === 'link-card'}
    {@const item = LinkCardPropsSchema.parse(frame.props)}<a data-ak-component="link-card" href={item.href} onclick={event => { event.preventDefault(); emit('open', item.href) }}><strong>{item.title}</strong>{#if item.description}<span>{item.description}</span>{/if}{#if item.label}<span>{item.label}</span>{/if}</a>
  {:else if frame.componentKey === 'error-notice'}
    {@const item = ErrorNoticePropsSchema.parse(frame.props)}<section role="alert" data-ak-component="error-notice"><strong>{item.title}</strong><p>{item.message}</p>{#if item.code}<code>{item.code}</code>{/if}{#if item.retryLabel}<button {disabled} onclick={() => emit('retry')}>{item.retryLabel}</button>{/if}</section>
  {:else if frame.componentKey === 'tool-call'}
    {@const item = ToolCallPropsSchema.parse(frame.props)}<section role="status" data-ak-component="tool-call"><strong>{item.name}</strong><span>{item.status}</span>{#if item.arguments}<pre>{JSON.stringify(item.arguments, null, 2)}</pre>{/if}{#if item.result !== undefined}<pre>{JSON.stringify(item.result, null, 2)}</pre>{/if}</section>
  {:else if frame.componentKey === 'approval-request'}
    {@const item = ApprovalRequestPropsSchema.parse(frame.props)}<section aria-label={item.title} data-ak-component="approval-request"><h3>{item.title}</h3><p>{item.description}</p><button {disabled} onclick={() => emit('approve')}>{item.approveLabel}</button><button {disabled} onclick={() => emit('deny')}>{item.denyLabel}</button></section>
  {:else if frame.componentKey === 'table'}
    {@const item = TablePropsSchema.parse(frame.props)}<table data-ak-component="table"><caption>{item.caption}</caption><thead><tr>{#each item.columns as column (column.key)}<th scope="col">{column.label}</th>{/each}</tr></thead><tbody>{#each item.rows as row}<tr>{#each item.columns as column (column.key)}<td>{String(row[column.key] ?? '')}</td>{/each}</tr>{/each}</tbody></table>
  {:else if frame.componentKey === 'file-attachment'}
    {@const item = FileAttachmentPropsSchema.parse(frame.props)}<article data-ak-component="file-attachment"><strong>{item.name}</strong><span>{item.mimeType}</span>{#if item.sizeBytes !== undefined}<span>{item.sizeBytes} bytes</span>{/if}{#if item.url}<a href={item.url} onclick={event => { event.preventDefault(); emit('open', item.url) }}>Open</a>{/if}</article>
  {:else}<p data-ak-component-fallback="">{resolveComponentFallback(frame, manifest)}</p>
  {/if}
{/if}
