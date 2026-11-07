import * as NodeSdk from '@effect/opentelemetry/NodeSdk'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { Config, Effect, Layer } from 'effect'
import { TelemetryConfig } from '@/infra/Config.js'

/** `TELEMETRY_ENABLED=false` swaps in an empty layer: no exporter, so no failed flush on shutdown when no collector runs. */
export const TelemetryLive = Layer.unwrap(
  Effect.gen(function* () {
    const { enabled, otlpEndpoint } = yield* Config.all(TelemetryConfig)
    if (!enabled) return NodeSdk.layerEmpty

    return NodeSdk.layer(() => ({
      resource: { serviceName: 're-astr' },
      spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter({ url: otlpEndpoint })),
    }))
  }),
)
