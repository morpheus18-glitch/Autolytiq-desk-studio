.PHONY: build test run clean docker-build docker-run docker-stop help

# Default target
help:
	@echo "Config Service - Available targets:"
	@echo "  build         - Build the Go binary"
	@echo "  test          - Run all tests"
	@echo "  test-coverage - Run tests with coverage report"
	@echo "  run           - Run the service locally"
	@echo "  clean         - Clean build artifacts"
	@echo "  docker-build  - Build Docker image"
	@echo "  docker-run    - Run service with Docker Compose"
	@echo "  docker-stop   - Stop Docker Compose services"

# Build the Go binary
build:
	go build -o config-service .

# Run all tests
test:
	go test -v

# Run tests with coverage
test-coverage:
	go test -v -cover -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Run the service locally (requires PostgreSQL)
run:
	@if [ -z "$(DATABASE_URL)" ]; then \
		echo "DATABASE_URL not set. Using default."; \
		export DATABASE_URL="postgres://postgres:postgres@localhost:5432/autolytiq_config?sslmode=disable"; \
	fi
	go run .

# Clean build artifacts
clean:
	rm -f config-service
	rm -f coverage.out coverage.html

# Build Docker image
docker-build:
	docker build -t config-service:latest .

# Run with Docker Compose
docker-run:
	docker-compose up -d
	@echo "Config service running at http://localhost:8083"
	@echo "PostgreSQL running at localhost:5432"

# Stop Docker Compose services
docker-stop:
	docker-compose down

# Run database tests (requires TEST_DATABASE_URL)
test-db:
	@if [ -z "$(TEST_DATABASE_URL)" ]; then \
		echo "TEST_DATABASE_URL not set. Using default."; \
		export TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/config_test?sslmode=disable"; \
	fi
	go test -v -cover

# Format code
fmt:
	go fmt ./...

# Lint code (requires golangci-lint)
lint:
	golangci-lint run

# Install dependencies
deps:
	go mod download
	go mod tidy
