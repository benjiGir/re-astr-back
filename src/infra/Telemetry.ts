import { NodeSdk } from '@effect/opentelemetry'
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'

/**
 * Console exporter for now (spans printed to stdout — pedagogical, shows the
 * HTTP -> service -> DB span tree). Swap for an OTLP exporter in production
 * once a collector exists; not wired yet (see docs/EFFECT_MIGRATION.md §8).
 */
export const TelemetryLive = NodeSdk.layer(() => ({
  resource: { serviceName: 're-astr' },
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}))
