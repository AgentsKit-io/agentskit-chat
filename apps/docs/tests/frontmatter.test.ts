import { describe, expect, it } from 'vitest'
import { readFrontmatterValue } from '../lib/frontmatter'

describe('readFrontmatterValue', () => {
  it('reads folded descriptions as their YAML value', () => {
    const file = [
      '---',
      'title: Folded metadata',
      'description: >',
      '  A description split across',
      '  multiple lines.',
      'topics:',
      '  - markdown',
      '  - docs',
      '---',
      '# Body',
    ].join('\n')

    expect(readFrontmatterValue(file, 'description')).toBe('A description split across multiple lines.')
  })

  it('reads literal descriptions with their YAML line breaks', () => {
    const file = '---\ndescription: |\n  First line.\n  Second line.\n---\n'

    expect(readFrontmatterValue(file, 'description')).toBe('First line.\nSecond line.')
  })

  it('reads frontmatter from a CRLF file', () => {
    const file = [
      '---',
      'title: CRLF title',
      'description: CRLF description',
      '---',
      '# Body',
    ].join('\r\n')

    expect(readFrontmatterValue(file, 'title')).toBe('CRLF title')
  })

  it('reads frontmatter from a BOM file', () => {
    const file = `\uFEFF---\ntitle: BOM title\ndescription: BOM description\n---\n# Body\n`

    expect(readFrontmatterValue(file, 'description')).toBe('BOM description')
  })

  it('preserves inline quoted scalar output for the existing docs corpus', () => {
    const file = '---\ndescription: "Quoted description"\n---\n'

    expect(readFrontmatterValue(file, 'description')).toBe('"Quoted description"')
  })
})
