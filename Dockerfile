FROM node:20 AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN ls -la node_modules/@poker/ && ls -la node_modules/@poker/shared/
RUN npm run build:shared
RUN ls -la shared/dist/
RUN npm run build:server

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/shared/package.json shared/
COPY --from=builder /app/server/package.json server/
COPY --from=builder /app/node_modules/ node_modules/
COPY --from=builder /app/shared/dist/ shared/dist/
COPY --from=builder /app/server/dist/ server/dist/
CMD ["node", "server/dist/index.js"]
