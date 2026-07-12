import { z } from 'zod'

export const CHOICE_LIST_COMPONENT_KEY = 'choice-list' as const

const IdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/)
const TextSchema = z.string().min(1).max(4_096)
const LabelSchema = z.string().min(1).max(256)
const JsonRecordSchema = z.record(z.string().max(128), z.json())
const isPortableUrl = (value: string): boolean => {
  if (/^\/(?!\/)/.test(value)) return true
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && url.username === '' && url.password === '' } catch { return false }
}
const PortableUrlSchema = z.string().max(2_048).refine(isPortableUrl, 'URL must be relative or use HTTP(S).')
const ActionSchema = z.object({ name: IdSchema, input: JsonRecordSchema }).strict().readonly()
const OptionSchema = z.object({ id: IdSchema, label: LabelSchema }).strict().readonly()

export interface ComponentEventDefinition {
  readonly name: string
  readonly value: 'none' | 'id' | 'form' | 'url'
}

export interface ComponentAccessibilityDefinition {
  readonly role: string
  readonly keyboard: boolean
  readonly live: 'none' | 'polite' | 'assertive'
}

export type ComponentCapability = 'display' | 'selection' | 'input' | 'action' | 'navigation' | 'progress' | 'download'

export interface ComponentDefinition<T> {
  readonly key: string
  readonly propsSchema: z.ZodType<T>
  readonly events?: readonly ComponentEventDefinition[]
  readonly accessibility?: ComponentAccessibilityDefinition
  readonly capabilities?: readonly ComponentCapability[]
  fallback?(props: T): string
}

const itemIdsUnique = <T extends { readonly id: string }>(items: readonly T[], context: z.RefinementCtx): void => {
  const ids = new Set<string>()
  items.forEach((item, index) => {
    if (ids.has(item.id)) context.addIssue({ code: 'custom', path: [index, 'id'], message: 'Item ids must be unique.' })
    ids.add(item.id)
  })
}

export const ChoiceListPropsSchema = z.object({
  prompt: TextSchema,
  choices: z.array(z.object({ id: IdSchema, label: LabelSchema, description: TextSchema.optional(), action: ActionSchema.optional() }).strict().readonly()).min(1).max(20).superRefine(itemIdsUnique),
}).strict().readonly()

export const ButtonGroupPropsSchema = z.object({
  label: LabelSchema,
  buttons: z.array(z.object({ id: IdSchema, label: LabelSchema, disabled: z.boolean().optional(), variant: z.enum(['primary', 'secondary', 'danger']).optional() }).strict().readonly()).min(1).max(12).superRefine(itemIdsUnique),
}).strict().readonly()

const FormFieldSchema = z.object({
  id: IdSchema, label: LabelSchema, type: z.enum(['text', 'email', 'number', 'checkbox', 'select']), required: z.boolean().optional(), placeholder: z.string().max(256).optional(), options: z.array(OptionSchema).min(1).max(50).optional(),
}).strict().readonly().superRefine((field, context) => {
  if (field.type === 'select' && field.options === undefined) context.addIssue({ code: 'custom', path: ['options'], message: 'Select fields require options.' })
  if (field.type !== 'select' && field.options !== undefined) context.addIssue({ code: 'custom', path: ['options'], message: 'Only select fields accept options.' })
})
export const FormPropsSchema = z.object({ title: LabelSchema.optional(), fields: z.array(FormFieldSchema).min(1).max(30).superRefine(itemIdsUnique), submitLabel: LabelSchema }).strict().readonly()
export const ConfirmationPropsSchema = z.object({ title: LabelSchema, message: TextSchema, confirmLabel: LabelSchema, cancelLabel: LabelSchema }).strict().readonly()
export const ProgressPropsSchema = z.object({ label: LabelSchema, value: z.number().finite().min(0).max(100), status: TextSchema.optional() }).strict().readonly()
export const SourceListPropsSchema = z.object({ label: LabelSchema, sources: z.array(z.object({ id: IdSchema, title: LabelSchema, url: PortableUrlSchema.optional(), snippet: TextSchema.optional() }).strict().readonly()).min(1).max(50).superRefine(itemIdsUnique) }).strict().readonly()
export const LinkCardPropsSchema = z.object({ title: LabelSchema, description: TextSchema.optional(), href: PortableUrlSchema, label: LabelSchema.optional() }).strict().readonly()
export const ErrorNoticePropsSchema = z.object({ title: LabelSchema, message: TextSchema, code: z.string().max(128).optional(), retryLabel: LabelSchema.optional() }).strict().readonly()
export const ToolCallPropsSchema = z.object({ name: LabelSchema, status: z.enum(['pending', 'running', 'complete', 'error']), arguments: JsonRecordSchema.optional(), result: z.json().optional() }).strict().readonly()
export const ApprovalRequestPropsSchema = z.object({ title: LabelSchema, description: TextSchema, approveLabel: LabelSchema, denyLabel: LabelSchema }).strict().readonly()
const TableCellSchema = z.union([z.string().max(4_096), z.number().finite(), z.boolean(), z.null()])
export const TablePropsSchema = z.object({ caption: LabelSchema, columns: z.array(z.object({ key: IdSchema, label: LabelSchema }).strict().readonly()).min(1).max(30).superRefine((columns, context) => itemIdsUnique(columns.map(column => ({ id: column.key })), context)), rows: z.array(z.record(z.string(), TableCellSchema)).max(1_000) }).strict().readonly()
export const FileAttachmentPropsSchema = z.object({ name: LabelSchema, mimeType: z.string().min(1).max(256), sizeBytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(), url: PortableUrlSchema.optional() }).strict().readonly()

export type ChoiceListProps = z.infer<typeof ChoiceListPropsSchema>
export type ChoiceAction = NonNullable<ChoiceListProps['choices'][number]['action']>

const define = <T>(definition: ComponentDefinition<T>): ComponentDefinition<T> => Object.freeze(definition)
const display = (role: string, live: ComponentAccessibilityDefinition['live'] = 'none'): ComponentAccessibilityDefinition => ({ role, keyboard: false, live })
const interactive = (role: string): ComponentAccessibilityDefinition => ({ role, keyboard: true, live: 'none' })

export const ChoiceListComponent = define({ key: CHOICE_LIST_COMPONENT_KEY, propsSchema: ChoiceListPropsSchema, events: [{ name: 'select', value: 'id' }], accessibility: interactive('group'), capabilities: ['display', 'selection'], fallback: props => `${props.prompt} ${props.choices.map(choice => choice.label).join(', ')}.` })
export const ButtonGroupComponent = define({ key: 'button-group', propsSchema: ButtonGroupPropsSchema, events: [{ name: 'select', value: 'id' }], accessibility: interactive('group'), capabilities: ['display', 'selection'], fallback: props => `${props.label}: ${props.buttons.map(button => button.label).join(', ')}.` })
export const FormComponent = define({ key: 'form', propsSchema: FormPropsSchema, events: [{ name: 'submit', value: 'form' }], accessibility: interactive('form'), capabilities: ['display', 'input'], fallback: props => `${props.title ?? 'Form'}: ${props.fields.map(field => field.label).join(', ')}.` })
export const ConfirmationComponent = define({ key: 'confirmation', propsSchema: ConfirmationPropsSchema, events: [{ name: 'confirm', value: 'none' }, { name: 'cancel', value: 'none' }], accessibility: interactive('group'), capabilities: ['display', 'action'], fallback: props => `${props.title}: ${props.message}` })
export const ProgressComponent = define({ key: 'progress', propsSchema: ProgressPropsSchema, events: [], accessibility: display('progressbar', 'polite'), capabilities: ['display', 'progress'], fallback: props => `${props.label}: ${props.value}%.` })
export const SourceListComponent = define({ key: 'source-list', propsSchema: SourceListPropsSchema, events: [{ name: 'open', value: 'id' }], accessibility: interactive('list'), capabilities: ['display', 'navigation'], fallback: props => `${props.label}: ${props.sources.map(source => source.title).join(', ')}.` })
export const LinkCardComponent = define({ key: 'link-card', propsSchema: LinkCardPropsSchema, events: [{ name: 'open', value: 'url' }], accessibility: interactive('link'), capabilities: ['display', 'navigation'], fallback: props => `${props.title}: ${props.description ?? props.href}` })
export const ErrorNoticeComponent = define({ key: 'error-notice', propsSchema: ErrorNoticePropsSchema, events: [{ name: 'retry', value: 'none' }], accessibility: interactive('alert'), capabilities: ['display', 'action'], fallback: props => `${props.title}: ${props.message}` })
export const ToolCallComponent = define({ key: 'tool-call', propsSchema: ToolCallPropsSchema, events: [], accessibility: display('status', 'polite'), capabilities: ['display'], fallback: props => `${props.name}: ${props.status}.` })
export const ApprovalRequestComponent = define({ key: 'approval-request', propsSchema: ApprovalRequestPropsSchema, events: [{ name: 'approve', value: 'none' }, { name: 'deny', value: 'none' }], accessibility: interactive('group'), capabilities: ['display', 'action'], fallback: props => `${props.title}: ${props.description}` })
export const TableComponent = define({ key: 'table', propsSchema: TablePropsSchema, events: [], accessibility: display('table'), capabilities: ['display'], fallback: props => `${props.caption}: ${props.rows.length} rows.` })
export const FileAttachmentComponent = define({ key: 'file-attachment', propsSchema: FileAttachmentPropsSchema, events: [{ name: 'open', value: 'url' }], accessibility: interactive('link'), capabilities: ['display', 'download'], fallback: props => `${props.name} (${props.mimeType}).` })

export const StandardComponentCatalog = Object.freeze([
  ButtonGroupComponent, ChoiceListComponent, FormComponent, ConfirmationComponent, ProgressComponent, SourceListComponent,
  LinkCardComponent, ErrorNoticeComponent, ToolCallComponent, ApprovalRequestComponent, TableComponent, FileAttachmentComponent,
] as const)

export const STANDARD_COMPONENT_KEYS = Object.freeze(StandardComponentCatalog.map(component => component.key))
