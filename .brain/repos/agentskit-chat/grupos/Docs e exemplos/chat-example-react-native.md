---
tipo: app
repo: agentskit-chat
grupo: Docs e exemplos
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática no HEAD; routing/ownership consultado em doc-bridge.config.json; CLI doc-bridge indisponível por pnpm ausente"
fontes: ["apps/example-react-native/App.tsx", "apps/example-react-native/package.json", "apps/example-shared/tests/support.test.ts", "docs/for-agents/apps/example-react-native.md"]
tags: [app, repo/agentskit-chat, grupo/docs-e-exemplos]
---

# @agentskit/chat-example-react-native

> [!tldr] Em linguagem comum
> App Expo que demonstra referências compartilhadas em dispositivo nativo.

← [[00 Grupo - agentskit-chat - Docs e exemplos]]

## O que faz e por que existe

App Expo que demonstra referências compartilhadas em dispositivo nativo. A propriedade separa apresentação de contratos e domínio, usando exemplos para demonstrar composição real.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `export default function App` | exportação/entrada demonstrativa | Composição real do host ou definição | `apps/example-react-native/App.tsx:22` |

Exemplo real (`apps/example-react-native/App.tsx:22`):

```tsx
export default function App() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{rag ? 'NORTHSTAR · GROUNDED KNOWLEDGE' : operations ? 'NORTHSTAR · OPERATIONS' : onboarding ? 'NORTHSTAR · GUIDED SETUP' : 'NORTHSTAR SUPPORT · ONLINE'}</Text>
        <Text accessibilityRole="header" style={styles.title}>{rag ? 'Answers grounded in sources you can inspect.' : operations ? 'Inspect safely. Change deliberately.' : onboarding ? 'Build a workspace around the way you work.' : 'Answers now. A human when you need one.'}</Text>
        <Text style={styles.lede}>{rag ? 'Ask a documentation question to retrieve a cited answer.' : operations ? 'Type /operations to inspect or restart a protected service.' : onboarding ? 'Type /onboarding to begin a deterministic, revisable setup.' : 'Ask a question, or type /support for a confirmed ticket.'}</Text>
```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | [[chat]]; [[chat-react]] |
| Dependências | [[00 Hub - agentskit]] e workspace `@agentskit/chat` conforme manifesto. |

## Dados e efeitos

Lê módulos e fixtures locais. O host de docs pode expor HTTP e consultar serviço configurado; exemplos usam serviços em memória ou adapters injetados. Nenhum segredo ou valor de ambiente é registrado nesta nota.

## Como mexer (para agentes)

- **Entrada:** `apps/example-react-native/App.tsx`.
- **Invariantes:** Dependências de módulos nativos ficam no host Expo.
- **Testes:** `apps/example-shared/tests/support.test.ts`.
- **Validação:** `pnpm --filter @agentskit/chat-example-react-native build`.
- **Armadilhas:** manter a fonte canônica de domínio em example-shared; não afirmar deploy a partir de configuração local.
- **Adoção upstream:** compor pacotes publicados; gaps genéricos pertencem ao AgentsKit conforme `AGENTS.md:1`.

## Decisões e história

ADRs relacionados: [[agentskit-chat ADR-0001 - Framework-neutral core with native renderers]], [[agentskit-chat ADR-0030 - Certify ecosystem product chats through one application]]. Para histórico detalhado, `git log --oneline -15 -- apps/example-react-native`; commits relevantes visíveis neste checkout incluem `4891be6` (release 0.6.0) e `6723cd7` (políticas de decisão e conteúdo referenciado).

> [!info]- Detalhe técnico
> `apps/example-react-native/App.tsx:1` — ponto de entrada citado; `apps/example-react-native/package.json:1` — dependências e scripts; `docs/for-agents/apps/example-react-native.md:1` — handoff do app; `apps/example-shared/tests/support.test.ts:1` — cobertura relacionada.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
