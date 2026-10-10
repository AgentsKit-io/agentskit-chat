# Consumo no Expenses e no Receitas

Expenses valida primeiro; Receitas fixa as mesmas versões depois. Este guia é para
a próxima versão, não para chat 0.5.0: core 1.15.0, adapters 0.19.0, memory 0.12.0
e observability 0.13.0 precisam estar publicados e o chat precisa passar novamente
pelos gates com o lockfile de registry. Nunca use tarballs locais em produtos.

## Migrações e conexões

Aplique `chatSessionDDL` e `chatDecisionDDL` de `@agentskit/chat/drizzle-pg`,
`postgresChatMigrationSql` de `@agentskit/memory/postgres` e
`postgresCostMigrationSql` de `@agentskit/observability/postgres` uma vez na
migração do produto. Use `drizzle(pool)` em Node; em Workers abra um `pg.Client`
por request com a connectionString de Hyperdrive e feche em `waitUntil` **depois de
consumir o stream**, nunca antes. Credenciais ficam no secret channel do host.

## Montagem Hono

O host autentica e autoriza a sessão antes de resolver qualquer store. Tenant e
usuário vêm de Better Auth, nunca do evento. O `db` abaixo é o Drizzle da conexão
com ciclo de vida gerenciado pelo host; `authenticate`, `authorizeSession`,
`entitlements`, `pricing` e `expenseTools` são serviços do produto.

```ts
import { createChatHandler } from '@agentskit/chat/server'
import { createDrizzleSessionStorage, createDrizzleDecisionStore } from '@agentskit/chat/drizzle-pg'
import { postgresChatMemory } from '@agentskit/memory/postgres'
import { postgresCostStore } from '@agentskit/observability/postgres'
import { openRouter } from '@agentskit/adapters'

type Context = { tenantId: string; userId: string }
const handleChat = createChatHandler<Context>({
  authenticate,
  resolveDefinition: async (context, sessionId) => {
    await authorizeSession(context!, sessionId)
    return {
      id: 'expenses',
      chat: {
        adapter: openRouter({ apiKey: providerKey, model: 'google/gemini-2.5-flash-lite' }),
        memory: postgresChatMemory({ db, tenantId: context!.tenantId, sessionId }),
        tools: expenseTools,
      },
    }
  },
  sessionStorage: context => createDrizzleSessionStorage(db, context!.tenantId),
  decisions: (context, sessionId) => createDrizzleDecisionStore(db, context!.tenantId, sessionId),
  cost: async context => ({
    store: postgresCostStore({ db }),
    tenant: `${context!.tenantId}:${context!.userId}`,
    capUsd: await entitlements.capUsd(context!),
    reserveUsd: pricing.maxTurnUsd,
    priceUsd: pricing.forUsage,
    model: 'google/gemini-2.5-flash-lite',
  }),
})
app.post('/chat', c => handleChat(c.req.raw))
```

Use uma chave estável de quota conforme a unidade cobrada pelo plano (usuário,
household ou organização). O exemplo cobra por usuário dentro do tenant; não
aplica simultaneamente dois tetos. `capUsd` vem de entitlements, e `reserveUsd`
deve cobrir o pior turno permitido. O commit registra gasto real mesmo acima da
reserva. Agende `expirePostgresCostReservations` com um corte maior que o maior
turno; o store não tem reaper próprio. Não registre conteúdo nem chaves em logs.

## Tools e decisões

Toda tool de escrita tem `requiresConfirmation: true`, argumentos validados e
`execute` chamando o serviço de domínio. Autorização de tool continua no host.
A tabela escrita deve ter `unique(tool_call_id)` como segunda barreira; não use
SQL direto na tool nem um novo token automático após uma falha de claim.

O primeiro request envia `client.turn.submit`; capture o token da tool pendente.
No request seguinte envie `client.action.decide` com `{ token, decision: 'approve' }`
ou `'deny'`, mantendo o envelope v1 e sessionId. Um novo handler recupera memória
e decisão; reenvio do approve concluído não chama tool/model novamente. Trate
404 `ACTION_NOT_FOUND`, 409 `ACTION_ALREADY_DECIDED`/`SESSION_BUSY`/
`SESSION_CONFLICT` e 402 `QUOTA_EXCEEDED` por código. O primeiro snapshot contém
`quota.utilization` e `quota.warning` (80%) para o consumo na UI.

## Anexos

Monte `createUploadHandler` em `/uploads` com `createS3BlobStore`, tamanho/MIME
permitidos e `authorize` autenticando e autorizando a sessão. No handler configure
`uploads` com o mesmo store/policy e `tenantId` autorizando **todo** request.
Escolha `delivery: 'bytes'` quando o provedor não busca URLs; caso contrário use
URL curta. PUTs precisam ser write-once/versionados: uma URL de upload ainda
válida pode sobrescrever o objeto depois da checagem de SHA-256.

1. POST `/uploads` com `{ sessionId, bytes, mimeType }`.
2. PUT dos bytes na URL recebida com os headers MIME/size assinados (o navegador
   define Content-Length automaticamente).
3. Envie `{ type: 'file', ref, mimeType, bytes, sha256 }` no input do turno e
   `capabilities: ['turn-parts-v1']`. O corpo JSON permanece até 64 KiB.
4. Memory/snapshots guardam ref; apenas o adapter recebe URL assinada/data URL.

Antes de liberar IA paga: repetir concorrência de decisão/custo em Neon,
upload em R2/MinIO, chamada OpenRouter e extração com recibos reais. Confrontar
ledger com a fatura (limite 5% do PRD), validar isolamento e concluir QA do produto.
O guia não substitui esses gates nem instala auth/billing/front.
