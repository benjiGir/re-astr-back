#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const resultsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'results')

const findLatest = (label) => {
  const dirs = readdirSync(resultsDir)
    .filter((d) => d.startsWith(`${label}-`))
    .sort()
  return dirs.at(-1)
}

const args = process.argv.slice(2)
const labelA = args[0] ?? 'effect'
const labelB = args[1] ?? 'nestjs'

const resolveDir = (labelOrDir) => {
  if (readdirSync(resultsDir).includes(labelOrDir)) return labelOrDir
  const latest = findLatest(labelOrDir)
  if (!latest) throw new Error(`No results found for "${labelOrDir}" in ${resultsDir}`)
  return latest
}

const dirA = resolveDir(labelA)
const dirB = resolveDir(labelB)

const loadRun = (dirName) => {
  const dir = path.join(resultsDir, dirName)
  const metadata = JSON.parse(readFileSync(path.join(dir, 'metadata.json'), 'utf-8'))
  const autocannon = JSON.parse(readFileSync(path.join(dir, 'autocannon.json'), 'utf-8'))

  const csv = readFileSync(path.join(dir, 'resources.csv'), 'utf-8').trim().split('\n').slice(1)
  const rows = csv.map((line) => {
    const [elapsedMs, rssMb, cpuPct] = line.split(',').map(Number)
    return { elapsedMs, rssMb, cpuPct }
  })
  // First sample has no prior delta to compute CPU% from — drop it.
  const cpuRows = rows.slice(1)

  const avg = (nums) => nums.reduce((a, b) => a + b, 0) / nums.length
  const max = (nums) => Math.max(...nums)

  return {
    dirName,
    metadata,
    autocannon,
    resources: {
      avgRssMb: avg(rows.map((r) => r.rssMb)),
      maxRssMb: max(rows.map((r) => r.rssMb)),
      avgCpuPct: avg(cpuRows.map((r) => r.cpuPct)),
      maxCpuPct: max(cpuRows.map((r) => r.cpuPct)),
      samples: rows.length,
    },
  }
}

const runA = loadRun(dirA)
const runB = loadRun(dirB)

const fmt = (n, digits = 1) => n.toFixed(digits)

const row = (name, valueA, valueB) =>
  `${name.padEnd(24)} ${valueA.padStart(18)} ${valueB.padStart(18)}`

console.log(row('', runA.metadata.label, runB.metadata.label))
console.log('-'.repeat(62))
console.log(row('avg RSS (MB)', fmt(runA.resources.avgRssMb), fmt(runB.resources.avgRssMb)))
console.log(row('max RSS (MB)', fmt(runA.resources.maxRssMb), fmt(runB.resources.maxRssMb)))
console.log(row('avg CPU (%)', fmt(runA.resources.avgCpuPct), fmt(runB.resources.avgCpuPct)))
console.log(row('max CPU (%)', fmt(runA.resources.maxCpuPct), fmt(runB.resources.maxCpuPct)))
console.log('-'.repeat(62))
console.log(
  row('req/s (avg)', fmt(runA.autocannon.requests.average), fmt(runB.autocannon.requests.average)),
)
console.log(
  row('latency p50 (ms)', fmt(runA.autocannon.latency.p50), fmt(runB.autocannon.latency.p50)),
)
console.log(
  row('latency p99 (ms)', fmt(runA.autocannon.latency.p99), fmt(runB.autocannon.latency.p99)),
)
console.log(row('errors', String(runA.autocannon.errors), String(runB.autocannon.errors)))
console.log(row('timeouts', String(runA.autocannon.timeouts), String(runB.autocannon.timeouts)))
console.log('-'.repeat(62))
console.log(`${runA.metadata.label}: ${dirA}`)
console.log(`${runB.metadata.label}: ${dirB}`)
