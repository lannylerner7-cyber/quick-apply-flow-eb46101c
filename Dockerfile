FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8081

COPY package.json bun.lockb ./
RUN bun install --production --frozen-lockfile

COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8081/health || exit 1

CMD ["bun", "server/index.ts"]