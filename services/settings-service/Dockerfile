# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install git (required for go mod download)
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum* ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o settings-service .

# Final stage
FROM alpine:latest

WORKDIR /app

# Install ca-certificates for HTTPS and wget for health checks
RUN apk --no-cache add ca-certificates wget

# Copy the binary from builder
COPY --from=builder /app/settings-service .

# Expose the port
EXPOSE 8090

# Run the application
CMD ["./settings-service"]
