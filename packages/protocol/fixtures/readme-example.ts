import { decodeTurnEvent } from '@agentskit/chat-protocol'

const result = decodeTurnEvent({ unexpected: true })
if (result.ok) throw new Error('expected invalid turn event')