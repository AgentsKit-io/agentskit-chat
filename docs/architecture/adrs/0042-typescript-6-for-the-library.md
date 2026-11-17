# ADR-0042: The library stays on TypeScript 6

Status: Accepted, 2026-11-17.

## Context

The organization's CI standard pins TypeScript 7 (the native compiler) for applications and lets a library record an explicit compatibility decision instead. `agentskit-chat` is a library: it publishes `@agentskit/chat` and framework renderers that are checked and built by tools that load the TypeScript JavaScript API (`svelte-check`, `vue-tsc`, `ng-packagr`, `tsup --dts`).

We tried TypeScript 7.0.2 as the root `devDependency` on 2026-11-17 and ran `pnpm lint`:

1. `tsc --noEmit` stopped at `tsconfig.base.json` with `TS5102: Option 'baseUrl' has been removed` and `TS5090: Non-relative paths are not allowed`. Removing `baseUrl` and prefixing every `paths` entry with `./` fixed this.
2. `packages/svelte` then failed in `svelte-check`: "TypeScript 7 support currently requires both TypeScript 7 and TypeScript 6 installed in your project, and requires using the --tsgo or --tsgo-experimental-api flag."
3. `packages/angular` pins TypeScript `^5.9.3` because the Angular compiler supports only that range, and `ng-packagr` and `tsup --dts` emit declarations through the TypeScript 6 API.

## Decision

The repository stays on TypeScript 6 (`typescript` `^6.0.3` at the root and in `apps/docs`, `^5.9.3` in `packages/angular`). It does not pin TypeScript 7 until every tool that type-checks or emits declarations for a published package supports TypeScript 7 without a second TypeScript install.

## Consequences

- `pnpm lint` and the pre-push hook type-check with TypeScript 6. Declaration output for consumers does not change.
- Consumers on TypeScript 7 are not affected: the published `.d.ts` files use no syntax that TypeScript 7 rejects.
- Revisit when `svelte-check`, `vue-tsc`, `ng-packagr` and `tsup` support TypeScript 7 directly. The migration then needs the `tsconfig.base.json` change from step 1 above, and it must keep `pnpm lint`, `pnpm build` and `pnpm check:public-api` green.
