# Stage 1: Dependencies
FROM node:24-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: Builder
FROM node:24-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run build

RUN pnpm prune --prod

# Stage 3: Runner
FROM node:24-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 reastr

COPY --from=builder --chown=reastr:nodejs /app/dist ./dist
COPY --from=builder --chown=reastr:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=reastr:nodejs /app/package.json ./package.json

USER reastr

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["dumb-init", "node", "dist/main.js"]
