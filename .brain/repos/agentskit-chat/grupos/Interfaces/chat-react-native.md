---
tipo: pacote
repo: agentskit-chat
grupo: Interfaces
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente); auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/react-native.md", "packages/react-native/fixtures/readme-example.tsx", "packages/react-native/package.json", "packages/react-native/src/index.tsx", "packages/react-native/tests/agent-chat-native.test.tsx", "packages/react-native/tests/protocol-conformance.test.ts"]
tags: [pacote, repo/agentskit-chat, grupo/interfaces, camada/ferramenta]
---

# @agentskit/chat-react-native

> [!tldr] Em linguagem comum
> Apresenta a conversa AgentsKit em React Native, conservando a definição compartilhada e os componentes nativos.

← [[00 Grupo - agentskit-chat - Interfaces]]

## O que faz e por que existe

Apresenta a conversa AgentsKit em React Native, conservando a definição compartilhada e os componentes nativos. Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. O modo controlado ([[agentskit-chat ADR-0031 - Chat controlado externamente como costura da aplicação]]) existe só em React e Ink; este renderer não o implementa (nenhuma ocorrência de "controlled" em `src/`).

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentChatNative(props: AgentChatNativeProps): ReactElement` | componente | Shell nativo | `packages/react-native/src/index.tsx:256` |
| `StandardComponentNative` | componente | Frame semântico nativo | `packages/react-native/src/index.tsx:17` |

Exemplo real (`packages/react-native/fixtures/readme-example.tsx`):

```ts
import { AgentChatNative } from '@agentskit/chat/react-native'

```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | Workspace `private` (`packages/react-native/package.json:55`): publicado como o subpath `@agentskit/chat/react-native`; [[chat-example-react-native]] (`apps/example-react-native/App.tsx:5`) e o [[chat-cli]] importam esse subpath |
| Dependências | [[chat]] (`workspace:*`); peers [[agentskit-react-native]] `>=0.4.4 <1`, `react >=18` e `react-native` (`packages/react-native/package.json:38-42`) |

## Dados e efeitos

Recebe definição, sessão e frames serializáveis; delega estado, lifecycle, streaming, cancelamento e confirmação ao binding upstream. Não declara persistência, variáveis de ambiente, rede ou permissões próprias. Evidência: `useChat` vem de `@agentskit/react-native` (`packages/react-native/src/index.tsx:12,127`).

## Como mexer (para agentes)

- **Entrada:** `packages/react-native/src/index.tsx`.
- **Invariantes:** Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. O modo controlado ([[agentskit-chat ADR-0031 - Chat controlado externamente como costura da aplicação]]) existe só em React e Ink; este renderer não o implementa (nenhuma ocorrência de "controlled" em `src/`).
- **Testes:** `packages/react-native/tests/agent-chat-native.test.tsx`, `packages/react-native/tests/protocol-conformance.test.ts`; exemplo web via Expo: `pnpm test:e2e --project=react-native` (`tests/e2e/react-native-hello-world.spec.ts`, `playwright.config.ts:35`).
- **Validação:** `pnpm --filter @agentskit/chat-react-native lint && pnpm --filter @agentskit/chat-react-native test` (`packages/react-native/package.json:32-33`; `test` compila `@agentskit/chat` antes).
- **Armadilhas:** Não deixar o binding upstream e o shell divergirem; executar testes de protocolo comuns.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs: [[agentskit-chat ADR-0001 - Núcleo neutro de framework com renderizadores nativos]], [[agentskit-chat ADR-0008 - Ações tipadas usam a confirmação do upstream]], [[agentskit-chat ADR-0013 - Temas semânticos da aplicação e slots nativos]], [[agentskit-chat ADR-0015 - Catálogo fechado de componentes padrão da aplicação]], [[agentskit-chat ADR-0029 - Renderizadores como subcaminhos do Chat]]

Histórico recente do caminho: 2026-10-10 · 4891be6 release 0.6.0; 2026-10-02 · 0bfd034 cobertura; 2026-07-14 · 40ee0fd consolidação

> [!info]- Detalhe técnico
> `packages/react-native/src/index.tsx:256` declara o shell; `packages/react-native/fixtures/readme-example.tsx:1` fornece o exemplo; `packages/react-native/package.json:1` declara peer e scripts.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
