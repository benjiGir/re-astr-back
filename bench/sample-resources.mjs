#!/usr/bin/env node
// Samples RSS (RAM) and CPU% for a given PID at a fixed interval, writing CSV.
// CPU% is computed from the delta in cumulative process CPU time (`ps -o time=`)
// divided by delta wall-clock time — this is interval-accurate, unlike `ps -o %cpu`
// which macOS reports as an average since process start (useless for a time series).
import { execFileSync } from 'node:child_process'
import { appendFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const idx = args.indexOf(`--${name}`)
  return idx === -1 ? fallback : args[idx + 1]
}

const pid = getArg('pid')
const outFile = getArg('out')
const intervalMs = Number(getArg('interval', '500'))

if (!pid || !outFile) {
  console.error('Usage: sample-resources.mjs --pid <pid> --out <file.csv> [--interval <ms>]')
  process.exit(1)
}

// Parses ps's cumulative CPU time format: [[DD-]HH:]MM:SS[.ss]
const parseCpuTime = (raw) => {
  const [dayPart, rest] = raw.includes('-') ? raw.split('-') : [null, raw]
  const parts = rest.split(':').map(Number)
  let seconds = 0
  if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
  else seconds = parts[0] * 60 + parts[1]
  if (dayPart) seconds += Number(dayPart) * 86400
  return seconds
}

const readSample = () => {
  try {
    const raw = execFileSync('ps', ['-o', 'rss=,time=', '-p', pid], { encoding: 'utf-8' }).trim()
    if (!raw) return null
    const match = raw.match(/^(\d+)\s+(\S+)$/)
    if (!match) return null
    return { rssKb: Number(match[1]), cpuSeconds: parseCpuTime(match[2]) }
  } catch {
    return null // process has exited
  }
}

writeFileSync(outFile, 'elapsed_ms,rss_mb,cpu_pct\n')

const start = Date.now()
let prev = readSample()
if (!prev) {
  console.error(`No such process: PID ${pid}`)
  process.exit(1)
}
let prevWallMs = start

const tick = () => {
  const sample = readSample()
  if (!sample) {
    console.error('sample-resources: target process exited, stopping')
    process.exit(0)
  }

  const nowMs = Date.now()
  const wallDeltaSeconds = (nowMs - prevWallMs) / 1000
  const cpuDeltaSeconds = sample.cpuSeconds - prev.cpuSeconds
  const cpuPct = wallDeltaSeconds > 0 ? (100 * cpuDeltaSeconds) / wallDeltaSeconds : 0

  appendFileSync(
    outFile,
    `${nowMs - start},${(sample.rssKb / 1024).toFixed(2)},${cpuPct.toFixed(2)}\n`,
  )

  prev = sample
  prevWallMs = nowMs
}

const timer = setInterval(tick, intervalMs)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    clearInterval(timer)
    process.exit(0)
  })
}
