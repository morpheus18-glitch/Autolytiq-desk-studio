# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy shared module first
COPY services/shared/logging ./shared/logging/

# Copy api-gateway module
COPY services/api-gateway/go.mod services/api-gateway/go.sum* ./api-gateway/
COPY services/api-gateway/*.go ./api-gateway/

# Update replace directive to point to correct path in Docker context
WORKDIR /app/api-gateway
RUN sed -i 's|=> ../shared/logging|=> /app/shared/logging|g' go.mod
RUN go mod download || true

# Build the binary with GOPROXY=off to use local modules only
RUN CGO_ENABLED=0 GOOS=linux GOWORK=off go build -a -installsuffix cgo -o api-gateway .

# Final stage
FROM alpine:3.19

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/api-gateway/api-gateway .

# Copy static frontend files
COPY dist/public ./static/

EXPOSE 8080

CMD ["./api-gateway"]
