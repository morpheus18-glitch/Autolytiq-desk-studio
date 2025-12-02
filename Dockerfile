# Multi-stage build for Autolytiq Desk Studio

# Stage 1: Build Rust/WASM Tax Engine
FROM rust:1.75-alpine AS wasm-builder

# Install build dependencies
RUN apk add --no-cache musl-dev curl

# Install wasm-pack
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

WORKDIR /app

# Copy tax engine source
COPY services/tax-engine-rs ./tax-engine-rs

# Build WASM module
WORKDIR /app/tax-engine-rs
RUN wasm-pack build --target web --out-dir /app/wasm-output

# Stage 2: Build frontend with WASM
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies (including devDependencies for build)
RUN npm ci --include=dev || npm install

# Copy WASM output from wasm-builder
COPY --from=wasm-builder /app/wasm-output ./shared/autoTaxEngine/wasm

# Copy frontend source and shared code
COPY client ./client
COPY shared ./shared
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts* ./
COPY tailwind.config.js* ./
COPY postcss.config.js* ./
COPY postcss.config.cjs* ./

# Build frontend (using vite build directly)
RUN npx vite build

# Stage 3: Build Go API Gateway
FROM golang:1.21-alpine AS go-builder

WORKDIR /app

# Copy shared logging module
COPY services/shared/logging ./shared/logging/

# Copy API gateway
COPY services/api-gateway/go.mod services/api-gateway/go.sum* ./api-gateway/
COPY services/api-gateway/*.go ./api-gateway/

# Update replace directive and build
WORKDIR /app/api-gateway
RUN sed -i 's|=> ../shared/logging|=> /app/shared/logging|g' go.mod
RUN go mod download || true
RUN CGO_ENABLED=0 GOOS=linux GOWORK=off go build -a -installsuffix cgo -o api-gateway .

# Stage 4: Final runtime image
FROM alpine:3.19

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy Go binary from go-builder
COPY --from=go-builder /app/api-gateway/api-gateway .

# Copy frontend from frontend-builder (includes WASM)
COPY --from=frontend-builder /app/dist/public ./static/

# Expose port (Railway will inject $PORT)
EXPOSE 8080

CMD ["./api-gateway"]
