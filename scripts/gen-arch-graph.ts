/**
 * Static analyzer: reconstructs the app's Effect service/Layer dependency
 * graph by reading src/ as text, not by running it. Node discovery only
 * recognizes patterns this codebase already uses uniformly:
 *   - `class X extends Context.Service<...>()('id') {}` / `HttpApiMiddleware.Service<...>()('id', {...}) {}`
 *   - `export const X = HttpApiBuilder.group(...)` (HTTP route groups)
 *   - `export const X = Layer.succeed/effect/scoped/unwrap(...)` or `*.layer(...)` in a file with
 *     no class above (the few ambient infra layers — Logger, Telemetry — with no backing tag)
 * Edges come from scanning each node's own file for `yield* Identifier` and
 * `.middleware(Identifier)` references to another discovered node.
 *
 * Regex-based, not TS-AST-based: `typescript@7`'s package no longer exposes a
 * synchronous createSourceFile/AST-walk API in-process — it's now a thin client
 * over a native compiler, with only an RPC-style Program/Checker API under
 * `typescript/unstable/sync`. Reverse-engineering that "unstable" API (or
 * pulling in ts-morph, whose compatibility with this new architecture is
 * unverified) is overkill for the handful of narrow, uniformly-formatted
 * patterns this scan actually needs. Known limitation: a plain text scan can't
 * tell code from comments/strings, so a comment that happens to contain
 * `yield* SomeKnownService` would register as a false edge (none observed
 * today).
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const SRC_ROOT = join(ROOT, 'src')
const EXCLUDED_DIR_NAMES = new Set(['test'])
const EXCLUDED_SUFFIXES = ['.spec.ts', '.e2e-spec.ts']

const CLASS_HERITAGE_RE = /class\s+(\w+)\s+extends\s+(?:Context|HttpApiMiddleware)\.Service\s*</g
const HTTP_GROUP_RE = /export\s+const\s+(\w+)\s*=\s*HttpApiBuilder\.group\(/g
const BARE_LAYER_CTOR_RE = /export\s+const\s+(\w+)\s*=\s*Layer\.(?:succeed|effect|scoped|unwrap)\(/g
const BARE_DOT_LAYER_RE = /export\s+const\s+(\w+)\s*=\s*\w+\.layer\(/g
const YIELD_STAR_RE = /yield\*\s+(\w+)/g
const MIDDLEWARE_RE = /\.middleware\(\s*(\w+)\s*\)/g

type LayerTag = 'http' | 'middleware' | 'repo' | 'service' | 'infra' | 'auth' | 'other'

interface GraphNode {
  readonly id: string
  readonly file: string
  readonly layer: LayerTag
}

interface GraphEdge {
  readonly from: string
  readonly to: string
  readonly kind: 'uses' | 'middleware'
}

const collectSourceFiles = (dir: string): string[] => {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIR_NAMES.has(entry.name)) files.push(...collectSourceFiles(full))
      continue
    }
    if (extname(entry.name) !== '.ts') continue
    if (EXCLUDED_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) continue
    files.push(full)
  }
  return files
}

const layerForFile = (relPath: string): LayerTag => {
  const parts = relPath.split(sep)
  const base = parts.at(-1) ?? ''
  if (base === 'Authorization.ts') return 'middleware'
  if (base.endsWith('Http.ts')) return 'http'
  if (base.endsWith('Repo.ts')) return 'repo'
  if (base.endsWith('Service.ts')) return 'service'
  if (parts.includes('infra')) return 'infra'
  if (parts.includes('auth')) return 'auth'
  return 'other'
}

const matchAll = (text: string, re: RegExp): string[] =>
  [...text.matchAll(re)].map((m) => m[1] ?? '')

const findNodesInFile = (relPath: string, text: string): GraphNode[] => {
  const classIds = matchAll(text, CLASS_HERITAGE_RE)
  const httpIds = matchAll(text, HTTP_GROUP_RE)

  // Rule C only ever matches the ambient infra layers (Logger, Telemetry) that
  // have no backing service class — 'infra' by construction, not by filename.
  const bareIds =
    classIds.length === 0 && httpIds.length === 0
      ? [...new Set([...matchAll(text, BARE_LAYER_CTOR_RE), ...matchAll(text, BARE_DOT_LAYER_RE)])]
      : []

  return [
    ...classIds.map((id) => ({ id, file: relPath, layer: layerForFile(relPath) })),
    ...httpIds.map((id) => ({ id, file: relPath, layer: 'http' as const })),
    ...bareIds.map((id) => ({ id, file: relPath, layer: 'infra' as const })),
  ]
}

const findEdgesInFile = (
  text: string,
  fileNodeIds: readonly string[],
  knownIds: ReadonlySet<string>,
): GraphEdge[] => {
  if (fileNodeIds.length === 0) return []
  const edges: GraphEdge[] = []

  for (const target of matchAll(text, YIELD_STAR_RE)) {
    if (!knownIds.has(target)) continue
    for (const from of fileNodeIds)
      if (from !== target) edges.push({ from, to: target, kind: 'uses' })
  }
  for (const target of matchAll(text, MIDDLEWARE_RE)) {
    if (!knownIds.has(target)) continue
    for (const from of fileNodeIds)
      if (from !== target) edges.push({ from, to: target, kind: 'middleware' })
  }

  return edges
}

const dedupeEdges = (edges: readonly GraphEdge[]): GraphEdge[] => {
  const seen = new Map<string, GraphEdge>()
  for (const edge of edges) seen.set(`${edge.from}->${edge.to}->${edge.kind}`, edge)
  return [...seen.values()]
}

const main = (): void => {
  const files = collectSourceFiles(SRC_ROOT).map((file) => ({
    relPath: relative(SRC_ROOT, file),
    text: readFileSync(file, 'utf8'),
  }))

  const nodesByFile = files.map(({ relPath, text }) => ({
    relPath,
    text,
    nodes: findNodesInFile(relPath, text),
  }))

  const nodes = nodesByFile.flatMap(({ nodes }) => nodes)
  const knownIds = new Set(nodes.map((node) => node.id))

  const edges = dedupeEdges(
    nodesByFile.flatMap(({ text, nodes }) =>
      findEdgesInFile(
        text,
        nodes.map((node) => node.id),
        knownIds,
      ),
    ),
  )

  nodes.sort((a, b) => a.id.localeCompare(b.id))
  edges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to))

  const graph = { generatedAt: new Date().toISOString(), nodes, edges }

  const docsDir = join(ROOT, 'docs')
  mkdirSync(docsDir, { recursive: true })

  const jsonPath = join(docsDir, 'arch-graph.json')
  writeFileSync(jsonPath, `${JSON.stringify(graph, null, 2)}\n`)

  const templatePath = join(import.meta.dirname, 'arch-graph.template.html')
  const template = readFileSync(templatePath, 'utf8')
  const html = template.replace('"__GRAPH_DATA__"', JSON.stringify(graph))
  const htmlPath = join(docsDir, 'arch-graph.html')
  writeFileSync(htmlPath, html)

  console.log(`${nodes.length} nodes, ${edges.length} edges`)
  console.log(`wrote ${relative(ROOT, jsonPath)}`)
  console.log(`wrote ${relative(ROOT, htmlPath)}`)
}

main()
