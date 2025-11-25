# ===========================================
# AUTOLYTIQ CLIENT - PRODUCTION BUILD
# ===========================================
# Multi-stage build for optimal image size
# ===========================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy source files
COPY . .

# Build for production
RUN npm run build

# Stage 2: Production static files
# Note: In production, these files are served by nginx
# This image just contains the built files for copying
FROM alpine:3.19 AS production

WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Create a simple script to display build info
RUN echo "Autolytiq Client Build Complete" > /app/BUILD_INFO

# Default command just lists the files
CMD ["ls", "-la", "/app/dist"]
