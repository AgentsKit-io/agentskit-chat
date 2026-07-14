import { unavailableAskResponse } from '@/lib/ask-handler'

export const dynamic = 'force-dynamic'

// Deployments either set NEXT_PUBLIC_ASK_ENDPOINT to a hosted Ask service or
// replace this route's host composition with injected AgentsKit adapters.
export async function POST() { return unavailableAskResponse() }
