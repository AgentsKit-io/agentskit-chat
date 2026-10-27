# Plan
- git rm .vercelignore, apps/docs/vercel.json, .github/workflows/docs-deploy.yml
- Drop `.vercel` from .gitignore
- Reword Vercel comments in wrangler.jsonc, build-docs-index.mjs, demo-ask/route.ts
- docs-deploy.yml deleted rather than converted: `gh secret list` is not permitted in this sandbox,
  so existing Cloudflare secrets could not be confirmed. Docs deploy is manual (`pnpm cf:deploy`).
- Unused secrets (not deleted): VERCEL_ORG_ID, VERCEL_PROJECT_ID, VERCEL_TOKEN; environments
  docs-preview / docs-production.
- No cloudflare-headers script, @vercel/analytics, speed-insights or Lighthouse workflow exists.
- No changeset: no published package changed.
