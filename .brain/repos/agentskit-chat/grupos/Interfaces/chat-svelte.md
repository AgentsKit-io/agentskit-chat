---
tipo: pacote
repo: agentskit-chat
grupo: Interfaces
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/svelte.md", "packages/svelte/fixtures/readme-example.ts", "packages/svelte/package.json", "packages/svelte/src/index.ts", "packages/svelte/tests/agent-chat.test.ts", "packages/svelte/tests/ssr.test.ts"]
tags: [pacote, repo/agentskit-chat, grupo/interfaces]
---

# @agentskit/chat-svelte

> [!tldr] Em linguagem comum
> Apresenta a conversa AgentsKit em Svelte 5, conservando a definição compartilhada e os componentes nativos.

← [[00 Grupo - agentskit-chat - Interfaces]]

## O que faz e por que existe

Apresenta a conversa AgentsKit em Svelte 5, conservando a definição compartilhada e os componentes nativos. Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. Em modo controlado não chamar hook/store de aquisição de chat.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentChat: Component<AgentChatProps>` | componente | Shell Svelte | `packages/svelte/src/AgentChat.svelte.d.ts:3` |
| `toChatCssVariables(input?)` | função | Tema semântico | `packages/svelte/src/index.ts:11` |

Exemplo real (`packages/svelte/fixtures/readme-example.ts`):

```ts
import { AgentChat } from '@agentskit/chat/svelte'

```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | consumidores de exemplo descritos no grupo; consumidores externos não enumerados |
| Dependências | [[chat]], [[agentskit-svelte]] e runtime Svelte 5 |

## Dados e efeitos

Recebe definição, sessão e frames serializáveis; delega estado, lifecycle, streaming, cancelamento e confirmação ao binding upstream. Não declara persistência, variáveis de ambiente, rede ou permissões próprias.

## Como mexer (para agentes)

- **Entrada:** `packages/svelte/src/index.ts`.
- **Invariantes:** Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. Em modo controlado não chamar hook/store de aquisição de chat.
- **Testes:** `packages/svelte/tests/agent-chat.test.ts`; packages/svelte/tests/ssr.test.ts.
- **Validação:** `pnpm --filter @agentskit/chat-svelte lint && pnpm --filter @agentskit/chat-svelte test`.
- **Armadilhas:** Não deixar o binding upstream e o shell divergirem; executar testes de protocolo comuns.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs: 0001, 0008, 0013, 0015, 0029

Histórico recente do caminho: 2026-10-10 · 4891be6 release 0.6.0; 2026-10-02 · 0bfd034 cobertura; 2026-07-14 · 40ee0fd consolidação

> [!info]- Detalhe técnico
> `packages/svelte/src/index.ts:1` declara o shell; `packages/svelte/fixtures/readme-example.ts:1` fornece o exemplo; `packages/svelte/package.json:1` declara peer e scripts.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
