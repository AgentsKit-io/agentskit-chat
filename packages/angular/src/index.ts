import { NgTemplateOutlet } from '@angular/common'
import { Component, ContentChild, Input, OnChanges, SimpleChanges, TemplateRef, computed, inject, signal, type OnDestroy } from '@angular/core'
import { AgentskitChat, ChatContainerComponent, InputBarComponent, MessageComponent, ThinkingIndicatorComponent, ToolConfirmationComponent } from '@agentskit/angular'
import { formatSemanticFallback, getLifecycleTargets, resolveChatSession, resolveChatTheme, resolveChoiceAction, resolveChoiceListFrame, resolveComponentFrame, selectChoice } from '@agentskit/chat'
import type { ChatDefinition, ChatSession, ChatThemeInput, ComponentManifest } from '@agentskit/chat'
import { decodeComponentFrame, isComponentFrameCandidate } from '@agentskit/chat-protocol'
import type { ComponentInteractionEvent, ComponentRenderFrame, ComponentSelectionEvent } from '@agentskit/chat-protocol'
import type { ChatReturn, Message as ChatMessage, ToolCall } from '@agentskit/core'
import { StandardComponentComponent } from './standard-component.js'

export { StandardComponentComponent } from './standard-component.js'

export type ChatCssVariables = Readonly<Record<`--ak-${string}`, string | number>>
export const toChatCssVariables = (input?: ChatThemeInput): ChatCssVariables => {
  const theme = resolveChatTheme(input)
  return {
    '--ak-color-bg': theme.colors.background, '--ak-color-surface': theme.colors.surface, '--ak-color-border': theme.colors.border,
    '--ak-color-text': theme.colors.text, '--ak-color-text-muted': theme.colors.muted, '--ak-color-bubble-user': theme.colors.accent,
    '--ak-color-bubble-user-text': theme.colors.onAccent, '--ak-color-bubble-assistant': theme.colors.surface, '--ak-color-bubble-assistant-text': theme.colors.text,
    '--ak-color-input-bg': theme.colors.background, '--ak-color-input-border': theme.colors.border, '--ak-color-input-focus': theme.colors.accent,
    '--ak-color-button': theme.colors.accent, '--ak-color-button-text': theme.colors.onAccent, '--ak-color-tool-bg': theme.colors.surface,
    '--ak-color-tool-border': theme.colors.border, '--ak-app-color-danger': theme.colors.danger,
    '--ak-font-family': theme.fontFamily === 'system' ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" : theme.fontFamily,
    '--ak-radius': `${theme.radius.medium}px`, '--ak-radius-lg': `${theme.radius.large}px`, '--ak-spacing-sm': `${theme.spacing.small}px`,
    '--ak-spacing-md': `${theme.spacing.medium}px`, '--ak-spacing-lg': `${theme.spacing.large}px`,
  }
}

@Component({
  selector: 'ak-choice-list', standalone: true,
  template: `@if (resolved(); as item) { <fieldset [attr.aria-label]="item.props.prompt" data-ak-component="choice-list"><legend>{{ item.props.prompt }}</legend>
    @for (choice of item.props.choices; track choice.id) { <button type="button" [disabled]="disabled" (click)="choose(choice.id)"><span>{{ choice.label }}</span>@if (choice.description) { <small>{{ choice.description }}</small> }</button> }
  </fieldset> }`,
})
export class ChoiceListComponent implements OnChanges {
  @Input({ required: true }) frame!: unknown
  @Input({ required: true }) manifest!: ComponentManifest
  @Input({ required: true }) onSelect!: (event: ComponentSelectionEvent) => void
  @Input() disabled = false
  readonly resolved = signal<Extract<ReturnType<typeof resolveChoiceListFrame>, { ok: true }> | undefined>(undefined)
  ngOnChanges(): void { const value = resolveChoiceListFrame(this.frame, this.manifest); this.resolved.set(value.ok ? value : undefined) }
  choose(choiceId: string): void { const value = this.resolved(); if (value) this.onSelect(selectChoice(value.frame, choiceId)) }
}

interface MessagePresentation {
  readonly kind: 'message' | 'choice' | 'standard' | 'fallback' | 'diagnostic'
  readonly message: ChatMessage
  readonly frame?: ComponentRenderFrame
  readonly fallback?: string
  readonly diagnosticCode?: string
  readonly diagnosticMessage?: string
}

@Component({
  selector: 'ak-agent-chat', standalone: true,
  imports: [NgTemplateOutlet, ChatContainerComponent, MessageComponent, InputBarComponent, ThinkingIndicatorComponent, ToolConfirmationComponent, ChoiceListComponent, StandardComponentComponent],
  providers: [AgentskitChat],
  template: `<section [attr.aria-label]="definition.id + ' chat'" data-ak-app-chat [style]="styleText()">
    <div aria-live="polite" aria-relevant="additions text" role="log"><ng-template #content>
      @for (message of chat()?.messages ?? []; track message.id) { @let view = present(message);
        @switch (view.kind) {
          @case ('choice') { @if (choiceListTemplate) { <ng-container [ngTemplateOutlet]="choiceListTemplate" [ngTemplateOutletContext]="choiceContext(view.frame!)" /> } @else { <ak-choice-list [frame]="view.frame" [manifest]="definition.components!" [disabled]="resolvedInstances().has(view.frame!.instanceId)" [onSelect]="selectFor(view.frame!)" /> } }
          @case ('standard') { @if (standardComponentTemplate) { <ng-container [ngTemplateOutlet]="standardComponentTemplate" [ngTemplateOutletContext]="standardContext(view.frame!)" /> } @else { <ak-standard-component [frame]="view.frame!" [manifest]="definition.components!" [disabled]="resolvedInstances().has(view.frame!.instanceId)" [onInteract]="interact" /> } }
          @case ('fallback') { <p data-ak-component-fallback>{{ view.fallback }}</p> }
          @case ('diagnostic') { <p role="alert" [attr.data-ak-component-diagnostic]="view.diagnosticCode">{{ view.diagnosticMessage }}</p> }
          @default { @if (messageTemplate) { <ng-container [ngTemplateOutlet]="messageTemplate" [ngTemplateOutletContext]="{ $implicit: message }" /> } @else { <ak-message [message]="message" /> } }
        }
      }
      @for (toolCall of toolCalls(); track toolCall.id) { @if (confirmationTemplate) { <ng-container [ngTemplateOutlet]="confirmationTemplate" [ngTemplateOutletContext]="confirmationContext(toolCall)" /> } @else { <ak-tool-confirmation [toolCall]="toolCall" [onApprove]="approve" [onDeny]="deny" /> } }
      @if (thinkingTemplate) { <ng-container [ngTemplateOutlet]="thinkingTemplate" [ngTemplateOutletContext]="{ $implicit: chat()?.status === 'streaming' }" /> } @else { <ak-thinking-indicator [visible]="chat()?.status === 'streaming'" /> }
    </ng-template>@if (containerTemplate) { <ng-container [ngTemplateOutlet]="containerTemplate" [ngTemplateOutletContext]="{ $implicit: content, content: content }" /> } @else { <ak-chat-container><ng-container [ngTemplateOutlet]="content" /></ak-chat-container> }</div>
    @if (displayError(); as currentError) { <p role="alert" [style.color]="dangerColor()">{{ currentError.message }}</p> }
    @if (chat()?.status === 'streaming') { <button type="button" (click)="chat()?.stop()">Stop</button> }
    @if (targets().userId && chat()?.status !== 'streaming') { <div aria-label="Response actions">
      <button type="button" aria-label="Retry response" (click)="run(chat()!.retry())">Retry</button>
      @if (targets().assistantId) { <button type="button" aria-label="Regenerate response" (click)="run(chat()!.regenerate(targets().assistantId!))">Regenerate</button> }
      <button type="button" (click)="beginEdit()">Edit last message</button>
      @if (editDraft(); as draft) { <form (submit)="saveEdit($event)"><label>Edit message<input aria-label="Edit message" [value]="draft.content" (input)="updateEditEvent($event)" /></label><button type="submit" aria-label="Save edit">Save edit</button><button type="button" (click)="editDraft.set(undefined)">Cancel edit</button></form> }
    </div> }
    @if (inputTemplate) { <ng-container [ngTemplateOutlet]="inputTemplate" [ngTemplateOutletContext]="inputContext()" /> } @else if (chat(); as currentChat) { <ak-input-bar [chat]="currentChat" [disabled]="currentChat.status === 'streaming'" [placeholder]="placeholder ?? 'Type a message...'" /> }
  </section>`,
})
export class AgentChatComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) definition!: ChatDefinition
  @Input() placeholder?: string
  @Input() onComponentSelect?: (event: ComponentSelectionEvent) => void
  @Input() onComponentInteract?: (event: ComponentInteractionEvent) => void
  @Input() actionConfirmationTtlMs?: number
  @Input() session?: ChatSession
  @Input() theme?: ChatThemeInput
  @ContentChild('container', { read: TemplateRef }) containerTemplate?: TemplateRef<unknown>
  @ContentChild('message', { read: TemplateRef }) messageTemplate?: TemplateRef<unknown>
  @ContentChild('input', { read: TemplateRef }) inputTemplate?: TemplateRef<unknown>
  @ContentChild('thinking', { read: TemplateRef }) thinkingTemplate?: TemplateRef<unknown>
  @ContentChild('confirmation', { read: TemplateRef }) confirmationTemplate?: TemplateRef<unknown>
  @ContentChild('choiceList', { read: TemplateRef }) choiceListTemplate?: TemplateRef<unknown>
  @ContentChild('standardComponent', { read: TemplateRef }) standardComponentTemplate?: TemplateRef<unknown>

  private readonly service = inject(AgentskitChat)
  readonly chat = computed<ChatReturn | null>(() => this.service.state() ? this.service.snapshot() : null)
  readonly error = signal<Error | null>(null)
  readonly displayError = computed(() => this.chat()?.error ?? this.error())
  readonly editDraft = signal<{ readonly messageId: string; readonly content: string } | undefined>(undefined)
  readonly resolvedInstances = signal(new Set<string>())
  private activeChat?: ChatDefinition['chat']
  private initialized = false
  private definitionId?: string
  private definitionRevision?: number
  private preparedSession: ChatSession | undefined
  private currentSession?: ChatSession
  private confirmation?: ReturnType<ChatSession['createConfirmation']>

  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.definition) return
    const revision = this.definition.revision ?? 1
    const identityChanged = !this.initialized || this.definition.id !== this.definitionId || revision !== this.definitionRevision || this.session !== this.preparedSession
    if (identityChanged) {
      this.initialized = true; this.definitionId = this.definition.id; this.definitionRevision = revision; this.preparedSession = this.session
      this.currentSession = resolveChatSession(this.definition, this.session); this.resolvedInstances.set(new Set()); this.error.set(null); this.editDraft.set(undefined); this.initialize(this.definition.chat, false)
      this.confirmation = this.currentSession.createConfirmation({ ...(this.actionConfirmationTtlMs === undefined ? {} : { ttlMs: this.actionConfirmationTtlMs }), chat: { proposeToolCall: proposal => this.chat()!.proposeToolCall(proposal), approve: id => this.chat()!.approve(id), deny: (id, reason) => this.chat()!.deny(id, reason) } })
    } else if (this.definition.chat !== this.activeChat) this.initialize(this.definition.chat, true)
  }

  ngOnDestroy(): void { this.service.destroy() }
  private initialize(config: ChatDefinition['chat'], preserve: boolean): void {
    const messages = preserve ? this.chat()?.messages : config.initialMessages
    this.activeChat = config; this.service.init(this.currentSession!.updateChat({ ...config, ...(messages === undefined ? {} : { initialMessages: messages }) }))
  }
  readonly styleText = (): string | null => this.theme === undefined ? null : Object.entries(toChatCssVariables(this.theme)).map(([key, value]) => `${key}:${value}`).join(';')
  readonly dangerColor = (): string => resolveChatTheme(this.theme).colors.danger
  readonly targets = () => getLifecycleTargets(this.chat()?.messages ?? [])
  readonly toolCalls = (): ToolCall[] => (this.chat()?.messages ?? []).flatMap(message => message.toolCalls ?? [])
  present(message: ChatMessage): MessagePresentation {
    const decoded = message.role === 'assistant' && isComponentFrameCandidate(message.content) ? decodeComponentFrame(message.content) : undefined
    if (decoded?.ok) { const resolved = this.definition.components === undefined ? undefined : resolveComponentFrame(decoded.frame, this.definition.components); return resolved?.ok ? { kind: decoded.frame.componentKey === 'choice-list' ? 'choice' : 'standard', message, frame: decoded.frame } : { kind: 'fallback', message, fallback: formatSemanticFallback(decoded.frame.fallback) } }
    if (decoded && !decoded.ok) return { kind: 'diagnostic', message, diagnosticCode: decoded.diagnostic.code, diagnosticMessage: decoded.diagnostic.message }
    return { kind: 'message', message }
  }
  readonly selectFor = (frame: ComponentRenderFrame) => (event: ComponentSelectionEvent): void => this.selectComponent(event, frame)
  readonly interact = (event: ComponentInteractionEvent): void => { if (this.resolvedInstances().has(event.instanceId)) return; this.resolvedInstances.update(current => new Set(current).add(event.instanceId)); try { this.onComponentInteract?.(event) } catch (error) { this.resolvedInstances.update(current => { const next = new Set(current); next.delete(event.instanceId); return next }); this.fail(error, 'Component interaction callback failed.') } }
  private selectComponent(event: ComponentSelectionEvent, frame: ComponentRenderFrame): void {
    if (this.resolvedInstances().has(event.instanceId)) return
    this.error.set(null); this.resolvedInstances.update(current => new Set(current).add(event.instanceId))
    try { this.onComponentSelect?.(event) } catch (error) { this.fail(error, 'Component selection callback failed.') }
    const action = resolveChoiceAction(frame, event.choiceId)
    if (action) void this.confirmation!.propose(action).catch(error => { this.resolvedInstances.update(current => { const next = new Set(current); next.delete(event.instanceId); return next }); this.fail(error, 'Action proposal failed.') })
  }
  readonly approve = (id: string): void => { const record = this.confirmation?.getByToolCall(id); void (record ? this.confirmation!.approve(record.token, this.currentSession!.sessionId) : this.chat()!.approve(id)).catch(error => this.fail(error, 'Action approval failed.')) }
  readonly deny = (id: string, reason?: string): void => { const record = this.confirmation?.getByToolCall(id); void (record ? this.confirmation!.reject(record.token, this.currentSession!.sessionId, reason) : this.chat()!.deny(id, reason)).catch(error => this.fail(error, 'Action rejection failed.')) }
  run(operation: Promise<void>): void { this.error.set(null); void operation.catch(error => this.fail(error, 'Lifecycle operation failed.')) }
  beginEdit(): void { const id = this.targets().userId; if (id) this.editDraft.set({ messageId: id, content: this.chat()!.messages.find(message => message.id === id)?.content ?? '' }) }
  updateEdit(content: string): void { const draft = this.editDraft(); if (draft) this.editDraft.set({ ...draft, content }) }
  updateEditEvent(event: Event): void { if (event.target instanceof HTMLInputElement) this.updateEdit(event.target.value) }
  saveEdit(event: Event): void { event.preventDefault(); const draft = this.editDraft(); if (!draft?.content.trim()) return; this.run(this.chat()!.edit(draft.messageId, draft.content)); this.editDraft.set(undefined) }
  inputContext(): Record<string, unknown> { const chat = this.chat(); return { $implicit: chat, chat, disabled: chat?.status === 'streaming', placeholder: this.placeholder } }
  confirmationContext(toolCall: ToolCall): Record<string, unknown> { return { $implicit: toolCall, toolCall, approve: this.approve, deny: this.deny } }
  choiceContext(frame: ComponentRenderFrame): Record<string, unknown> { const props = { frame, manifest: this.definition.components!, disabled: this.resolvedInstances().has(frame.instanceId), onSelect: this.selectFor(frame) }; return { $implicit: props, ...props } }
  standardContext(frame: ComponentRenderFrame): Record<string, unknown> { const props = { frame, manifest: this.definition.components!, disabled: this.resolvedInstances().has(frame.instanceId), onInteract: this.interact }; return { $implicit: props, ...props } }
  private fail(error: unknown, fallback: string): void { this.error.set(error instanceof Error ? error : new Error(fallback)) }
}

export type { ChatDefinition } from '@agentskit/chat'
