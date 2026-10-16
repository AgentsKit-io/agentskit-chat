---
tipo: pacote
repo: agentskit-chat
grupo: Interfaces
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/vue.md", "packages/vue/fixtures/readme-example.ts", "packages/vue/package.json", "packages/vue/src/index.ts", "packages/vue/tests/agent-chat.test.ts", "packages/vue/tests/protocol-conformance.test.ts"]
tags: [pacote, repo/agentskit-chat, grupo/interfaces]
---

# @agentskit/chat-vue

> [!tldr] Em linguagem comum
> Apresenta a conversa AgentsKit em Vue, conservando a definição compartilhada e os componentes nativos.

← [[00 Grupo - agentskit-chat - Interfaces]]

## O que faz e por que existe

Apresenta a conversa AgentsKit em Vue, conservando a definição compartilhada e os componentes nativos. Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. Em modo controlado não chamar hook/store de aquisição de chat.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentChat: defineComponent({...})` | componente | Shell Vue | `packages/vue/src/index.ts:265` |
| `StandardComponent` | componente | Renderiza frames validados | `packages/vue/src/index.ts:7` |

Exemplo real (`packages/vue/fixtures/readme-example.ts`):

```ts
import { AgentChat } from '@agentskit/chat/vue'

```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | consumidores de exemplo descritos no grupo; consumidores externos não enumerados |
| Dependências | [[chat]], [[agentskit-vue]] e runtime Vue |

## Dados e efeitos

Recebe definição, sessão e frames serializáveis; delega estado, lifecycle, streaming, cancelamento e confirmação ao binding upstream. Não declara persistência, variáveis de ambiente, rede ou permissões próprias.

## Como mexer (para agentes)

- **Entrada:** `packages/vue/src/index.ts`.
- **Invariantes:** Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. Em modo controlado não chamar hook/store de aquisição de chat.
- **Testes:** `packages/vue/tests/agent-chat.test.ts`; packages/vue/tests/protocol-conformance.test.ts.
- **Validação:** `pnpm --filter @agentskit/chat-vue lint && pnpm --filter @agentskit/chat-vue test`.
- **Armadilhas:** Não deixar o binding upstream e o shell divergirem; executar testes de protocolo comuns.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs: 0001, 0008, 0013, 0015, 0029

Histórico recente do caminho: 2026-10-10 · 4891be6 release 0.6.0; 2026-10-02 · 0bfd034 cobertura; 2026-07-14 · 40ee0fd consolidação

> [!info]- Detalhe técnico
> `packages/vue/src/index.ts:265` declara o shell; `packages/vue/fixtures/readme-example.ts:1` fornece o exemplo; `packages/vue/package.json:1` declara peer e scripts.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
