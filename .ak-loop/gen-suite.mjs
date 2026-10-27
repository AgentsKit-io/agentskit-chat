import { mkdirSync, writeFileSync } from 'node:fs'

const A = 'docs/architecture/adrs/'
const cases = [
  ['symbol-create-chat-handler', 'createChatHandler', 'symbol', 'en', ['docs/server.mdx', 'docs/api-reference.mdx', 'docs/deployment.mdx', 'docs/guides/connect-backend.mdx', A + '0012-web-standard-snapshot-handler.md']],
  ['symbol-decode-turn-event', 'decodeTurnEvent', 'symbol', 'en', ['docs/protocol/v1.md', 'docs/server.mdx']],
  ['symbol-define-chat', 'defineChat', 'symbol', 'en', ['docs/api-reference.mdx', 'docs/for-agents/packages/chat.md', 'docs/getting-started/index.mdx', 'docs/architecture/overview.md']],
  ['symbol-create-trace-capture', 'createTraceCapture', 'symbol', 'en', ['docs/devtools.md']],
  ['symbol-compare-renderer-outcomes', 'compareRendererOutcomes', 'symbol', 'en', ['docs/devtools.md']],
  ['symbol-create-capability-policy', 'createCapabilityPolicy', 'symbol', 'en', ['docs/actions/policy.mdx', A + '0009-trusted-capability-policy.md', 'docs/for-agents/packages/chat.md']],
  ['symbol-create-ask-service-handler', 'createAskServiceHandler', 'symbol', 'en', ['docs/backend.mdx', 'docs/api-reference.mdx', A + '0026-trusted-ask-backend-vertical.md', 'docs/guides/connect-backend.mdx']],
  ['symbol-resolve-chat-theme', 'resolveChatTheme', 'symbol', 'en', ['docs/theming-and-composition.mdx', 'docs/guides/style.mdx']],
  ['symbol-decode-session-snapshot', 'decodeSessionSnapshot', 'symbol', 'en', ['docs/protocol/v1.md']],
  ['symbol-create-chat-session', 'createChatSession', 'symbol', 'en', ['docs/conversation/routes-and-state.mdx', 'docs/for-agents/packages/chat.md']],
  ['symbol-command-route', 'commandRoute', 'symbol', 'en', ['docs/conversation/routes-and-state.mdx']],
  ['symbol-create-action-confirmation', 'createActionConfirmation', 'symbol', 'en', ['docs/actions/confirmation.mdx', A + '0008-typed-actions-use-upstream-confirmation.md']],
  ['symbol-chat-session-ddl', 'chatSessionDDL', 'symbol', 'en', ['docs/consumo-produtos.md']],
  ['question-confirm-side-effects', 'How do I require confirmation before a side-effecting action runs?', 'question', 'en', ['docs/actions/confirmation.mdx', 'docs/actions/policy.mdx']],
  ['question-deploy-handler', 'How do I deploy the same chat definition on Next, Hono, Express or the edge?', 'question', 'en', ['docs/deployment.mdx']],
  ['question-protocol-owner', 'Which package owns the versioned turn event schemas and compatibility policy?', 'question', 'en', ['docs/for-agents/packages/protocol.md', 'docs/protocol/v1.md']],
  ['question-install-cli', 'How do I scaffold a chat project with the CLI?', 'question', 'en', ['docs/cli.mdx', 'docs/guides/install-and-run.mdx', 'docs/for-agents/packages/cli.md']],
  ['question-add-rag', 'How do I add retrieval with cited sources to the chat?', 'question', 'en', ['docs/guides/add-rag.mdx', 'docs/examples/rag-reference.md']],
  ['question-deterministic-answers', 'How are deterministic answers served without calling a model?', 'question', 'en', ['docs/protocol/deterministic-answers.md', A + '0024-deterministic-answer-plane.md']],
  ['question-replay-traces', 'How do I record and replay application traces?', 'question', 'en', ['docs/devtools.md', A + '0017-application-traces-compose-upstream-replay.md']],
  ['ownership-vue', 'Who owns packages/vue?', 'ownership', 'en', ['docs/for-agents/packages/vue.md']],
  ['ownership-server', 'Who owns packages/server?', 'ownership', 'en', ['docs/for-agents/packages/server.md']],
  ['ownership-docs-app', 'Who owns apps/docs?', 'ownership', 'en', ['docs/for-agents/apps/docs.md']],
  ['path-react-native', 'packages/react-native', 'path', 'en', ['docs/for-agents/packages/react-native.md', 'docs/getting-started/react-native.mdx']],
  ['path-example-ink', 'apps/example-ink', 'path', 'en', ['docs/for-agents/apps/example-ink.md']],
  ['question-pt-consumo', 'Como consumir o chat nos produtos Expenses e Receitas?', 'question', 'pt', ['docs/consumo-produtos.md']],
  ['question-pt-trilha-estado', 'Qual é o estado real da trilha 04 por etapa?', 'question', 'pt', ['docs/trilha-04-estado.md']],
  ['question-pt-trilha-validacao', 'Como foi a validação de continuidade da trilha 04?', 'question', 'pt', ['docs/trilha-04-validacao-2026-10-10.md']],
  ['question-pt-migracoes', 'Quais migrações de sessão aplicar no Postgres?', 'question', 'pt', ['docs/consumo-produtos.md', 'docs/architecture/adrs/0036-drizzle-postgres-session-storage.md']],
]

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const suite = {
  evalFormatVersion: '2026-04',
  name: 'agentskit-chat-retrieval-v1',
  description:
    'Golden retrieval queries for this repository: exported symbols, directory paths, ownership routing and natural-language questions in English and Portuguese. A case passes when one of its expected targets appears in the top results.',
  tags: ['retrieval', 'doc-bridge', 'deterministic'],
  cases: cases.map(([id, input, kind, lang, targets]) => ({
    id,
    input,
    expected: { regex: { body: targets.map(esc).join('|') } },
    metadata: { expectedTargets: targets, lang, kind },
  })),
}
mkdirSync('docs/bench', { recursive: true })
writeFileSync('docs/bench/retrieval-suite-v1.json', JSON.stringify(suite, null, 2) + '\n')
console.log(cases.length)
