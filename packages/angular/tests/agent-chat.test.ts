import { Component, TemplateRef, viewChild } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { NgTemplateOutlet } from '@angular/common'
import { buildMessage, type AdapterFactory } from '@agentskit/core'
import { ChoiceListComponent as ChoiceListDefinition, createChatSession, defineChat, defineComponentManifest, type ChatDefinition } from '@agentskit/chat'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { invalidComponentFrameFixtures, unknownComponentFrame, validChoiceListFrame } from '../../protocol/src/fixtures.js'
import { AgentChatComponent, ChoiceListComponent, toChatCssVariables } from '../src/index.js'

const adapter = (answer = 'Hello from Angular'): AdapterFactory => ({
  createSource: () => ({
    async *stream() { yield { type: 'text', content: answer }; yield { type: 'done' } },
    abort() {},
  }),
})

const failingAdapter: AdapterFactory = { createSource: () => ({ async *stream() { yield { type: 'error', content: 'Angular adapter failed' } }, abort() {} }) }

const definition = (initialMessages = [buildMessage({ role: 'assistant', content: 'hello' })]) => defineChat({
  id: 'angular-chat',
  chat: { adapter: adapter(), initialMessages },
})

const mount = (value: ChatDefinition = definition()) => {
  const fixture = TestBed.createComponent(AgentChatComponent)
  fixture.componentRef.setInput('definition', value)
  fixture.detectChanges()
  return fixture
}

const settle = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 0))
  TestBed.tick()
}

afterEach(() => {
  TestBed.resetTestingModule()
  vi.restoreAllMocks()
})

describe('AgentChat Angular', () => {
  it('maps semantic theme tokens to upstream CSS variables', () => {
    expect(toChatCssVariables({ colors: { accent: '#663399' }, radius: { large: 20 } })).toMatchObject({
      '--ak-color-button': '#663399',
      '--ak-color-bubble-user': '#663399',
      '--ak-radius-lg': '20px',
    })
  })

  it('renders the upstream Angular shell and messages', () => {
    const fixture = mount()
    expect(fixture.nativeElement.querySelector('[data-ak-app-chat]')).toBeTruthy()
    expect(fixture.nativeElement.querySelector('[data-ak-message]').textContent).toContain('hello')
    expect(fixture.nativeElement.querySelector('[data-ak-input]')).toBeTruthy()
  })

  it('renders and selects a validated ChoiceList accessibly', () => {
    const onSelect = vi.fn()
    const fixture = TestBed.createComponent(ChoiceListComponent)
    fixture.componentRef.setInput('frame', validChoiceListFrame)
    fixture.componentRef.setInput('manifest', defineComponentManifest([ChoiceListDefinition]))
    fixture.componentRef.setInput('onSelect', onSelect)
    fixture.detectChanges()
    const fieldset = fixture.nativeElement.querySelector('fieldset')
    expect(fieldset.getAttribute('aria-label')).toBe('Where should we go?')
    fieldset.querySelector('button').click()
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ choiceId: 'docs' }))
  })

  it('renders semantic fallbacks and invalid diagnostics inertly', () => {
    const messages = [unknownComponentFrame, invalidComponentFrameFixtures[1]!.frame].map(frame =>
      buildMessage({ role: 'assistant', content: JSON.stringify(frame) }),
    )
    const fixture = mount(defineChat({
      id: 'frames', components: defineComponentManifest([ChoiceListDefinition]),
      chat: { adapter: adapter(), initialMessages: messages },
    }))
    expect(fixture.nativeElement.querySelector('[data-ak-component-fallback]')).toBeTruthy()
    expect(fixture.nativeElement.querySelector('[data-ak-component-diagnostic]')).toBeTruthy()
  })

  it('remounts for a new prepared session', () => {
    const value = definition([])
    const first = createChatSession(value, { sessionId: 'one' })
    const second = createChatSession(value, { sessionId: 'two' })
    const firstSpy = vi.spyOn(first, 'createConfirmation')
    const secondSpy = vi.spyOn(second, 'createConfirmation')
    const fixture = TestBed.createComponent(AgentChatComponent)
    fixture.componentRef.setInput('definition', value)
    fixture.componentRef.setInput('session', first)
    fixture.detectChanges()
    fixture.componentRef.setInput('session', second)
    fixture.detectChanges()
    expect(firstSpy).toHaveBeenCalledOnce()
    expect(secondSpy).toHaveBeenCalledOnce()
  })

  it('updates controller config while preserving conversation messages', async () => {
    const first = defineChat({ id: 'swap', chat: { adapter: adapter('first') } })
    const fixture = mount(first)
    await fixture.componentInstance.chat()!.send('hello')
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).toContain('first')
    fixture.componentRef.setInput('definition', defineChat({ id: 'swap', chat: { adapter: adapter('second') } }))
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).toContain('first')
    await fixture.componentInstance.chat()!.send('again')
    await settle()
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).toContain('second')
  })

  it('surfaces upstream adapter failures as accessible alerts', async () => {
    const fixture = mount(defineChat({ id: 'error', chat: { adapter: failingAdapter } }))
    await fixture.componentInstance.chat()!.send('fail')
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Angular adapter failed')
  })

  it('clears session-local edit and error state when the session changes', () => {
    const value = definition([buildMessage({ role: 'user', content: 'old' })])
    const fixture = TestBed.createComponent(AgentChatComponent)
    fixture.componentRef.setInput('definition', value)
    fixture.componentRef.setInput('session', createChatSession(value, { sessionId: 'one' }))
    fixture.detectChanges()
    fixture.componentInstance.beginEdit()
    fixture.componentInstance.error.set(new Error('old session'))
    fixture.componentRef.setInput('session', createChatSession(value, { sessionId: 'two' }))
    fixture.detectChanges()
    expect(fixture.componentInstance.editDraft()).toBeUndefined()
    expect(fixture.componentInstance.error()).toBeNull()
  })

  it('deduplicates typed choice selections', async () => {
    const selected = vi.fn()
    const fixture = mount(defineChat({
      id: 'choices', components: defineComponentManifest([ChoiceListDefinition]),
      chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'assistant', content: JSON.stringify(validChoiceListFrame) })] },
    }))
    fixture.componentRef.setInput('onComponentSelect', selected)
    fixture.detectChanges()
    const choice = fixture.nativeElement.querySelector('[data-ak-component="choice-list"] button') as HTMLButtonElement
    choice.click(); choice.click()
    fixture.detectChanges()
    expect(selected).toHaveBeenCalledOnce()
    expect(choice.disabled).toBe(true)
  })

  it('destroys the upstream controller with the Angular component', async () => {
    const aborted = vi.fn()
    const fixture = mount(defineChat({ id: 'cleanup', chat: { adapter: { createSource: () => ({ async *stream() { await new Promise(() => {}) }, abort: aborted }) } } }))
    void fixture.componentInstance.chat()!.send('wait')
    await new Promise(resolve => setTimeout(resolve, 0))
    fixture.destroy()
    expect(aborted).toHaveBeenCalledOnce()
  })
})

@Component({
  standalone: true,
  imports: [AgentChatComponent, NgTemplateOutlet],
  template: `<ak-agent-chat [definition]="definition">
    <ng-template #container let-content="content"><main data-custom-container><ng-container [ngTemplateOutlet]="content" /></main></ng-template>
    <ng-template #message let-message><strong data-custom-message>Slot: {{ message.content }}</strong></ng-template>
  </ak-agent-chat>`,
})
class TemplateHost {
  readonly definition = definition()
  readonly message = viewChild<TemplateRef<unknown>>('message')
}

it('supports native Angular content templates', () => {
  const fixture = TestBed.createComponent(TemplateHost)
  fixture.detectChanges()
  expect(fixture.nativeElement.querySelector('[data-custom-container]')).toBeTruthy()
  expect(fixture.nativeElement.querySelector('[data-custom-message]').textContent).toContain('Slot: hello')
})
