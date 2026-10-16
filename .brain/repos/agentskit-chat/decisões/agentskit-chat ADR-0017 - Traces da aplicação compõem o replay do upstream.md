---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0017-application-traces-compose-upstream-replay.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0017 - Traces da aplicação compõem o replay do upstream

> [!tldr] Em linguagem comum
> O devtools registra o que a aplicação decidiu (rotas e políticas) ao lado da gravação de modelo do AgentsKit, para reexecutar sem modelo vivo e comparar renderers por significado.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-11. Fonte: `docs/architecture/adrs/0017-application-traces-compose-upstream-replay.md`.

## Decisão em linguagem comum

`@agentskit/chat-devtools` captura registros só da aplicação em ordem causal de append: sequência monotônica, pai anterior opcional, categoria, timestamp e detalhe JSON limitado; nomes de campo configurados são redigidos recursivamente antes do armazenamento; snapshots e relatórios retornados são imutáveis em profundidade. Um fixture de replay versionado guarda esses registros ao lado de um `Cassette` upstream; serialização e validação do cassette delegam a `@agentskit/eval/replay`, e requests/chunks do modelo nunca são gravados aqui. A paridade semântica entre renderers compara resultados ordenados por identidade de turno e reporta ausências/diferenças sem comparar pixels nem internos de framework.

## Contexto e consequências

**Contexto.** O Chat já emite decisões de rota determinística e de política de capability; desenvolvedores precisam de um fixture commitável que explique os resultados e os compare entre renderers nativos. O AgentsKit já é dono de gravação de adapter, cassettes, playback, time travel e relatórios de eval. Rejeitados: segundo adapter de gravação, traces no protocolo de turno e snapshots de markup nativo.

**Consequências.**

- Hosts ligam callbacks de rota/política existentes a uma captura sem alterar a execução.
- A redação cobre só o detalhe de trace da aplicação; cassettes upstream podem conter prompts e exigem tratamento separado.
- Um fixture pode ser commitado e reexecutado sem acesso a modelo vivo.
- Os diagnósticos provam equivalência semântica, não identidade visual.

## Pacotes afetados

[[chat-devtools]] (`createTraceCapture`, `createReplayFixture`, `compareRendererOutcomes` em `packages/devtools/src/index.ts:45,91,116`).

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0017-application-traces-compose-upstream-replay.md`.
