---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0003-semantic-fallback-envelope.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0003 - Envelope semântico de fallback neutro de framework

> [!tldr] Em linguagem comum
> Quando uma interface não consegue mostrar um componente visual, todas mostram o mesmo texto de reserva, validado, no mesmo formato.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-11. Fonte: `docs/architecture/adrs/0003-semantic-fallback-envelope.md`.

## Decisão em linguagem comum

`@agentskit/chat` é dono de um envelope de fallback semântico mínimo, validado em runtime, com duas strings não vazias: `kind` (o visual não suportado) e `summary` (o significado legível). O formatador compartilhado produz `[unsupported visual: <kind>] <summary>`. Renderers nativos podem expor componentes que apresentam esse valor, mas não redefinem schema nem formatação.

## Contexto e consequências

**Contexto.** A ADR-0001 exige fallbacks semânticos compartilhados; a primeira fatia do Ink precisava de uma representação textual estável antes do registro de componentes. Defini-la no pacote Ink tornaria o comportamento específico de renderer; aceitar valores sem checagem violaria a fronteira de validação. A ADR-0007 reatribui a propriedade do schema de fio ao protocolo.

**Consequências.**

- Significado e texto do fallback são idênticos entre renderers.
- Valores não confiáveis são validados antes de renderizar.
- O Ink só é dono da apresentação nativa de terminal.
- O contrato é pequeno e não antecipa identidade, props ou ações do registro de componentes.

## Pacotes afetados

[[chat]] (`parseSemanticFallback`, `formatSemanticFallback` em `packages/chat/src/index.ts:991-994`), [[chat-protocol]] (schema de fio, ver ADR-0007) e [[chat-ink]] (`SemanticFallback`, `packages/ink/src/index.tsx:54`).

## Substitui / substituído por

Parcialmente superada pela [[agentskit-chat ADR-0007 - Manifesto fechado de componentes da aplicação]], apenas onde atribuía ao `@agentskit/chat` a propriedade do schema (passa ao protocolo).

## Fonte

`docs/architecture/adrs/0003-semantic-fallback-envelope.md`.
