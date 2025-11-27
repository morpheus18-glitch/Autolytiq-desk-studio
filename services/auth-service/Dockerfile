FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY *.go ./

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o auth-service .

# Final stage
FROM alpine:3.19

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary from builder
COPY --from=builder /app/auth-service .

# Expose port
EXPOSE 8087

# Run
CMD ["./auth-service"]
