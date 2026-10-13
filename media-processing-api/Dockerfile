# ====================================================================
# Multi-stage Dockerfile for Media Processing API
# Optimized for Node.js 20 on Linux Alpine with Sharp pre-compiled C++ binaries
# ====================================================================

# --- Stage 1: Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDependencies for TypeScript build)
RUN npm ci

# Copy source code and openapi spec
COPY src ./src
COPY openapi.json ./

# Build TypeScript to dist
RUN npm run build

# Prune devDependencies to keep image small
RUN npm prune --production

# --- Stage 2: Runtime stage ---
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Install dumb-init to properly handle PID 1 signal forwarding (SIGTERM / SIGINT)
RUN apk add --no-cache dumb-init

# Create non-root user for security
USER node

# Copy dependencies and compiled artifacts from builder stage
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/openapi.json ./openapi.json

# Expose HTTP port
EXPOSE 3000

# Healthcheck probe using built-in /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start server using dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]
