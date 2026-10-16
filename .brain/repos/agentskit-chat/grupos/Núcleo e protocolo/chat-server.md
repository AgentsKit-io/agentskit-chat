---
tipo: pacote
repo: agentskit-chat
grupo: Núcleo e protocolo
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente); auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/server.md", "packages/server/fixtures/readme-example.ts", "packages/server/package.json", "packages/server/src/ask-service.ts", "packages/server/src/index.ts", "packages/server/src/uploads.ts", "packages/server/tests/handler.test.ts", "packages/server/tests/uploads.test.ts"]
tags: [pacote, repo/agentskit-chat, grupo/nucleo-e-protocolo, camada/ferramenta]
---

# @agentskit/chat-server

> [!tldr] Em linguagem comum
> Expõe handlers Web-standard para chat e Ask, compondo autenticação, sessão, persistência, uploads e streaming fornecidos pelo host.

← [[00 Grupo - agentskit-chat - Núcleo e protocolo]]

## O que faz e por que existe

Expõe handlers Web-standard para chat e Ask, compondo autenticação, sessão, persistência, uploads e streaming fornecidos pelo host. Autenticar antes de ler o body quando configurado; contexto confiável não vem do protocolo. Propagar cancelamento/deadline; não executar tools nem persistir mensagens canônicas localmente.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createChatHandler(options)` | função | Cria handler `Request => Response` | `packages/server/src/index.ts:96` |
| `createAskServiceHandler(options)` | função | Handler de Ask com seams confiáveis | `packages/server/src/ask-service.ts:133` |
| `createUploadHandler(options)` | função | Recebe upload sob política injetada | `packages/server/src/uploads.ts:51` |

Exemplo real (`packages/server/fixtures/readme-example.ts:1-16`):

```ts
import { createChatHandler } from '@agentskit/chat/server'
import type { ChatHandlerOptions } from '@agentskit/chat/server'
import type { ChatDefinition, SessionStorage } from '@agentskit/chat'

type TenantContext = { readonly tenantId: string }
type TenantHandlerOptions = {
  readonly authenticate: NonNullable<ChatHandlerOptions<TenantContext>['authenticate']>
  readonly definitionFor: (tenantId: string) => ChatDefinition
  readonly storageFor: (tenantId: string) => SessionStorage
}

export const createTenantHandler = (options: TenantHandlerOptions) => createChatHandler<TenantContext>({
  authenticate: options.authenticate,
  resolveDefinition: context => options.definitionFor(context!.tenantId),
  sessionStorage: context => options.storageFor(context!.tenantId),
})

```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | Apps host. Nenhum `package.json` deste repo depende dele (só o alias de tsconfig em `apps/docs/tsconfig.json:24`); o workspace é `private` (`packages/server/package.json:3`) e o código é publicado como o subpath `@agentskit/chat/server` (`packages/chat/package.json:35`); o nome legado `@agentskit/chat-server` aparece só no plano de descontinuação (`scripts/legacy-package-deprecation-lib.mjs:21`) |
| Dependências | [[chat]] (`resumeChatSession`, `SessionConflictError` — `packages/server/src/index.ts:5`) e [[chat-protocol]] (`decodeTurnEvent`, `SessionSnapshotSchema` — `index.ts:7`), ambos `workspace:*`; [[00 Hub - agentskit]]: `@agentskit/net` (`withTimeout`, `anySignal`), Core (`createChatController`, peer) e Observability (`CostStore`, peer opcional); `aws4fetch` no adapter S3 (`uploads.ts:179`); stores injetadas |

## Dados e efeitos

Lê HTTP Request, autenticação/contexto e armazenamento injetado; responde snapshots/NDJSON. Pode chamar serviço de blob externo no adaptador S3. Variáveis de ambiente não são lidas pelo handler; host fornece configuração.

## Como mexer (para agentes)

- **Entrada:** `packages/server/src/index.ts`.
- **Invariantes:** Autenticar antes de ler o body quando configurado; contexto confiável não vem do protocolo. Propagar cancelamento/deadline; não executar tools nem persistir mensagens canônicas localmente.
- **Testes:** `packages/server/tests/handler.test.ts` (handler de turno), `packages/server/tests/ask-service.test.ts`, `packages/server/tests/uploads.test.ts`, `packages/server/tests/decide.test.ts` (decisões de ação), `packages/server/tests/cost.test.ts` (política de custo), `packages/server/tests/known-gaps.test.ts`.
- **Validação:** `pnpm --filter @agentskit/chat-server lint && pnpm --filter @agentskit/chat-server test` — o `test` primeiro compila `@agentskit/chat` e `@agentskit/chat-protocol` e depois roda `vitest run --coverage` (`packages/server/package.json:30-34`).
- **Ordem real do handler:** autentica (`index.ts:114`), só então lê o body limitado (`:119`), resolve definição/storage, reivindica o turno por lease (`:166`) e responde `application/x-ndjson` (`:164`, `:305`).
- **Armadilhas:** Uploads e custos são capabilities injetadas.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs relacionados: [[agentskit-chat ADR-0012 - Handler de snapshot com padrões web]], [[agentskit-chat ADR-0022 - Integração com o serviço Ask é aplicação compartilhada]], [[agentskit-chat ADR-0026 - Vertical confiável de backend do Ask]], [[agentskit-chat ADR-0035 - Partes de turno referenciadas aditivas e upload do host]], [[agentskit-chat ADR-0037 - Decisões de ação duráveis e política de custo por turno]].

Histórico recente do caminho: 2026-10-10 · 6723cd7 decisões e custo de turno; 2026-10-07 · 97a3915 uploads e turn parts; 2026-10-02 · 68f5bf7 deadline Ask; 2026-10-02 · 76be79b primitivas de rede.

> [!info]- Detalhe técnico
> `packages/server/src/index.ts:96` cria handler; `packages/server/src/ask-service.ts:133` handler Ask; `packages/server/src/uploads.ts:51` upload; fixture `packages/server/fixtures/readme-example.ts:1-16`

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
