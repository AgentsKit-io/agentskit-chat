Plan followed: delete apps/docs/vercel.json, .vercelignore, the Vercel CLI docs-deploy workflow;
drop the .vercel gitignore entry; reword two Vercel comments (no code change).
Departure: `gh secret list` is blocked in this sandbox, so Cloudflare secrets could not be confirmed;
per the contract the workflow is deleted and the docs deploy is manual (pnpm --filter @agentskit/chat-docs cf:deploy).
