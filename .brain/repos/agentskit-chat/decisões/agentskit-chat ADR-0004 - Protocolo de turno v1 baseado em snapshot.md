---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0004-snapshot-first-turn-protocol.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0004 - Protocolo de turno v1 baseado em snapshot

> [!tldr] Em linguagem comum
> Cliente e servidor trocam "fotos" completas e numeradas da conversa, em vez de pedaços de stream, para que ninguém precise reconstruir o ciclo de vida.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-11. Fonte: `docs/architecture/adrs/0004-snapshot-first-turn-protocol.md`.

## Decisão em linguagem comum

`@agentskit/chat-protocol` é dono de um envelope de eventos versionado e validado, de diagnósticos tipados e inertes do decoder e de fixtures de conformidade versionadas. A v1 começa com três eventos: `client.turn.submit` (entrada do usuário), `server.turn.snapshot` (projeção de fio das mensagens canônicas do AgentsKit, status, uso e diagnóstico seguro opcional) e `server.turn.diagnostic` (falha segura tipada). O streaming usa snapshots completos sucessivos com sequência crescente e ids de mensagem estáveis. Dentro da v1, campos opcionais aditivos são compatíveis e descartados por decoders antigos; eventos e versões desconhecidos são inertes; mudanças em campos obrigatórios exigem v2, migrações, fixtures e ADR.

## Contexto e consequências

**Contexto.** React, React Native e Ink precisavam de um protocolo único que cruzasse futuras fronteiras cliente/servidor sem redefinir o controlador nem o stream do adapter. Transportar `StreamChunk` expõe detalhes de adapter e exige outro reducer; usar `AgentEvent` confunde telemetria com estado durável. Alternativas rejeitadas: `StreamChunk`, `AgentEvent`, stores por renderer e definir já eventos de ação/sessão (especulativo).

**Consequências.**

- Todos os renderers de prova consomem o mesmo schema e o mesmo corpus de fixtures.
- Snapshots completos são maiores que deltas, porém mais simples e seguros.
- Diagnósticos nunca expõem árvores de validação brutas nem payloads não confiáveis.
- A evolução do protocolo é explícita e testada por compatibilidade.

## Pacotes afetados

[[chat-protocol]] (`TurnEventSchema`, `decodeTurnEvent` em `packages/protocol/src/index.ts:386,509`), [[chat-server]] (emite snapshots NDJSON) e todos os renderers.

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0004-snapshot-first-turn-protocol.md`.
