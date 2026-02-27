FROM node:20 AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN cd shared && npx tsc --force && echo "shared build ok"
RUN ls -la shared/dist/
RUN cd server && npx tsc --skipLibCheck

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/shared/package.json shared/
COPY --from=builder /app/server/package.json server/
COPY --from=builder /app/node_modules/ node_modules/
COPY --from=builder /app/shared/dist/ shared/dist/
COPY --from=builder /app/server/dist/ server/dist/
CMD ["node", "server/dist/index.js"]
