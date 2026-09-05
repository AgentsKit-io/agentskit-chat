import type { Metadata } from 'next'
import { ObservabilityDemo } from '@/components/examples/observability-demo'

export const metadata: Metadata = { title: 'Make Agents Observable', description: 'A credential-free AgentsKit investigation: trace decisions, tool failures, approval and recovery.' }
export default function ObservabilityDemoPage() { return <ObservabilityDemo /> }
