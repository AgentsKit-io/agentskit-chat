---
tipo: pacote
repo: agentskit-chat
grupo: Núcleo e protocolo
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/protocol.md", "packages/protocol/fixtures/readme-example.ts", "packages/protocol/package.json", "packages/protocol/src/backend.ts", "packages/protocol/src/index.ts", "packages/protocol/tests/parts.test.ts", "packages/protocol/tests/protocol.test.ts"]
tags: [pacote, repo/agentskit-chat, grupo/nucleo-e-protocolo, camada/ferramenta]
---

# @agentskit/chat-protocol

> [!tldr] Em linguagem comum
> Define envelopes versionados e schemas runtime para eventos de turno, componentes, Ask, backend e conteúdo referenciado.

← [[00 Grupo - agentskit-chat - Núcleo e protocolo]]

## O que faz e por que existe

Define envelopes versionados e schemas runtime para eventos de turno, componentes, Ask, backend e conteúdo referenciado. Eventos externos, frames e partes são dados não confiáveis: validar versão e limites; não recriar schemas de mensagens do Core.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `decodeTurnEvent(input: unknown): DecodeTurnEventResult` | função | Valida evento versionado | `packages/protocol/src/index.ts:509` |
| `TurnEventSchema` | schema | Contrato de evento de turno | `packages/protocol/src/index.ts:386` |
| `AskBackendRequestSchema` | schema | Valida pedido confiável do backend Ask | `packages/protocol/src/backend.ts:36` |

Exemplo real (`packages/protocol/fixtures/readme-example.ts:1`):

```ts
import { decodeTurnEvent } from '@agentskit/chat/protocol'

const result = decodeTurnEvent({ unexpected: true })
if (result.ok) throw new Error('expected invalid turn event')

```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | [[chat]], [[chat-server]], renderers via fixtures |
| Dependências | Zod, `@noble/hashes`, [[00 Hub - agentskit]] para validação de memória canônica |

## Dados e efeitos

Valida dados recebidos e produz envelopes JSON; não persiste, não abre rede e não requer permissões.

## Como mexer (para agentes)

- **Entrada:** `packages/protocol/src/index.ts`.
- **Invariantes:** Eventos externos, frames e partes são dados não confiáveis: validar versão e limites; não recriar schemas de mensagens do Core.
- **Testes:** `packages/protocol/tests/protocol.test.ts`; packages/protocol/tests/parts.test.ts.
- **Validação:** `pnpm --filter @agentskit/chat-protocol lint && pnpm --filter @agentskit/chat-protocol test`.
- **Armadilhas:** Não tratar payload como estado de renderer nem vazar diagnóstico bruto de Zod.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs relacionados: [[agentskit-chat ADR-0004 - Protocolo de turno v1 baseado em snapshot]], [[agentskit-chat ADR-0007 - Manifesto fechado de componentes da aplicação]], [[agentskit-chat ADR-0021 - Conteúdo ordenado do assistente em registros JSON versionados]], [[agentskit-chat ADR-0024 - Respostas determinísticas antes dos adapters de backend]], [[agentskit-chat ADR-0026 - Vertical confiável de backend do Ask]], [[agentskit-chat ADR-0035 - Partes de turno referenciadas aditivas e upload do host]], [[agentskit-chat ADR-0038 - Partes referenciadas entregues na fronteira do adapter]].

Histórico recente do caminho: 2026-10-10 · 97a3915 adiciona turn parts referenciadas; 2026-09-02 · 9f80bbf remediação de ecossistema; 2026-07-14 · 40ee0fd consolidação de pacotes.

> [!info]- Detalhe técnico
> `packages/protocol/src/index.ts:1` reúne exports; `packages/protocol/src/backend.ts:36` schema Ask; `packages/protocol/fixtures/readme-example.ts:1` mostra decode inválido.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
