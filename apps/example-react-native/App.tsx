import { onboardingApplication, operationsApplication, supportChat, unauthorizedOperationsApplication } from '@agentskit/chat-example-shared'
import { createChatSession } from '@agentskit/chat'
import { decodeTurnEvent, snapshotMessages } from '@agentskit/chat-protocol'
import { validTurnEventFixtures } from '@agentskit/chat-protocol/fixtures'
import { AgentChatNative } from '@agentskit/chat-react-native'
import { SafeAreaView, StyleSheet, Text, View } from 'react-native'

const completeSnapshot = decodeTurnEvent(validTurnEventFixtures[3].event)
if (!completeSnapshot.ok || completeSnapshot.event.event !== 'server.turn.snapshot') {
  throw new Error('Committed protocol conformance fixture is invalid.')
}
const protocolConformanceChat = {
  ...supportChat,
  chat: { ...supportChat.chat, initialMessages: snapshotMessages(completeSnapshot.event) },
}
const supportSession = createChatSession(protocolConformanceChat, { sessionId: 'support-demo' })
const onboarding = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('reference') === 'onboarding'
const operations = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('reference')?.startsWith('operations') === true
const operationsApp = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('reference') === 'operations-unauthorized' ? unauthorizedOperationsApplication : operationsApplication

export default function App() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{operations ? 'NORTHSTAR · OPERATIONS' : onboarding ? 'NORTHSTAR · GUIDED SETUP' : 'NORTHSTAR SUPPORT · ONLINE'}</Text>
        <Text accessibilityRole="header" style={styles.title}>{operations ? 'Inspect safely. Change deliberately.' : onboarding ? 'Build a workspace around the way you work.' : 'Answers now. A human when you need one.'}</Text>
        <Text style={styles.lede}>{operations ? 'Type /operations to inspect or restart a protected service.' : onboarding ? 'Type /onboarding to begin a deterministic, revisable setup.' : 'Ask a question, or type /support for a confirmed ticket.'}</Text>
      </View>
      {operations
        ? <AgentChatNative definition={operationsApp.definition} session={operationsApp.session} placeholder="Type /operations to begin" />
        : onboarding
        ? <AgentChatNative definition={onboardingApplication.definition} session={onboardingApplication.session} onComponentInteract={onboardingApplication.onComponentInteract} onComponentSelect={onboardingApplication.onComponentSelect} placeholder="Type /onboarding to begin" />
        : <AgentChatNative definition={protocolConformanceChat} session={supportSession} placeholder="Ask support or type /support" />}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, backgroundColor: '#f2f0e8' },
  header: { gap: 10, marginBottom: 20 },
  eyebrow: { color: '#17634a', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: '#17201d', fontSize: 30, fontWeight: '700', lineHeight: 34 },
  lede: { color: '#50605a', fontSize: 16 },
})
