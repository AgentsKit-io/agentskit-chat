---
tipo: pacote
repo: agentskit-chat
grupo: Interfaces
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/react-native.md", "packages/react-native/fixtures/readme-example.tsx", "packages/react-native/package.json", "packages/react-native/src/index.tsx", "packages/react-native/tests/agent-chat-native.test.tsx", "packages/react-native/tests/protocol-conformance.test.ts"]
tags: [pacote, repo/agentskit-chat, grupo/interfaces]
---

# @agentskit/chat-react-native

> [!tldr] Em linguagem comum
> Apresenta a conversa AgentsKit em React Native, conservando a definição compartilhada e os componentes nativos.

← [[00 Grupo - agentskit-chat - Interfaces]]

## O que faz e por que existe

Apresenta a conversa AgentsKit em React Native, conservando a definição compartilhada e os componentes nativos. Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. Em modo controlado não chamar hook/store de aquisição de chat.

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
| Consumidores | consumidores de exemplo descritos no grupo; consumidores externos não enumerados |
| Dependências | [[chat]], [[agentskit-react-native]] e runtime React Native |

## Dados e efeitos

Recebe definição, sessão e frames serializáveis; delega estado, lifecycle, streaming, cancelamento e confirmação ao binding upstream. Não declara persistência, variáveis de ambiente, rede ou permissões próprias.

## Como mexer (para agentes)

- **Entrada:** `packages/react-native/src/index.tsx`.
- **Invariantes:** Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. Em modo controlado não chamar hook/store de aquisição de chat.
- **Testes:** `packages/react-native/tests/agent-chat-native.test.tsx`; packages/react-native/tests/protocol-conformance.test.ts.
- **Validação:** `pnpm --filter @agentskit/chat-react-native lint && pnpm --filter @agentskit/chat-react-native test`.
- **Armadilhas:** Não deixar o binding upstream e o shell divergirem; executar testes de protocolo comuns.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs: 0001, 0008, 0013, 0015, 0029

Histórico recente do caminho: 2026-10-10 · 4891be6 release 0.6.0; 2026-10-02 · 0bfd034 cobertura; 2026-07-14 · 40ee0fd consolidação

> [!info]- Detalhe técnico
> `packages/react-native/src/index.tsx:1` declara o shell; `packages/react-native/fixtures/readme-example.tsx:1` fornece o exemplo; `packages/react-native/package.json:1` declara peer e scripts.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
