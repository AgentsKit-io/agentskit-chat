---
tipo: pacote
repo: agentskit-chat
grupo: Interfaces
camada: ferramenta
visibilidade: publico
npm: "@agentskit/chat-cli"
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente); auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/cli.md", "packages/cli/fixtures/readme-example.mjs", "packages/cli/package.json", "packages/cli/src/index.ts", "packages/cli/tests/generated-projects.test.ts", "packages/cli/tests/init.test.ts"]
tags: [pacote, repo/agentskit-chat, grupo/interfaces, camada/ferramenta]
---

# @agentskit/chat-cli

> [!tldr] Em linguagem comum
> Ferramenta de linha de comando que cria um projeto inicial de chat para um dos sete frameworks e gera componentes personalizados, sem nunca sobrescrever arquivos existentes. Ela não é uma interface de chat.

← [[00 Grupo - agentskit-chat - Interfaces]]

## O que faz e por que existe

Binário `agentskit-chat` (`packages/cli/package.json:16-18`) com os comandos `init [directory] [--renderer …] [--yes]`, `add component <name> --renderer a,b [--directory .]` e `completion bash|zsh|fish` (`packages/cli/src/bin.ts:8-13`). `initChatProject` escreve os arquivos numa pasta temporária irmã e só então a renomeia para o destino; se o destino já existe, falha com `TARGET_EXISTS` (`packages/cli/src/index.ts:183-198`). Não sobrescrever projeto existente nem gerar comportamento upstream privado; suportar a matriz fechada dos sete renderers (`CHAT_RENDERERS`, `index.ts:7`).

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `CHAT_RENDERERS` / `ChatRenderer` | const / tipo | Matriz fechada: react, react-native, ink, vue, svelte, solid, angular | `packages/cli/src/index.ts:7` |
| `ChatCliError` | classe | Códigos `RENDERER_REQUIRED`, `TARGET_EXISTS`, `MANIFEST_INVALID`, `COMPONENT_INVALID`, `COMPONENT_EXISTS` | `packages/cli/src/index.ts:23` |
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
| Consumidores | Usuários finais via `agentskit-chat` (único workspace com `publishConfig.access: public`, `packages/cli/package.json:47-50`, além do [[chat]]); nenhum workspace importa o pacote |
| Dependências | [[chat]] (`workspace:*`; só `STANDARD_COMPONENT_KEYS`, `packages/cli/src/index.ts:4`, usado para recusar nomes reservados em `index.ts:207`); `@agentskit/cross-platform` (`removePath`, `renamePath`); Zod. Os projetos gerados dependem de `@agentskit/chat` (`latest`) e do binding upstream do renderer (`index.ts:33-40`) |

## Dados e efeitos

Lê o `package.json` do diretório (detecção de renderer por dependência, `packages/cli/src/index.ts:159-175`) e grava o scaffolding com `flag: 'wx'` numa pasta temporária antes de renomear (`index.ts:187-194`). `add component` grava `src/components/<nome>.ts` e um arquivo por renderer (`index.ts:211-228`). Prompt interativo só com TTY e sem `--yes` (`bin.ts:41-44`). Sem variáveis de ambiente próprias; não faz chamadas de rede.

## Como mexer (para agentes)

- **Entrada:** `packages/cli/src/index.ts` (templates e funções) e `packages/cli/src/bin.ts` (parsing de argumentos e saída JSON `{ ok, files }`).
- **Invariantes:** Não sobrescrever projeto existente nem gerar comportamento upstream privado; suportar a matriz fechada dos sete renderers; nome de componente `^[a-z][a-z0-9-]{0,63}$` e não colidir com o catálogo padrão (`index.ts:204-208`). `addChatComponent` recusa escrever através de symlink (`:235-242`), recusa arquivo existente (`:243-244`) e desfaz os arquivos criados se uma escrita falhar (`:248-252`).
- **Testes:** `packages/cli/tests/init.test.ts`, `packages/cli/tests/generated-projects.test.ts` (compila `@agentskit/chat-server`, `packages/cli/tests/generated-projects.test.ts:30`, e exercita projetos gerados).
- **Validação:** `pnpm --filter @agentskit/chat-cli lint && pnpm --filter @agentskit/chat-cli test` (`packages/cli/package.json:33-35`).
- **Armadilhas:** os templates são strings dentro de `index.ts`; ao mudar versões de dependências dos projetos gerados (`packageJson`, `index.ts:29-43`) rode `generated-projects.test.ts`. Ao adicionar renderer, atualize `CHAT_RENDERERS` e `scripts/assemble-chat-package.mjs:8`; o `completion` do `bin.ts` lê `CHAT_RENDERERS` dinamicamente.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs: [[agentskit-chat ADR-0014 - Scaffolding seguro de aplicação numa CLI dedicada]], [[agentskit-chat ADR-0016 - CLI de sete renderizadores e geração semântica de componentes]], [[agentskit-chat ADR-0028 - Consolidação dos pacotes públicos]]

Histórico recente do caminho: 2026-10-10 · 4891be6 release 0.6.0; 2026-10-02 · 0bfd034 cobertura; 2026-07-14 · 40ee0fd consolidação

> [!info]- Detalhe técnico
> `packages/cli/src/index.ts:177` declara `initChatProject`; `packages/cli/src/bin.ts:22` é o `main` do binário; `packages/cli/fixtures/readme-example.mjs:1` fornece o exemplo; `packages/cli/package.json:32` declara os scripts.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
