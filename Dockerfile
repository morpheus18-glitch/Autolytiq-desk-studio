# Multi-stage build for Autolytiq Desk Studio
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install

# Copy frontend source
COPY client ./client
COPY shared ./shared
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts* ./
COPY tailwind.config.js* ./
COPY postcss.config.js* ./

# Build frontend
RUN npm run build

# Stage 2: Build Go API Gateway
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

# Stage 3: Final runtime image
FROM alpine:3.19

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy Go binary from go-builder
COPY --from=go-builder /app/api-gateway/api-gateway .

# Copy frontend from frontend-builder
COPY --from=frontend-builder /app/dist/public ./static/

# Expose port (Railway will inject $PORT)
EXPOSE 8080

CMD ["./api-gateway"]
