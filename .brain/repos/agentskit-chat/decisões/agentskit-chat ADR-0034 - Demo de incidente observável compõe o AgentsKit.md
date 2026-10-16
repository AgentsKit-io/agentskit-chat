---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0034-observability-recording-demo.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0034 - Demo de incidente observável compõe o AgentsKit

> [!tldr] Em linguagem comum
> Uma demonstração de incidente fictício, sem modelo de linguagem e sem credenciais, mostra uma investigação de agente com linha do tempo, pausa para aprovação e replay, feita com os pacotes reais do AgentsKit.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted for implementation (palestrante), 2026-09-04. Data: 2026-09-04. Fonte: `docs/architecture/adrs/0034-observability-recording-demo.md`.

## Decisão em linguagem comum

Implementa `/demo/agent-observability` no app de documentação para a gravação da Conf42: em inglês, incidente fictício de uma Checkout API, sem credenciais, sem chamadas a LLM e sem ações de produção; console de investigação com linha do tempo interativa e pausa de aprovação sob controle do host. Critérios DEMO-01…06: caminhos determinístico e de agente roteirizado executam tools do AgentsKit e expõem versões de contexto, decisões, entradas/resultados, validação, timeout, retry limitado e fallback; rollback não executa antes da aprovação e rejeitar encerra com segurança; inspeção/exportação de trace, replay, pausa e controle de ritmo funcionam sem inventar uso/custo de modelo; testes em navegador real em cinco larguras (375 a 1920) com teclado, axe, overflow, movimento reduzido e capturas, mais aprovação visual humana; documentação da seam do adapter; deploy no projeto Vercel existente. Reutiliza `createChatController` (execução, proposta e aprovação de tools) e `createActionConfirmation` (aprovação de uso único, amarrada à sessão), compondo `defineChat` — sem runtime copiado nem executor de tools próprio. A linha do tempo é um trace de aplicação, não um exportador OpenTelemetry; a aprovação demonstra a API do host, não uma fronteira de segurança de produção.

## Contexto e consequências

**Contexto.** Demonstração de gravação que precisa ser repetível e provar execução real. Rejeitados: animação estática de eventos (não prova execução), loop de agente próprio (duplica o AgentsKit) e provider ao vivo (quebra a repetibilidade e a restrição de não usar LLM). Orçamento: checagens locais determinísticas, zero requisições de modelo pagas, um deploy de preview após a aceitação local.

**Consequências.**

- O repositório só está completo com o harness de verificação, aprovação visual explícita e evidência remota — prontidão de código não é prontidão de deploy.
- Um provider real deve ficar atrás de backend autenticado, e tools de produção exigem autorização no servidor.

## Pacotes afetados

[[chat-docs]] (`apps/docs/app/demo/agent-observability/page.tsx`, `apps/docs/lib/observability-demo.ts` e `observability-demo.test.ts`, `apps/docs/components/examples/observability-demo.tsx`; verificação `scripts/observability-check.mjs`), [[chat]] (`createActionConfirmation`, `defineChat`).

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0034-observability-recording-demo.md`.
