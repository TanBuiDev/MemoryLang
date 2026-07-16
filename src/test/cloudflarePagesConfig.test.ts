import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const redirectsPath = resolve(process.cwd(), 'public/_redirects')
const topLevel404Path = resolve(process.cwd(), 'public/404.html')

function parseRedirectRules() {
  return readFileSync(redirectsPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      const [source, destination, status = '302'] = line.split(/\s+/)
      return { source, destination, status }
    })
}

describe('Cloudflare Pages redirect configuration', () => {
  it('keeps SPA deep links on index.html with a supported rewrite', () => {
    expect(parseRedirectRules()).toContainEqual({
      source: '/*',
      destination: '/index.html',
      status: '200',
    })
  })

  it('does not use unsupported non-200 rewrites in _redirects', () => {
    const unsupportedRewrites = parseRedirectRules().filter((rule) => {
      const statusCode = Number(rule.status)
      const isLocalRewrite = rule.destination.startsWith('/')
      const isRedirectStatus = [301, 302, 303, 307, 308].includes(statusCode)

      return isLocalRewrite && statusCode !== 200 && !isRedirectStatus
    })

    expect(unsupportedRewrites).toEqual([])
  })

  it('does not define a top-level 404 page that disables Cloudflare Pages SPA rendering', () => {
    expect(existsSync(topLevel404Path)).toBe(false)
  })
})
