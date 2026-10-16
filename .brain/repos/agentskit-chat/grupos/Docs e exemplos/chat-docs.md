---
tipo: app
repo: agentskit-chat
grupo: Docs e exemplos
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática no HEAD; routing/ownership consultado em doc-bridge.config.json; CLI doc-bridge indisponível por pnpm ausente"
fontes: ["apps/docs/lib/chat-definition.ts", "apps/docs/package.json", "apps/docs/tests/dogfood.test.ts", "docs/for-agents/apps/docs.md"]
tags: [app, repo/agentskit-chat, grupo/docs-e-exemplos, camada/ferramenta]
---

# @agentskit/chat-docs

> [!tldr] Em linguagem comum
> Portal Fumadocs e host de demonstração React; compila o corpus canônico `docs/` e compõe Ask/search/artefatos determinísticos.

← [[00 Grupo - agentskit-chat - Docs e exemplos]]

## O que faz e por que existe

Portal Fumadocs e host de demonstração React; compila o corpus canônico `docs/` e compõe Ask/search/artefatos determinísticos. A propriedade separa apresentação de contratos e domínio, usando exemplos para demonstrar composição real.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `docsChatDefinition` | exportação/entrada demonstrativa | Composição real do host ou definição | `apps/docs/lib/chat-definition.ts:23` |

Exemplo real (`apps/docs/lib/chat-definition.ts:23`):

```tsx
export const docsChatDefinition = defineChat({
  id: 'agentskit-chat-docs',
  revision: 1,
  components: defineComponentManifest(StandardComponentCatalog),
  chat: { adapter, memory },
  choiceSubmission: adapter.resolveChoiceSubmission,
})
```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | [[chat]]; [[chat-example-shared]] |
| Dependências | [[00 Hub - agentskit]] e workspace `@agentskit/chat` conforme manifesto. |

## Dados e efeitos

Lê módulos e fixtures locais. O host de docs pode expor HTTP e consultar serviço configurado; exemplos usam serviços em memória ou adapters injetados. Nenhum segredo ou valor de ambiente é registrado nesta nota.

## Como mexer (para agentes)

- **Entrada:** `apps/docs/lib/chat-definition.ts`.
- **Invariantes:** Não duplicar corpus, busca semântica ou memória; `/api/ask` fecha sem backend explicitamente configurado.
- **Testes:** `apps/docs/tests/dogfood.test.ts`.
- **Validação:** `pnpm --filter @agentskit/chat-docs lint && pnpm --filter @agentskit/chat-docs test && pnpm --filter @agentskit/chat-docs build`.
- **Armadilhas:** manter a fonte canônica de domínio em example-shared; não afirmar deploy a partir de configuração local.
- **Adoção upstream:** compor pacotes publicados; gaps genéricos pertencem ao AgentsKit conforme `AGENTS.md:1`.

## Decisões e história

ADRs relacionados: [[agentskit-chat ADR-0027 - Site Fumadocs como host de dogfood de primeira classe]], [[agentskit-chat ADR-0030 - Certificar chats de produtos do ecossistema por uma única aplicação]]. Para histórico detalhado, `git log --oneline -15 -- apps/docs`; commits relevantes visíveis neste checkout incluem `4891be6` (release 0.6.0) e `6723cd7` (políticas de decisão e conteúdo referenciado).

> [!info]- Detalhe técnico
> `apps/docs/lib/chat-definition.ts:23` — ponto de entrada citado; `apps/docs/package.json:1` — dependências e scripts; `docs/for-agents/apps/docs.md:1` — handoff do app; `apps/docs/tests/dogfood.test.ts:1` — cobertura relacionada.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
