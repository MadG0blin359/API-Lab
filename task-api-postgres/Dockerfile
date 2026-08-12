FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .



FROM node:24-alpine AS runner

WORKDIR /app

# Enforce Least Privilege principle by switching to the non-root 'node' user
USER node

COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/openapi.json ./
COPY --chown=node:node --from=builder /app/src ./src
COPY --chown=node:node --from=builder /app/server.js ./

EXPOSE 3000

CMD ["node", "server.js"]