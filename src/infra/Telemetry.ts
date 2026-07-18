import { NodeSdk } from '@effect/opentelemetry'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { Config, Effect } from 'effect'
import { TelemetryConfig } from '@/infra/Config.js'

export const TelemetryLive = NodeSdk.layer(
  Effect.gen(function* () {
    const { otlpEndpoint } = yield* Config.all(TelemetryConfig)

    return {
      resource: { serviceName: 're-astr' },
      spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter({ url: otlpEndpoint })),
    }
  }),
)
