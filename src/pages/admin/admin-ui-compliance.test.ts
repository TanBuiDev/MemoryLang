import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))

function collectTsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) return collectTsxFiles(fullPath)
    return fullPath.endsWith('.tsx') ? [fullPath] : []
  })
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

describe('admin UI compliance', () => {
  const adminDir = currentDir
  const files = existsSync(adminDir) ? collectTsxFiles(adminDir) : []

  it('does not use browser-native dialogs in admin pages', () => {
    const violations = files.flatMap((file) => {
      const source = stripComments(readFileSync(file, 'utf8'))
      const matches = [
        ...source.matchAll(/\b(?:window\.)?(alert|confirm|prompt)\s*\(/g),
      ]
      return matches.map((match) => `${relative(adminDir, file)} uses ${match[1]}()`)
    })

    expect(violations).toEqual([])
  })

  it('does not use direct native select markup in admin pages', () => {
    const violations = files.flatMap((file) => {
      const source = stripComments(readFileSync(file, 'utf8'))
      const matches = [
        ...source.matchAll(/<\s*\/?\s*(select|option)\b/gi),
      ]
      return matches.map((match) => `${relative(adminDir, file)} uses <${match[1].toLowerCase()}>`)
    })

    expect(violations).toEqual([])
  })
})
