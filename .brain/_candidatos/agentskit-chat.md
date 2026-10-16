# Candidatos globais — agentskit-chat

## Conceitos

- **Camada de aplicação** → Define comportamento e composição para casos de conversa sem recriar o runtime do agente. Aparece em [[00 Hub - agentskit-chat]], [[chat]]; evidência `AGENTS.md:1`.
- **Turn protocol** → Envelope versionado e validado em runtime para eventos entre cliente e servidor. Aparece em [[chat-protocol]], [[chat-server]]; evidência `packages/protocol/src/index.ts:1`.
- **Deterministic answer plane** → Resolve consulta por igualdade normalizada em artefato limitado, com fallback explícito. Aparece em [[chat]] e fluxo de resposta local; evidência `packages/chat/src/deterministic.ts:53`.
- **Semantic component manifest** → Registro fechado de componentes cujos frames são validados antes de renderizar; fallback descreve apresentação alternativa. Aparece em [[chat]], interfaces; evidência `packages/chat/src/catalog.ts:88`.
- **Application session envelope** → Metadados e cursor versionados para retomar sessão, separados das mensagens canônicas upstream. Aparece em [[chat]]; evidência `packages/chat/src/index.ts:557`.

## Glossário

- `AdapterFactory` — seam upstream que produz execução do agente; fonte `packages/chat/fixtures/readme-example.ts:2`.
- `ChatDefinition` — contrato local que agrupa identificador e ChatConfig; fonte `packages/chat/src/index.ts:532`.
- `SessionStorage` — porta injetada de persistência de snapshot; fonte `packages/chat/src/index.ts:577`.
- `TurnEvent` — evento serializável e validado do protocolo; fonte `packages/protocol/src/index.ts:1`.
- `StandardComponent` — projeção nativa para frame de componente; fonte `packages/react/src/index.tsx:103`.

## Arestas de dependência

- `@agentskit/chat --> @agentskit/chat-protocol : contratos compartilhados : doc-bridge.config.json:1`
- `@agentskit/chat-server --> @agentskit/chat : definição/sessão : doc-bridge.config.json:1`
- `@agentskit/chat-server --> @agentskit/chat-protocol : envelopes e validação : doc-bridge.config.json:1`
- `@agentskit/chat-react --> @agentskit/chat : definição e políticas : doc-bridge.config.json:1`
- `@agentskit/chat-example-* --> @agentskit/chat-example-shared : mesmos domínios entre hosts : doc-bridge.config.json:1`

## Infra e deploy

- Workspace raiz declara pnpm e pipelines agregados em `package.json:1`.
- Deploy de docs tem configuração Vercel e OpenNext/Workers; isso prova opções versionadas, não produção atual (`apps/docs/wrangler.jsonc:1`, `apps/docs/vercel.json:1`).
- Persistência PostgreSQL é opção de adapter Drizzle, não armazenamento obrigatório (`packages/chat/src/drizzle-pg.ts:11`).

## Perguntas abertas

- Quais hosts efetivamente implantam os artefatos Cloudflare/Vercel deste commit?
- Quais consumidores externos além dos repositórios descritos usam os subpaths?
- `pnpm` estava ausente, então qual saída atual do doc-bridge index/gate e status de validação?
- Não há arquivo CODEOWNERS neste checkout; confirmar responsáveis/revisores humanos por grupo.

## Capacidades não usadas ou opcionais

- Persistência Drizzle/Postgres depende de configuração/injeção do host (`packages/chat/src/drizzle-pg.ts:26`).
- Upload e S3 dependem de política/BlobStore injetado (`packages/server/src/uploads.ts:51`, `packages/server/src/uploads.ts:179`).
- Ask remoto e adaptação self-hosted são condicionais à configuração do host (`packages/server/src/ask-service.ts:67`).
- Renderers compilam como bindings locais/subpaths; publicação independente não é provada por manifests privados.
