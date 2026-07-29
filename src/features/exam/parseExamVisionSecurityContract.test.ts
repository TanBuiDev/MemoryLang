import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const functionPath = resolve(process.cwd(), 'supabase/functions/parse-exam-vision/index.ts')
const clientPath = resolve(process.cwd(), 'src/utils/geminiVisionParser.ts')

describe('parse-exam-vision security contract', () => {
  it('requires a verified user before accessing the server-side key pool', () => {
    const source = readFileSync(functionPath, 'utf8')

    expect(source).toContain("req.headers.get('Authorization')")
    expect(source).toContain('supabaseUser.auth.getUser()')
    expect(source).toContain("error: 'Unauthorized.' }, 401")
  })

  it('never accepts or falls back to a browser-provided Gemini key', () => {
    const functionSource = readFileSync(functionPath, 'utf8')
    const clientSource = readFileSync(clientPath, 'utf8')

    expect(functionSource).not.toContain('customApiKey')
    expect(functionSource).not.toContain('VITE_GEMINI_API_KEY')
    expect(clientSource).not.toContain('customApiKey')
  })
})
