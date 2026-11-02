import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as upstream from '@agentskit/react'

const sourceDirectory = join(process.cwd(), 'src')
const source = readdirSync(sourceDirectory)
  .filter(file => /\.tsx?$/.test(file))
  .map(file => readFileSync(join(sourceDirectory, file), 'utf8'))
  .join('\n')

describe('@agentskit/chat/react upstream boundary', () => {
  it('does not redefine or re-export any @agentskit/react export', () => {
    const duplicated = Object.keys(upstream).filter(name => {
      const declaration = new RegExp(`\\b(?:const|function|class)\\s+${name}\\b`)
      const reexport = new RegExp(`export\\s*(?:type\\s*)?\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*'@agentskit/react'`)
      return declaration.test(source) || reexport.test(source)
    })
    expect(duplicated).toEqual([])
  })
})
