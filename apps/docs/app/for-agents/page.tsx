import { redirect } from 'next/navigation'

/** Maintainer handoffs live in the repository, not the public docs tree. */
export default function ForAgentsPage() {
  redirect('https://github.com/AgentsKit-io/agentskit-chat/tree/main/docs/for-agents')
}
