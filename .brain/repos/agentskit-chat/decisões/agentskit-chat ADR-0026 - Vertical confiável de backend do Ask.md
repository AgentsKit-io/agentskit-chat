---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0026-trusted-ask-backend-vertical.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0026 - Vertical confiável de backend do Ask

> [!tldr] Em linguagem comum
> Um handler de servidor único responde às perguntas semânticas dos sites do ecossistema; o servidor, e não o navegador, decide qual site, corpus e ações valem, e toda resposta precisa de citação segura.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-13. Fonte: `docs/architecture/adrs/0026-trusted-ask-backend-vertical.md`.

## Decisão em linguagem comum

`createAskServiceHandler` (em `@agentskit/chat-server`) é um handler Web-standard `Request → Response`. Autenticação e resolução validada do site acontecem antes do parse do corpo; o contexto autenticado escolhe a configuração completa do site (identidade do site e do assistente, corpus e modo de retrieval, sugestões, componentes/ações registrados, deadlines, limite de fontes, política de persistência). Os parâmetros `corpus` e `persona` do cliente são só dicas de compatibilidade; divergência falha de forma fechada. O cliente envia o request aditivo `agentskit.chat.ask` v1 via `createAskAdapter`; quando o plano determinístico escala, o envelope de baixa confiança vai como contexto limitado, só para medir o fallback. Hosts injetam retrieval (RAG/Retriever do AgentsKit), geração (provider/adapter do AgentsKit), store de sessão CAS, rate limiting, autenticação e observador de métricas. Respostas bem-sucedidas exigem ao menos uma citação segura validada e saem no NDJSON Ask existente; o servidor não aceita ações ou componentes gerados (o único componente projetado é a lista de citações). A persistência carrega um registro confiável `(site, subject, session)` e anexa só o último turno do usuário; o save usa revisão esperada e reporta conflito tipado. As métricas contêm só identificadores de site/corpus/request, nome fixo, valor/unidade/resultado e tempo — nunca prompts, respostas, fontes, credenciais, IDs de subject/sessão nem erros de provider. Nenhuma otimização de snapshot/delta ou frequência de persistência faz parte desta decisão (exige evidência de baseline e HITL).

## Contexto e consequências

**Contexto.** O plano determinístico resolve fatos exatos sem rede, mas perguntas semânticas precisam de um backend compartilhado que Registry, Playbook e Docs possam usar sem que o navegador escolha outro tenant, assistente, corpus, componente ou ação, e com o mesmo contrato público em hospedagem própria ou gerenciada. Rejeitados: confiar nos parâmetros do navegador, empacotar vector store/provider/auth/rate limiter/banco, devolver texto sem citação quando o retrieval vem vazio, criar um segundo protocolo de streaming e colocar prompts/respostas em telemetria.

**Consequências.**

- Deploys hospedados e próprios montam o mesmo handler e usam os mesmos schemas de request, evento, site-config, diagnóstico e métrica.
- Operadores precisam fornecer storage CAS durável quando o site exige persistência.
- Retrieval e geração continuam substituíveis, cada um com a própria resiliência.
- Um miss determinístico é medido ponta a ponta sem enfraquecer o isolamento de corpus; fontes vazias ou inválidas falham com segurança.

## Pacotes afetados

[[chat-server]] (`createAskServiceHandler`, `packages/server/src/ask-service.ts:133`; teste `packages/server/tests/ask-service.test.ts`), [[chat-protocol]] (`AskBackendRequestSchema`, `packages/protocol/src/backend.ts:36`), [[chat]] (`createAskAdapter`, `packages/chat/src/ask.ts`). Doc de protocolo: `docs/protocol/ask-service.md`.

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0026-trusted-ask-backend-vertical.md`.
