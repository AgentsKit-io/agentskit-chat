import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

const askEndpoint = process.env.NEXT_PUBLIC_ASK_ENDPOINT?.trim()
const askOrigin = (() => {
  if (!askEndpoint) return undefined
  try { return new URL(askEndpoint).origin }
  catch { return undefined }
})()

const developmentScriptSource = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'" + (askOrigin ? ` ${askOrigin}` : ''),
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${developmentScriptSource} https://www.agentskit.io`,
  "style-src 'self' 'unsafe-inline'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
]

const demoSecurityHeaders = securityHeaders.map(header => {
  if (header.key === 'Content-Security-Policy') return { ...header, value: contentSecurityPolicy.replace("frame-ancestors 'none'", "frame-ancestors 'self'") }
  if (header.key === 'X-Frame-Options') return { ...header, value: 'SAMEORIGIN' }
  return header
})

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/demo/deterministic-chat', headers: demoSecurityHeaders },
      { source: '/((?!demo/deterministic-chat).*)', headers: securityHeaders },
    ]
  },
  transpilePackages: [
    '@agentskit/chat',
  ],
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    }
    return config
  },
}

export default withMDX(config)
