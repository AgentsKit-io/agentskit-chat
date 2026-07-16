# Ecosystem adoption ledger

`ecosystem-adoption.json` is the machine-readable source of truth for the
post-v0 convergence program in [PRD #99](https://github.com/AgentsKit-io/agentskit-chat/issues/99).
It records what is certified today and what remains incomplete; it is not a
promotional wishlist.

`frameworkVersion` is the exact certification baseline proven by the consumer
evidence, not an alias for the repository's next release version. It advances
only after those consumers adopt and prove a newer published version. The
workspace and release manifest versions must still match each other.

Private workspace modules keep internal implementation versions and are not
independent release identities. Governance metadata agreement applies to the
two public packages in `release/manifest.json`; the adoption baseline remains a
separate statement about the exact version proven across consumer repositories.

Validate it locally with:

```bash
pnpm ecosystem:adoption:check
pnpm test:ecosystem-adoption
```

## Classifications

- **Product chat:** an end-user surface that composes application behavior,
  presentation, and a runtime or deterministic answer source. It must use the
  consolidated AgentsKit Chat package to become certified.
- **Infrastructure consumer:** produces or validates a framework artifact but
  does not host a chat UI. It uses the relevant consolidated subpath.
- **Low-level binding example:** intentionally teaches an AgentsKit binding
  directly. It is excluded from product-chat adoption claims and must be
  labelled as an example rather than a framework host.

## Certification states

| Status | Meaning |
|---|---|
| `certified` | Exact framework version, no legacy packages, and required CI/production evidence pass. |
| `migrating` | An active consumer still uses legacy packages or has an incomplete migration. |
| `deployment-required` | Code and CI pass, but the required production property is absent. |
| `inventory-required` | A private or complex consumer needs an approved boundary audit before migration. |
| `excluded` | A low-level example is intentionally outside the product-chat total. |

The current baseline certifies five of six declared product chats on exact
`0.4.0`, including the canonical Chat documentation portal. AKOS still requires
bounded private certification; public convergence and schema validity must
never be confused with complete ecosystem convergence.

## Evidence rules

Public `pass` evidence includes an HTTPS URL. Repository CI does not fetch those
URLs, keeping ordinary builds deterministic. The final cross-repository
certification resolves them, repeats production interactions, and updates the
audited baseline through review.

Private consumers use only the fixed `private-attestation` envelope. Public
records may state aggregate pass, pending, and certification status; they may
not contain private URLs, source excerpts, product behavior, identifiers,
business rules, topology, or data.

## Updating a consumer

1. Complete the migration or deployment in the owning repository.
2. Run its frozen install, lint, typecheck, tests, build, import guard, and
   surface-appropriate smoke test.
3. Update the exact version, imports, legacy list, status, evidence, and
   `auditedAt` date in one reviewed change.
4. Run the adoption gate and the full AgentsKit Chat documentation/release
   gates.
5. Do not mark a consumer `certified` until every schema-derived requirement is
   satisfied.

Adding a new declared consumer changes the certification scope and therefore
requires an ADR review rather than an unreviewed JSON append.
