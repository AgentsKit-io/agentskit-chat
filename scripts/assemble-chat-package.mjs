#!/usr/bin/env node
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve('.')
const target = resolve(root, 'packages/chat/dist/renderers')
const renderers = ['react', 'react-native', 'ink', 'vue', 'solid', 'svelte', 'angular']

await rm(target, { recursive: true, force: true })
await mkdir(target, { recursive: true })

for (const renderer of renderers) {
  await cp(
    resolve(root, `packages/${renderer}/dist`),
    resolve(target, renderer),
    { recursive: true },
  )
}

const angularEntry = resolve(target, 'angular/fesm2022/agentskit-chat-angular.mjs')
await writeFile(
  angularEntry,
  (await readFile(angularEntry, 'utf8'))
    .replaceAll('from "@agentskit/chat"', 'from "../../../index.js"')
    .replaceAll("from '@agentskit/chat'", "from '../../../index.js'"),
)

console.log(`assembled @agentskit/chat renderer subpaths: ${renderers.join(', ')}`)
