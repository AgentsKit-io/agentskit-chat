import { helloWorldChat } from '@agentskit/chat-example-shared'
import { AgentChatNative } from '@agentskit/chat-react-native'
import { SafeAreaView, StyleSheet, Text, View } from 'react-native'

export default function App() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text>AgentsKit Chat · React Native vertical slice</Text>
        <Text accessibilityRole="header" style={styles.title}>One definition. Native mobile.</Text>
      </View>
      <AgentChatNative definition={helloWorldChat} placeholder="Send a message or type /slow" />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24 },
  header: { gap: 8, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700' },
})
