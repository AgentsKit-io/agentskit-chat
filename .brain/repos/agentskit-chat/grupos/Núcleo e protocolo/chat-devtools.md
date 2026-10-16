---
tipo: pacote
repo: agentskit-chat
grupo: Núcleo e protocolo
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente); auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/devtools.md", "packages/devtools/fixtures/readme-example.ts", "packages/devtools/package.json", "packages/devtools/src/index.ts", "packages/devtools/tests/devtools.test.ts", "packages/devtools/tests/fixtures/captured-session.json"]
tags: [pacote, repo/agentskit-chat, grupo/nucleo-e-protocolo, camada/ferramenta]
---

# @agentskit/chat-devtools

> [!tldr] Em linguagem comum
> Registra rastros de aplicação, serializa fixture de replay e compara resultados semânticos entre renderers.

← [[00 Grupo - agentskit-chat - Núcleo e protocolo]]

## O que faz e por que existe

Registra rastros de aplicação, serializa fixture de replay e compara resultados semânticos entre renderers. Replay é responsabilidade de `@agentskit/eval/replay`; pais antecedem filhos e sequência deve ser contínua; comparar semântica, nunca markup/pixel.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createTraceCapture(options?)` | função | Captura registros ordenados | `packages/devtools/src/index.ts:45` |
| `createReplayFixture(cassette, traces)` | função | Compõe rastros com cassette upstream | `packages/devtools/src/index.ts:91` |
| `compareRendererOutcomes(input)` | função | Compara resultados semânticos | `packages/devtools/src/index.ts:116` |

Exemplo real (`packages/devtools/fixtures/readme-example.ts:1`):

```ts
import { createReplayFixture } from '@agentskit/chat/devtools'

```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | Apps host e testes de paridade dos renderers; publicado como subpath `@agentskit/chat/devtools` (`packages/chat/package.json:40`). `apps/example-ink` o compila no script `test:pty` (`apps/example-ink/package.json:10`) |
| Dependências | [[chat]] (`workspace:*`; só tipos `ActionConfirmation`, `ActionPolicyTrace`, `TurnTrace` — `packages/devtools/src/index.ts:2`); [[00 Hub - agentskit]]: `@agentskit/eval/replay` (`parseCassette`, `serializeCassette` — `index.ts:1`); Zod |

## Dados e efeitos

Lê e serializa JSON de traces/fixtures; não executa rede, ações ou ferramentas. Campos listados em `redactFields` (opção de `createTraceCapture`) são trocados por `[REDACTED]` (`packages/devtools/src/index.ts:17,35,46`); sem a opção nada é redigido.

## Como mexer (para agentes)

- **Entrada:** `packages/devtools/src/index.ts`.
- **Invariantes:** Replay é responsabilidade de `@agentskit/eval/replay`; pais antecedem filhos e sequência deve ser contínua; comparar semântica, nunca markup/pixel.
- **Testes:** `packages/devtools/tests/devtools.test.ts`, com as fixtures `packages/devtools/tests/fixtures/captured-session.json` e `renderer-outcomes.json`.
- **Validação:** `pnpm --filter @agentskit/chat-devtools lint && pnpm --filter @agentskit/chat-devtools test`.
- **Armadilhas:** Não registrar chunks ou requests do adapter.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

[[agentskit-chat ADR-0017 - Traces da aplicação compõem o replay do upstream]].

Histórico recente do caminho: 2026-10-10 · 4891be6 versão 0.6.0; 2026-10-02 · 0bfd034 floors de cobertura; 2026-07-14 · 40ee0fd consolidação.

> [!info]- Detalhe técnico
> `packages/devtools/src/index.ts:45` captura; `packages/devtools/src/index.ts:91` cria fixture; `packages/devtools/src/index.ts:116` compara outcomes.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
