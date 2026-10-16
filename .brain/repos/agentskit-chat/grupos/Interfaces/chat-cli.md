---
tipo: pacote
repo: agentskit-chat
grupo: Interfaces
camada: ferramenta
visibilidade: publico
npm: "@agentskit/chat-cli"
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/cli.md", "packages/cli/fixtures/readme-example.mjs", "packages/cli/package.json", "packages/cli/src/index.ts", "packages/cli/tests/generated-projects.test.ts", "packages/cli/tests/init.test.ts"]
tags: [pacote, repo/agentskit-chat, grupo/interfaces]
---

# @agentskit/chat-cli

> [!tldr] Em linguagem comum
> Apresenta a conversa AgentsKit em CLI Node, conservando a definição compartilhada e os componentes nativos.

← [[00 Grupo - agentskit-chat - Interfaces]]

## O que faz e por que existe

Apresenta a conversa AgentsKit em CLI Node, conservando a definição compartilhada e os componentes nativos. Não sobrescrever projeto existente nem gerar comportamento upstream privado; suportar a matriz fechada dos sete renderers.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `detectRenderer(dir)` | função | Detecta renderer suportado | `packages/cli/src/index.ts:159` |
| `initChatProject(options: InitChatProjectOptions): Promise<readonly string[]>` | função | Gera projeto inicial | `packages/cli/src/index.ts:177` |
| `addChatComponent(options: AddComponentOptions): Promise<readonly string[]>` | função | Gera contrato/componente | `packages/cli/src/index.ts:230` |

Exemplo real (`packages/cli/fixtures/readme-example.mjs`):

```ts
export const renderers = ['react', 'react-native', 'ink', 'vue', 'svelte', 'solid', 'angular']
console.log(`Supported renderers: ${renderers.join(', ')}`)
```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | consumidores de exemplo descritos no grupo; consumidores externos não enumerados |
| Dependências | [[chat]], [[agentskit-cli]] e runtime CLI Node |

## Dados e efeitos

Lê arquivos/package manifests do diretório alvo e grava scaffolding em alvo vazio. Sem variáveis próprias ou rede necessária.

## Como mexer (para agentes)

- **Entrada:** `packages/cli/src/index.ts`.
- **Invariantes:** Não sobrescrever projeto existente nem gerar comportamento upstream privado; suportar a matriz fechada dos sete renderers.
- **Testes:** `packages/cli/tests/init.test.ts`; packages/cli/tests/generated-projects.test.ts.
- **Validação:** `pnpm --filter @agentskit/chat-cli lint && pnpm --filter @agentskit/chat-cli test`.
- **Armadilhas:** Não deixar o binding upstream e o shell divergirem; executar testes de protocolo comuns.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs: 0014, 0016, 0028

Histórico recente do caminho: 2026-10-10 · 4891be6 release 0.6.0; 2026-10-02 · 0bfd034 cobertura; 2026-07-14 · 40ee0fd consolidação

> [!info]- Detalhe técnico
> `packages/cli/src/index.ts:177` declara o shell; `packages/cli/fixtures/readme-example.mjs:1` fornece o exemplo; `packages/cli/package.json:1` declara peer e scripts.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
