// OpenNext for Cloudflare Workers. See wrangler.jsonc.
// Static-assets incremental cache: prerendered pages/route handlers are served from the Worker's
// assets, so deploys need no KV writes (KV free tier: 1,000 writes/day). Nothing here uses ISR.
// Cache interception answers prerendered pages before the Next server boots (less CPU).
import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache'

export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
})
