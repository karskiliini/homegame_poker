FROM oven/bun:1 AS builder
WORKDIR /app
COPY . .
RUN bun install
RUN cd shared && bun run build
RUN cd server && bun run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/shared/package.json shared/
COPY --from=builder /app/server/package.json server/
COPY --from=builder /app/node_modules/ node_modules/
COPY --from=builder /app/shared/dist/ shared/dist/
COPY --from=builder /app/server/dist/ server/dist/
CMD ["node", "server/dist/index.js"]
