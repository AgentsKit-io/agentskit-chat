---
tipo: pacote
repo: agentskit-chat
grupo: Interfaces
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente); auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/ink.md", "packages/ink/fixtures/readme-example.tsx", "packages/ink/package.json", "packages/ink/src/index.tsx", "packages/ink/tests/agent-chat.test.tsx", "packages/ink/tests/controlled-agent-chat.test.tsx"]
tags: [pacote, repo/agentskit-chat, grupo/interfaces, camada/ferramenta]
---

# @agentskit/chat-ink

> [!tldr] Em linguagem comum
> Apresenta a conversa AgentsKit em Ink/terminal, conservando a definição compartilhada e os componentes nativos.

← [[00 Grupo - agentskit-chat - Interfaces]]

## O que faz e por que existe

Apresenta a conversa AgentsKit em Ink/terminal, conservando a definição compartilhada e os componentes nativos. Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. Em modo controlado não chamar hook/store de aquisição de chat.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentChat(props: AgentChatProps): ReactElement` | componente | Shell terminal | `packages/ink/src/index.tsx:293` |
| `SemanticFallback` | componente | Apresentação textual segura | `packages/ink/src/index.tsx:54` |

Exemplo real (`packages/ink/fixtures/readme-example.tsx`):

```ts
import { AgentChat } from '@agentskit/chat/ink'

```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | Workspace `private` (`packages/ink/package.json:50`): publicado como o subpath `@agentskit/chat/ink` (sem entrada `require`, `packages/chat/package.json:55-58`); [[chat-example-ink]] (`apps/example-ink/src/index.tsx:2`) e o [[chat-cli]] importam esse subpath |
| Dependências | [[chat]] (`workspace:*`); peers [[agentskit-ink]] `^0.10.1`, `ink >=7.1.0` e `react >=18` (`packages/ink/package.json:35-39`) |

## Dados e efeitos

Recebe definição, sessão e frames serializáveis; delega estado, lifecycle, streaming, cancelamento e confirmação ao binding upstream. Não declara persistência, variáveis de ambiente, rede ou permissões próprias. Evidência: `useChat` vem de `@agentskit/ink` (`packages/ink/src/index.tsx:5,262`); o modo controlado usa `createControlledChatDriver` (`:1`, `:272-282`).

## Como mexer (para agentes)

- **Entrada:** `packages/ink/src/index.tsx`.
- **Invariantes:** Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. Em modo controlado não chamar hook/store de aquisição de chat.
- **Testes:** `packages/ink/tests/agent-chat.test.tsx`, `packages/ink/tests/controlled-agent-chat.test.tsx`, `packages/ink/tests/protocol-conformance.test.tsx`; teste PTY real do exemplo: `pnpm test:pty` (`apps/example-ink/tests/ink-pty.test.ts`).
- **Validação:** `pnpm --filter @agentskit/chat-ink lint && pnpm --filter @agentskit/chat-ink test` (`packages/ink/package.json:29-30`; `test` compila `@agentskit/chat` antes).
- **Armadilhas:** Não deixar o binding upstream e o shell divergirem; executar testes de protocolo comuns.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs: [[agentskit-chat ADR-0001 - Núcleo neutro de framework com renderizadores nativos]], [[agentskit-chat ADR-0003 - Envelope semântico de fallback neutro de framework]], [[agentskit-chat ADR-0007 - Manifesto fechado de componentes da aplicação]], [[agentskit-chat ADR-0015 - Catálogo fechado de componentes padrão da aplicação]], [[agentskit-chat ADR-0031 - Chat controlado externamente como costura da aplicação]]

Histórico recente do caminho: 2026-10-10 · 4891be6 release 0.6.0; 2026-10-02 · 0bfd034 cobertura; 2026-07-14 · 6008093 controlled driver

> [!info]- Detalhe técnico
> `packages/ink/src/index.tsx:293` declara o shell; `packages/ink/fixtures/readme-example.tsx:1` fornece o exemplo; `packages/ink/package.json:1` declara peer e scripts.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
