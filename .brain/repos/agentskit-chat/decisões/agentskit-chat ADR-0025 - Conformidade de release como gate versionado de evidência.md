---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0025-release-conformance-evidence-gate.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0025 - Conformidade de release como gate versionado de evidência

> [!tldr] Em linguagem comum
> Uma lista versionada de requisitos de conformidade, com evidência executável por renderer, barra o release e aponta exatamente qual renderer, componente ou evento divergiu.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-13. Fonte: `docs/architecture/adrs/0025-release-conformance-evidence-gate.md`.

## Decisão em linguagem comum

O repositório tem um único manifesto de conformidade versionado e validado em runtime, que separa requisitos universais dos de DOM, mobile nativo e terminal e mapeia cada renderer a evidência executável. Um gate de repositório valida o manifesto, compara a declaração de suporte de cada renderer com o catálogo de componentes padrão, verifica os arquivos de evidência exigidos e emite achados estáveis (código, renderer, componente/evento opcionais e remediação); meta-testes com manifestos quebrados sintéticos provam que o diagnóstico aponta a falha exata. A matriz pública gerada deriva do mesmo manifesto e catálogo — é documentação, não uma segunda fonte de verdade. As suítes dos renderers gráficos continuam responsáveis por papéis semânticos, nomes acessíveis, anúncios, estado de interação e ciclo de vida; o Ink, por fallback legível, teclado, cancelamento com Escape e saída limpa (suíte PTY). O CI de PR roda o gate e as suítes relevantes; os workflows de release rodam o mesmo gate antes de empacotar ou publicar.

## Contexto e consequências

**Contexto.** Havia fixtures de protocolo, declarações de suporte, testes de renderer, E2E de navegador e testes PTY, mas a automação de release não explicava qual renderer, componente, evento ou requisito de plataforma divergiu; um comando de teste verde não é promessa de compatibilidade, e uma tabela de paridade gerada não prova interação nem acessibilidade. Rejeitados: tabela gerada como gate, renderer virtual compartilhado, só revisão manual de acessibilidade e colocar o gate no AgentsKit.

**Consequências.**

- Falhas de release identificam renderer e remediação em vez de um agregado opaco.
- Promessas universais e por plataforma são públicas e revisáveis.
- Adicionar renderer, componente, evento ou exceção exige atualizar um manifesto validado e a evidência executável.
- Exceções precisam ser explícitas, com escopo, dono e documentação; evidência ausente falha de forma fechada.

## Pacotes afetados

Repositório: `conformance/manifest.json`, `scripts/conformance-gate.mjs`, `scripts/conformance-lib.mjs`, `tests/conformance-gate.test.ts`; relatório gerado `docs/conformance/matrix.generated.md`; scripts `pnpm test:conformance` e `pnpm conformance:gate` (`package.json:14,31`) executados em `.github/workflows/ci.yml:33,43`. Renderers: todos ([[chat-react]], [[chat-vue]], [[chat-svelte]], [[chat-solid]], [[chat-angular]], [[chat-ink]], [[chat-react-native]]).

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0025-release-conformance-evidence-gate.md`.
