# Ecosystem documentation tracer

## Outcome

Make `/docs` the canonical public entry point, remove the separate sparse landing experience,
and connect AgentsKit Chat to the six sibling products without changing runtime contracts.

## Acceptance criteria

- `/` redirects to `/docs`, and `/docs` renders a concise, useful Fumadocs index.
- the index contains a verified quick start, one useful Mermaid diagram, key journeys, six
  contextual sibling links, and machine-readable documentation entry points.
- the hosted seven-product ecosystem bar identifies AgentsKit Chat as the current product.
- `llms.txt` and raw Markdown expose the new canonical index without a second prose corpus.

## Dependencies and test plan

- Reuse the canonical `docs/` corpus, Fumadocs source loader, existing quick start, raw routes,
  machine surfaces, and hosted ecosystem bar.
- Run docs lint, unit tests, build, E2E accessibility/navigation checks, Doc Bridge index/gate,
  and exact doctor coverage.

## Documentation impact and Definition of Done

This page and `docs/index.md` are the only new prose. Completion requires the root redirect,
canonical metadata, responsive docs rendering, valid links, green checks, and Doc Bridge 100/100.

## Upstream-adoption record

- **Inspected source:** `apps/docs`, ADR-0027, the canonical quick starts, API reference, and
  ecosystem adoption docs.
- **Reused exports:** Fumadocs `source`, `DocsLayout`, existing machine routes, and the public
  AgentsKit Chat documentation contracts.
- **Local application behavior:** routing, navigation, and documentation presentation only.
- **Linked upstream work:** none; no framework-neutral runtime gap was found.
