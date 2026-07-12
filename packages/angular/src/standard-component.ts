import { Component, Input, type OnChanges } from '@angular/core'
import { ApprovalRequestPropsSchema, ButtonGroupPropsSchema, ConfirmationPropsSchema, ErrorNoticePropsSchema, FileAttachmentPropsSchema, FormPropsSchema, LinkCardPropsSchema, ProgressPropsSchema, SourceListPropsSchema, TablePropsSchema, ToolCallPropsSchema, createComponentInteraction, resolveComponentFallback, resolveComponentFrame, type ComponentManifest } from '@agentskit/chat'
import type { ComponentInteractionEvent, ComponentRenderFrame } from '@agentskit/chat-protocol'

@Component({
  selector: 'ak-standard-component', standalone: true,
  template: `@if (valid) { @switch (frame.componentKey) {
    @case ('button-group') { @if (buttonGroup(); as item) { <fieldset [attr.aria-label]="item.label" data-ak-component="button-group"><legend>{{ item.label }}</legend>@for (button of item.buttons; track button.id) { <button type="button" [disabled]="disabled || button.disabled" (click)="emit('select', button.id)">{{ button.label }}</button> }</fieldset> } }
    @case ('form') { @if (form(); as item) { <form [attr.aria-label]="item.title ?? 'Form'" data-ak-component="form" (submit)="submit($event)">@if (item.title) { <h3>{{ item.title }}</h3> } @for (field of item.fields; track field.id) { <label>{{ field.label }}@if (field.type === 'select') { <select [required]="field.required" [disabled]="disabled" (change)="setSelect(field.id, $event)"><option value="" disabled selected>Select…</option>@for (option of field.options ?? []; track option.id) { <option [value]="option.id">{{ option.label }}</option> }</select> } @else { <input [type]="field.type" [required]="field.required" [disabled]="disabled" [placeholder]="field.placeholder" (input)="setInput(field.id, field.type, $event)" /> }</label> } <button type="submit" [disabled]="disabled">{{ item.submitLabel }}</button></form> } }
    @case ('confirmation') { @if (confirmation(); as item) { <section [attr.aria-label]="item.title" data-ak-component="confirmation"><h3>{{ item.title }}</h3><p>{{ item.message }}</p><button [disabled]="disabled" (click)="emit('confirm')">{{ item.confirmLabel }}</button><button [disabled]="disabled" (click)="emit('cancel')">{{ item.cancelLabel }}</button></section> } }
    @case ('progress') { @if (progress(); as item) { <div data-ak-component="progress"><label>{{ item.label }}<progress max="100" [value]="item.value"></progress></label>@if (item.status) { <p>{{ item.status }}</p> }</div> } }
    @case ('source-list') { @if (sourceList(); as item) { <section data-ak-component="source-list"><h3>{{ item.label }}</h3><ul>@for (source of item.sources; track source.id) { <li>@if (source.url) { <a [href]="source.url" (click)="link($event, 'open', source.id)">{{ source.title }}</a> } @else { {{ source.title }} } @if (source.snippet) { <p>{{ source.snippet }}</p> }</li> }</ul></section> } }
    @case ('link-card') { @if (linkCard(); as item) { <a data-ak-component="link-card" [href]="item.href" (click)="link($event, 'open', item.href)"><strong>{{ item.title }}</strong><span>{{ item.description }}</span><span>{{ item.label }}</span></a> } }
    @case ('error-notice') { @if (errorNotice(); as item) { <section role="alert" data-ak-component="error-notice"><strong>{{ item.title }}</strong><p>{{ item.message }}</p><code>{{ item.code }}</code>@if (item.retryLabel) { <button [disabled]="disabled" (click)="emit('retry')">{{ item.retryLabel }}</button> }</section> } }
    @case ('tool-call') { @if (toolCall(); as item) { <section role="status" data-ak-component="tool-call"><strong>{{ item.name }}</strong><span>{{ item.status }}</span><pre>{{ json(item.arguments) }}</pre><pre>{{ json(item.result) }}</pre></section> } }
    @case ('approval-request') { @if (approval(); as item) { <section [attr.aria-label]="item.title" data-ak-component="approval-request"><h3>{{ item.title }}</h3><p>{{ item.description }}</p><button [disabled]="disabled" (click)="emit('approve')">{{ item.approveLabel }}</button><button [disabled]="disabled" (click)="emit('deny')">{{ item.denyLabel }}</button></section> } }
    @case ('table') { @if (table(); as item) { <table data-ak-component="table"><caption>{{ item.caption }}</caption><thead><tr>@for (column of item.columns; track column.key) { <th scope="col">{{ column.label }}</th> }</tr></thead><tbody>@for (row of item.rows; track $index) { <tr>@for (column of item.columns; track column.key) { <td>{{ cell(row[column.key]) }}</td> }</tr> }</tbody></table> } }
    @case ('file-attachment') { @if (file(); as item) { <article data-ak-component="file-attachment"><strong>{{ item.name }}</strong><span>{{ item.mimeType }}</span>@if (item.sizeBytes !== undefined) { <span>{{ item.sizeBytes }} bytes</span> } @if (item.url) { <a [href]="item.url" (click)="link($event, 'open', item.url)">Open</a> }</article> } }
    @default { <p data-ak-component-fallback>{{ fallback() }}</p> }
  } }`,
})
export class StandardComponentComponent implements OnChanges {
  @Input({ required: true }) frame!: ComponentRenderFrame
  @Input({ required: true }) manifest!: ComponentManifest
  @Input({ required: true }) onInteract!: (event: ComponentInteractionEvent) => void
  @Input() disabled = false
  valid = false
  private values: Record<string, string | boolean> = {}
  ngOnChanges(): void { this.valid = resolveComponentFrame(this.frame, this.manifest).ok && this.frame.componentKey !== 'choice-list' }
  buttonGroup = () => ButtonGroupPropsSchema.safeParse(this.frame.props).data
  form = () => FormPropsSchema.safeParse(this.frame.props).data
  confirmation = () => ConfirmationPropsSchema.safeParse(this.frame.props).data
  progress = () => ProgressPropsSchema.safeParse(this.frame.props).data
  sourceList = () => SourceListPropsSchema.safeParse(this.frame.props).data
  linkCard = () => LinkCardPropsSchema.safeParse(this.frame.props).data
  errorNotice = () => ErrorNoticePropsSchema.safeParse(this.frame.props).data
  toolCall = () => ToolCallPropsSchema.safeParse(this.frame.props).data
  approval = () => ApprovalRequestPropsSchema.safeParse(this.frame.props).data
  table = () => TablePropsSchema.safeParse(this.frame.props).data
  file = () => FileAttachmentPropsSchema.safeParse(this.frame.props).data
  fallback = (): string => resolveComponentFallback(this.frame, this.manifest) ?? ''
  emit(event: string, value?: unknown): void { this.onInteract(createComponentInteraction(this.frame, this.manifest, event, value)) }
  link(event: Event, name: string, value: string): void { event.preventDefault(); this.emit(name, value) }
  submit(event: Event): void { event.preventDefault(); this.emit('submit', { ...this.values }) }
  setSelect(id: string, event: Event): void { if (event.target instanceof HTMLSelectElement) this.values[id] = event.target.value }
  setInput(id: string, type: string, event: Event): void { if (event.target instanceof HTMLInputElement) this.values[id] = type === 'checkbox' ? event.target.checked : event.target.value }
  json(value: unknown): string { return value === undefined ? '' : JSON.stringify(value, null, 2) }
  cell(value: unknown): string { return value === null || ['string', 'number', 'boolean'].includes(typeof value) ? String(value ?? '') : '' }
}
