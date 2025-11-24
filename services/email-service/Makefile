.PHONY: help build test run clean docker-build docker-run

help:
	@echo "Email Service Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  build        - Build the service"
	@echo "  test         - Run tests"
	@echo "  test-cover   - Run tests with coverage"
	@echo "  run          - Run the service locally"
	@echo "  clean        - Clean build artifacts"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run   - Run Docker container"
	@echo "  lint         - Run golangci-lint"

build:
	go build -o email-service .

test:
	go test -v ./...

test-cover:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

run:
	go run .

clean:
	rm -f email-service
	rm -f coverage.out coverage.html
	go clean

docker-build:
	docker build -t email-service:latest .

docker-run:
	docker run -p 8004:8004 \
		-e DATABASE_URL="$$DATABASE_URL" \
		-e SMTP_HOST="$$SMTP_HOST" \
		-e SMTP_PORT="$$SMTP_PORT" \
		-e SMTP_USERNAME="$$SMTP_USERNAME" \
		-e SMTP_PASSWORD="$$SMTP_PASSWORD" \
		-e SMTP_FROM_EMAIL="$$SMTP_FROM_EMAIL" \
		email-service:latest

lint:
	golangci-lint run

deps:
	go mod download
	go mod verify

tidy:
	go mod tidy

fmt:
	go fmt ./...

vet:
	go vet ./...
