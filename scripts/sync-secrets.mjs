import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env')
const content = readFileSync(envPath, 'utf-8')

const keys = content
  .split('\n')
  .filter((line) => /^(UNSPLASH_ACCESS_KEY|PEXELS_API_KEY|PIXABAY_API_KEY|GOOGLE_TTS_CREDENTIALS_B64|R2_ACCOUNT_ID|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY|R2_BUCKET_NAME|R2_PUBLIC_DOMAIN)=/.test(line))
  .map((line) => {
    const [name, ...rest] = line.split('=')
    return { name: name.trim(), value: rest.join('=').trim() }
  })
  .filter(({ name, value }) => name && value && !value.startsWith('your-'))

if (keys.length === 0) {
  console.log('No API keys found in .env')
  process.exit(0)
}

const projectRef = 'brwvbpkgimhamivmaflu'

for (const { name, value } of keys) {
  console.log(`Setting ${name}...`)
  const result = spawnSync('npx', [
    '--yes', 'supabase', 'secrets', 'set',
    `${name}=${value}`,
    '--project-ref', projectRef,
  ], { stdio: 'inherit', shell: true })

  if (result.status !== 0) {
    console.error(`Failed to set ${name}`)
    process.exit(1)
  }
}

console.log(`Synced ${keys.length} secrets to Supabase`)
