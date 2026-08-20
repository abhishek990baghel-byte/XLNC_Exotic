# Dockerfile for XLNC Exotic Homes Inventory Management Portal
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests and install all dependencies
COPY package*.json ./
RUN npm ci

# Copy full application code and build
COPY . .
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy package.json and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built distribution assets from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["npm", "start"]
