#!/usr/bin/env node
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const target = resolve(root, 'packages/chat/dist/renderers')
const supportedRenderers = ['react', 'react-native', 'ink', 'vue', 'solid', 'svelte', 'angular']
const requestedRenderers = process.argv.slice(2)
const renderers = requestedRenderers.length > 0 ? requestedRenderers : supportedRenderers

for (const renderer of renderers) {
  if (!supportedRenderers.includes(renderer)) throw new Error(`unknown renderer: ${renderer}`)
}

await rm(target, { recursive: true, force: true })
await mkdir(target, { recursive: true })

for (const renderer of renderers) {
  await cp(
    resolve(root, `packages/${renderer}/dist`),
    resolve(target, renderer),
    { recursive: true },
  )
}

if (renderers.includes('angular')) {
  const angularEntry = resolve(target, 'angular/fesm2022/agentskit-chat-angular.mjs')
  await writeFile(
    angularEntry,
    (await readFile(angularEntry, 'utf8'))
      .replaceAll('from "@agentskit/chat"', 'from "../../../index.js"')
      .replaceAll("from '@agentskit/chat'", "from '../../../index.js'"),
  )
}

console.log(`assembled @agentskit/chat renderer subpaths: ${renderers.join(', ')}`)
