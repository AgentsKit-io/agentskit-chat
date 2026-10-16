---
tipo: pacote
repo: agentskit-chat
grupo: Interfaces
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/ink.md", "packages/ink/fixtures/readme-example.tsx", "packages/ink/package.json", "packages/ink/src/index.tsx", "packages/ink/tests/agent-chat.test.tsx", "packages/ink/tests/controlled-agent-chat.test.tsx"]
tags: [pacote, repo/agentskit-chat, grupo/interfaces]
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
| Consumidores | consumidores de exemplo descritos no grupo; consumidores externos não enumerados |
| Dependências | [[chat]], [[agentskit-ink]] e runtime Ink/terminal |

## Dados e efeitos

Recebe definição, sessão e frames serializáveis; delega estado, lifecycle, streaming, cancelamento e confirmação ao binding upstream. Não declara persistência, variáveis de ambiente, rede ou permissões próprias.

## Como mexer (para agentes)

- **Entrada:** `packages/ink/src/index.tsx`.
- **Invariantes:** Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. Em modo controlado não chamar hook/store de aquisição de chat.
- **Testes:** `packages/ink/tests/agent-chat.test.tsx`; packages/ink/tests/controlled-agent-chat.test.tsx.
- **Validação:** `pnpm --filter @agentskit/chat-ink lint && pnpm --filter @agentskit/chat-ink test`.
- **Armadilhas:** Não deixar o binding upstream e o shell divergirem; executar testes de protocolo comuns.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs: 0001, 0003, 0007, 0015, 0031

Histórico recente do caminho: 2026-10-10 · 4891be6 release 0.6.0; 2026-10-02 · 0bfd034 cobertura; 2026-07-14 · 6008093 controlled driver

> [!info]- Detalhe técnico
> `packages/ink/src/index.tsx:293` declara o shell; `packages/ink/fixtures/readme-example.tsx:1` fornece o exemplo; `packages/ink/package.json:1` declara peer e scripts.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
