# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Copy go mod files
COPY services/data-retention-service/go.mod services/data-retention-service/go.sum* ./services/data-retention-service/
COPY services/shared/ ./services/shared/

# Download dependencies
WORKDIR /app/services/data-retention-service
RUN go mod download

# Copy source code
COPY services/data-retention-service/ ./

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o /data-retention-service .

# Final stage
FROM alpine:3.19

WORKDIR /app

# Install runtime dependencies
RUN apk --no-cache add ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /data-retention-service .
COPY --from=builder /app/services/data-retention-service/migrations ./migrations

# Create non-root user
RUN adduser -D -u 1000 appuser
USER appuser

# Expose port
EXPOSE 8091

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8091/health || exit 1

# Run the binary
CMD ["./data-retention-service"]
