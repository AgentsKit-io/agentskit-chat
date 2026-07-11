import { buildMessage, type AdapterFactory } from '@agentskit/core'
import { ChoiceListComponent, commandRoute, createChatSession, defineChat, defineComponentManifest } from '@agentskit/chat'
import { createApp, defineComponent, h, nextTick, shallowRef, type Component, type PropType } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { invalidChoiceListPropsFrame, invalidComponentFrameFixtures, unknownComponentFrame, validChoiceListFrame } from '../../protocol/src/fixtures.js'
import { AgentChat, ChoiceList, toChatCssVariables } from '../src/index.js'

const apps: Array<ReturnType<typeof createApp>> = []
const mount = async (component: Component): Promise<HTMLElement> => {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const app = createApp({ render: () => h(component) }); apps.push(app); app.mount(root)
  await nextTick()
  return root
}
afterEach(() => { apps.splice(0).forEach(app => app.unmount()); document.body.replaceChildren(); vi.restoreAllMocks() })

const adapter = (fail = false): AdapterFactory => ({
  createSource: request => ({
    async *stream() {
      if (fail) { yield { type: 'error', content: 'Test adapter failed' }; return }
      const prompt = request.messages.filter(message => message.role === 'user').at(-1)?.content ?? ''
      yield { type: 'text', content: `Echo: ${prompt}` }
      yield { type: 'done' }
    },
    abort() {},
  }),
})

const click = async (root: HTMLElement, selector: string): Promise<void> => {
  const element = root.querySelector(selector) as HTMLButtonElement | null
  expect(element).toBeTruthy()
  element?.click()
  await nextTick()
}
const settle = async (): Promise<void> => { await new Promise(resolve => setTimeout(resolve, 0)); await nextTick() }

describe('AgentChat Vue', () => {
  it('maps semantic tokens and accepts a native scoped slot', async () => {
    expect(toChatCssVariables({ colors: { accent: '#663399' }, radius: { large: 20 } })).toMatchObject({ '--ak-color-button': '#663399', '--ak-radius-lg': '20px' })
    const root = await mount({ render: () => h(AgentChat, { definition: { id: 'slots', chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'assistant', content: 'hello' })] } } }, { message: ({ message }: { message: { content: string } }) => h('strong', `Slot: ${message.content}`) }) })
    expect(root.textContent).toContain('Slot: hello')
  })

  it('renders and selects a validated ChoiceList accessibly', async () => {
    const onSelect = vi.fn()
    const root = await mount({ render: () => h(ChoiceList, { frame: validChoiceListFrame, manifest: defineComponentManifest([ChoiceListComponent]), onSelect }) })
    expect(root.querySelector('fieldset')?.getAttribute('aria-label')).toBe('Where should we go?')
    await click(root, 'button')
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ choiceId: 'docs' }))
  })

  it('executes hello world and deterministic ChoiceList flows', async () => {
    const selected = vi.fn()
    const definition = defineChat({
      id: 'flow', chat: { adapter: adapter() }, components: defineComponentManifest([ChoiceListComponent]),
      conversation: { initial: 'idle', states: { idle: { on: { choose: 'done' } }, done: {} }, routes: [commandRoute({ id: 'choose', command: '/choose', event: 'choose', response: () => JSON.stringify(validChoiceListFrame) })] },
    })
    const root = await mount({ render: () => h(AgentChat, { definition, onComponentSelect: selected }) })
    const input = root.querySelector('textarea') as HTMLTextAreaElement
    input.value = 'hello'; input.dispatchEvent(new Event('input')); await nextTick(); (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit')); await settle()
    expect(root.textContent).toContain('Echo: hello')
    input.value = '/choose'; input.dispatchEvent(new Event('input')); await nextTick(); (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit')); await settle()
    await click(root, '[data-ak-component="choice-list"] button')
    expect(selected).toHaveBeenCalledOnce()
  })

  it('renders semantic fallbacks and invalid diagnostics inertly', async () => {
    const manifest = defineComponentManifest([ChoiceListComponent])
    const frames = [unknownComponentFrame, invalidChoiceListPropsFrame, invalidComponentFrameFixtures[1]!.frame]
    const root = await mount({ render: () => h(AgentChat, { definition: { id: 'fallbacks', components: manifest, chat: { adapter: adapter(), initialMessages: frames.map((frame, index) => buildMessage({ id: `m${index}`, role: 'assistant', content: JSON.stringify(frame) })) } } }) })
    expect(root.querySelector('[data-ak-component-fallback]')).toBeTruthy()
    expect(root.querySelector('[data-ak-component-diagnostic]')).toBeTruthy()
  })

  it('remounts for a new prepared session and rejects incompatible revisions', async () => {
    const definition = defineChat({ id: 'session', revision: 1, chat: { adapter: adapter() } })
    const first = createChatSession(definition, { sessionId: 'one' })
    const second = createChatSession(definition, { sessionId: 'two' })
    const firstSpy = vi.spyOn(first, 'createConfirmation'); const secondSpy = vi.spyOn(second, 'createConfirmation')
    const session = shallowRef(first)
    const root = await mount({ render: () => h(AgentChat, { definition, session: session.value }) })
    expect(root.querySelector('[data-ak-chat]')).toBeTruthy(); expect(firstSpy).toHaveBeenCalledOnce()
    session.value = second
    await nextTick()
    expect(secondSpy).toHaveBeenCalledOnce()
  })

  it('surfaces adapter failures as alerts', async () => {
    const root = await mount({ render: () => h(AgentChat, { definition: { id: 'error', chat: { adapter: adapter(true) } } }) })
    const input = root.querySelector('textarea') as HTMLTextAreaElement
    input.value = 'fail'; input.dispatchEvent(new Event('input')); await nextTick(); (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit')); await settle()
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Test adapter failed')
  })

  it('proposes, approves, and deduplicates a typed choice action', async () => {
    const execute = vi.fn()
    const actionableFrame = { ...validChoiceListFrame, props: { ...validChoiceListFrame.props, choices: validChoiceListFrame.props.choices.map(choice => choice.id === 'docs' ? { ...choice, action: { name: 'open-docs', input: { path: '/guide' } } } : choice) } }
    const root = await mount({ render: () => h(AgentChat, { actionConfirmationTtlMs: 10_000, onComponentSelect: () => { throw new Error('observer failed') }, definition: defineChat({
      id: 'action', components: defineComponentManifest([ChoiceListComponent]),
      chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'assistant', content: JSON.stringify(actionableFrame) })], tools: [{ name: 'open-docs', requiresConfirmation: true, execute, schema: { type: 'object' } }], validateArgs: (_schema, args) => ({ valid: args.path === '/guide' }) },
    }) }) })
    await click(root, '[data-ak-component="choice-list"] button')
    await click(root, '[data-ak-component="choice-list"] button')
    await settle()
    expect(root.querySelectorAll('[data-ak-tool-confirmation-approve]')).toHaveLength(1)
    await click(root, '[data-ak-tool-confirmation-approve]')
    await settle()
    expect(execute).toHaveBeenCalledOnce()
  })

  it('routes retry, regenerate, edit, and cancel through upstream lifecycle controls', async () => {
    const root = await mount({ render: () => h(AgentChat, { placeholder: 'Ask', definition: { id: 'lifecycle', chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'user', content: 'old' }), buildMessage({ role: 'assistant', content: 'Echo: old' })] } } }) })
    expect((root.querySelector('textarea') as HTMLTextAreaElement).placeholder).toBe('Ask')
    await click(root, '[aria-label="Retry response"]'); await settle()
    await click(root, '[aria-label="Regenerate response"]'); await settle()
    await click(root, 'button:not([aria-label])')
    const edit = root.querySelector('[aria-label="Edit message"]') as HTMLInputElement
    edit.value = 'updated'; edit.dispatchEvent(new Event('input')); await nextTick()
    ;(edit.closest('form') as HTMLFormElement).dispatchEvent(new Event('submit')); await settle()
    expect(root.textContent).toContain('Echo: updated')
  })

  it('uses native scoped slots for the shell primitives', async () => {
    const calls: string[] = []
    const root = await mount({ render: () => h(AgentChat, { definition: { id: 'native-slots', chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'assistant', content: 'hello' })] } } }, {
      container: ({ children }: { children: unknown }) => { calls.push('container'); return h('main', { 'data-custom-container': '' }, children as never) },
      thinking: () => { calls.push('thinking'); return h('i', 'idle') },
      input: () => { calls.push('input'); return h('label', 'custom input') },
    }) })
    expect(root.querySelector('[data-custom-container]')).toBeTruthy()
    expect(root.textContent).toContain('custom input')
    expect(calls).toEqual(expect.arrayContaining(['container', 'thinking', 'input']))
  })

  it('keys stateful message slots by message identity across edits', async () => {
    const mountedIds: string[] = []
    const StatefulMessage = defineComponent({
      props: { message: { type: Object as PropType<{ id: string, content: string }>, required: true } },
      setup(props) { mountedIds.push(props.message.id); return () => h('p', { 'data-stateful-message': props.message.id }, props.message.content) },
    })
    const root = await mount({ render: () => h(AgentChat, { definition: { id: 'keyed-slots', chat: { adapter: adapter(), initialMessages: [buildMessage({ role: 'user', content: 'old' }), buildMessage({ role: 'assistant', content: 'Echo: old' })] } } }, { message: ({ message }: { message: { content: string } }) => h(StatefulMessage, { message }) }) })
    await click(root, 'button:not([aria-label])')
    const input = root.querySelector('[aria-label="Edit message"]') as HTMLInputElement
    input.value = 'updated'; input.dispatchEvent(new Event('input')); await nextTick()
    ;(input.closest('form') as HTMLFormElement).dispatchEvent(new Event('submit')); await settle()
    expect([...root.querySelectorAll('[data-stateful-message]')].map(element => element.textContent)).toEqual(['updated', 'Echo: updated'])
    expect(mountedIds).toHaveLength(3)
  })

  it('updates the upstream controller config while preserving conversation progress', async () => {
    const makeDefinition = (answer: string) => defineChat({
      id: 'stable-session',
      chat: { adapter: { createSource: () => ({ async *stream() { yield { type: 'text' as const, content: answer }; yield { type: 'done' as const } }, abort() {} }) } },
      conversation: { initial: 'idle', states: { idle: { on: { start: 'complete' } }, complete: {} }, routes: [commandRoute({ id: 'start', command: '/start', event: 'start', response: () => 'Started' })] },
    })
    const definition = shallowRef(makeDefinition('Old adapter'))
    const session = createChatSession(definition.value, { sessionId: 'stable' })
    const root = await mount({ render: () => h(AgentChat, { definition: definition.value, session }) })
    let input = root.querySelector('textarea') as HTMLTextAreaElement
    input.value = '/start'; input.dispatchEvent(new Event('input')); await nextTick(); (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit')); await settle()
    expect(root.textContent).toContain('Started')
    expect(session.getConversationSnapshot()?.state).toBe('complete')
    definition.value = makeDefinition('Updated adapter'); await settle()
    input = root.querySelector('textarea') as HTMLTextAreaElement
    input.value = 'hello'; input.dispatchEvent(new Event('input')); await nextTick(); (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit')); await settle()
    expect(root.textContent).toContain('Updated adapter')
    expect(session.getConversationSnapshot()?.state).toBe('complete')
  })
})
