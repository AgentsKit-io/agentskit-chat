import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: [
    '@agentskit/chat',
    '@agentskit/chat-protocol',
    '@agentskit/chat-react',
    '@agentskit/chat-server',
  ],
}

export default withMDX(config)
