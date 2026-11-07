#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import autocannon from 'autocannon'

const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const idx = args.indexOf(`--${name}`)
  return idx === -1 ? fallback : args[idx + 1]
}

const url = getArg('url', 'http://localhost:3000')
const duration = Number(getArg('duration', '30'))
const connections = Number(getArg('connections', '20'))
const cookie = getArg('cookie')
const outFile = getArg('out')

const authHeaders = cookie ? { cookie } : {}

// Read-only mix against seeded data — reproducible across runs, no
// dependency between requests, and representative of steady-state traffic
// (list + detail reads dominate; writes are comparatively rare).
const requests = [
  { method: 'GET', path: '/health' },
  { method: 'GET', path: '/projects', headers: authHeaders },
  { method: 'GET', path: '/categories', headers: authHeaders },
  { method: 'GET', path: '/tests', headers: authHeaders },
]

const result = await autocannon({
  url,
  duration,
  connections,
  requests,
})

if (outFile) writeFileSync(outFile, JSON.stringify(result, null, 2))

console.log(autocannon.printResult(result))
