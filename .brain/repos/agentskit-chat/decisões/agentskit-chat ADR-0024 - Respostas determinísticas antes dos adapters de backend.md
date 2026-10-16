---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0024-deterministic-answer-plane.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0024 - Respostas determinísticas antes dos adapters de backend

> [!tldr] Em linguagem comum
> Perguntas de resposta exata (comandos, nomes de pacote, links) são respondidas localmente por um artefato verificado, sem rede nem modelo; ambiguidade vira escolha e o resto escala para o backend.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted — HITL approved 2026-07-13. Data: 2026-07-13. Fonte: `docs/architecture/adrs/0024-deterministic-answer-plane.md`.

## Decisão em linguagem comum

`@agentskit/chat-protocol` possui três contratos v1 de runtime: `agentskit.chat.site` (local do artefato, hash esperado e política de fallback), `agentskit.chat.knowledge` (entradas locais imutáveis só com aliases exatos declarados e respostas limitadas) e `agentskit.chat.answer` (resposta, escolhas ou escalada com citações, proveniência, sugestões e confiança). Só entram `command`, `package`, `navigation`, `contribution`, `ecosystem`, `restricted-faq` e `document`; a igualdade usa normalização Unicode NFKC, trim, espaços colapsados e case folding estável — sem fuzzy, semântico, embedding, prefixo, palavra-chave nem modelo. `@agentskit/chat` monta um índice limitado uma vez e o compõe antes de um `AdapterFactory` do host: uma entrada exata → resposta local de confiança alta; várias → escolhas de confiança média; ausência/expirado/corrompido/offline → escalada de confiança baixa; com backend, requisição, ciclo de vida, latência de streaming e cancelamento ficam com o adapter (o envelope de escalada vai em `AdapterRequest.context.metadata`). Produção, cache e busca do artefato são do host; o protocolo é dono da serialização canônica e da verificação SHA-256. Escolhas determinísticas usam reservas exatas por sessão (commit após envio com sucesso, liberação em falha), com estado limitado e liberação explícita para hosts headless.

## Contexto e consequências

**Contexto.** Sites do ecossistema precisam responder fatos exatos sem latência de rede ou custo de modelo; se cada host inventar matching, confiança, artefato e escalada, o comportamento diverge; reimplementar controlador, retrieval ou modelo de mensagens duplicaria o AgentsKit. Rejeitados: backend para toda entrada, roteamento local fuzzy/semântico, artefatos no Core, outro controlador/reducer e acoplar o runtime ao Doc Bridge. A aprovação humana da issue #69 foi dada em 2026-07-13.

**Consequências.**

- Fatos exatos resolvem de forma síncrona e offline.
- A ambiguidade fica visível em vez de escolher uma resposta em silêncio.
- Entrada desconhecida ou não confiável nunca vira resposta local de confiança alta.
- Hosts devem verificar o artefato criptograficamente antes de criar o adapter; entrada corrompida vira escalada inerte, não falha de inicialização.
- `fallback.mode` é imposto pelo adapter mesmo que um backend seja fornecido por engano; mudanças obrigatórias exigem v2, fixtures e nova ADR.

## Pacotes afetados

[[chat-protocol]] (`packages/protocol/src/deterministic.ts`), [[chat]] (`createDeterministicAnswerResolver` `packages/chat/src/deterministic.ts:53`, `createDeterministicAnswerAdapter` `:300`), [[chat-docs]] (rotas `apps/docs/app/deterministic/*`). Fluxo: [[AgentsChat - Resposta local e escalada]].

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0024-deterministic-answer-plane.md`.
