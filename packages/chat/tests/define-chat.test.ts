import type { AdapterFactory } from '@agentskit/core'
import { describe, expect, it } from 'vitest'

import { defineChat } from '../src/index.js'

const adapter: AdapterFactory = {
  createSource: () => ({
    async *stream() {
      yield { type: 'done' }
    },
    abort() {},
  }),
}

describe('defineChat', () => {
  it('preserves the definition and upstream ChatConfig reference', () => {
    const chat = { adapter }
    const definition = defineChat({ id: 'support', chat })

    expect(definition).toEqual({ id: 'support', chat })
    expect(definition.chat).toBe(chat)
  })
})
