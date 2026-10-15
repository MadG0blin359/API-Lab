# ==============================================================================
# Multi-Stage Production Dockerfile for Lead-Capture Platform API
# Optimized for Render & Cloud Container Deployments
# ==============================================================================

# ─── Stage 1: Build & Compile TypeScript ──────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy TypeScript configuration and source files
COPY tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/

# Compile TypeScript to dist/
RUN npm run build

# Remove development dependencies to keep the image minimal
RUN npm prune --omit=dev

# ─── Stage 2: Minimal Production Runtime ──────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Set default production environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Copy runtime production dependencies and compiled artifacts
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/public ./public

# Use non-root node user for container security
USER node

# Expose Render standard port
EXPOSE 10000

# Lightweight container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-10000}/health || exit 1

# Start production server
CMD ["node", "dist/server.js"]
