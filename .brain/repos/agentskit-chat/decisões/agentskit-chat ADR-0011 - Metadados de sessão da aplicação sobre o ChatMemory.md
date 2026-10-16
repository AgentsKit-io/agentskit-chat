---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0011-application-session-metadata-over-chat-memory.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0011 - Metadados de sessão da aplicação sobre o ChatMemory

> [!tldr] Em linguagem comum
> As mensagens ficam só na memória do AgentsKit; o Chat guarda à parte apenas o estado da aplicação (rota, cursor, confirmações) num envelope versionado com gravação protegida contra conflito.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-11. Fonte: `docs/architecture/adrs/0011-application-session-metadata-over-chat-memory.md`.

## Decisão em linguagem comum

Define o envelope `agentskit.chat.session` v1 com identidade de sessão e definição, revisão da definição, cursor monotônico, decisões de rota determinísticas e vínculos de confirmação; as mensagens ficam exclusivamente no `ChatMemory` configurado em `ChatDefinition.chat`. `SessionStorage` é uma porta do host com `load`, `save(snapshot, expectedCursor)` por compare-and-set (devolve `false` em conflito; last-write-wins não é conforme) e `delete` opcional. `resumeChatSession` aceita ausência como sessão nova, migra explicitamente o envelope v0 e rejeita estado corrompido, não suportado, de outra sessão ou de definição incompatível. Registros de confirmação pendentes, em processamento e terminais são persistidos; a resolução reivindica `approving`/`rejecting`/`expiring` por CAS, só o vencedor delega ao controlador upstream e avança ao terminal por um segundo CAS.

## Contexto e consequências

**Contexto.** Retomada entre clientes precisa de estado determinístico, cursor e vínculos de confirmação além do histórico; duplicar mensagens no envelope criaria autoridades conflitantes. Rejeitados: guardar mensagens no envelope, empacotar adapters de localStorage/arquivo/banco, e aceitar qualquer versão/definição silenciosamente.

**Consequências.**

- Hosts coordenam duas preocupações: `ChatMemory` (mensagens) e `SessionStorage` (metadados).
- Revisões da definição tornam a compatibilidade explícita.
- A migração v0→v1 é estreita e testada.
- Falhas de storage rejeitam persistências explícitas sem criar um segundo ciclo de vida.

## Pacotes afetados

[[chat]] (`SessionStorage`, `SessionConflictError`, `resumeChatSession` em `packages/chat/src/index.ts:579,599,961`), [[chat-protocol]] (`SessionSnapshotSchema`), [[chat-server]].

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0011-application-session-metadata-over-chat-memory.md`.
