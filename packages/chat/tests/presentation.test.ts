import { buildMessage } from '@agentskit/core'
import { createAssistantContentEncoder } from '@agentskit/chat-protocol'
import { validChoiceListFrame } from '@agentskit/chat-protocol/fixtures'
import { describe, expect, it } from 'vitest'

import { presentChatMessage } from '../src/index.js'

describe('cross-renderer assistant presentation', () => {
  it('coalesces ordered text and preserves component order for every renderer', () => {
    const encoder = createAssistantContentEncoder()
    const message = buildMessage({
      role: 'assistant',
      content: encoder.encode({ kind: 'text', text: 'Choose ' })
        + encoder.encode({ kind: 'text', text: 'documentation.' })
        + encoder.encode({ kind: 'component', frame: validChoiceListFrame }),
    })
    expect(presentChatMessage(message)).toEqual([
      { kind: 'message', message: { ...message, content: 'Choose documentation.' } },
      { kind: 'component', frame: validChoiceListFrame },
    ])
  })

  it('keeps malformed ordered content inert and diagnostic', () => {
    const message = buildMessage({ role: 'assistant', content: '\u001eagentskit.chat.content:{bad}\n' })
    expect(presentChatMessage(message)).toEqual([{
      kind: 'diagnostic', code: 'ASSISTANT_CONTENT_INVALID_RECORD', message: 'Assistant content envelope is invalid.',
    }])
  })
})
