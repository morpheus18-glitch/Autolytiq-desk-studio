#!/bin/bash

# =============================================================================
# Autolytiq Unified Deployment & Management Script
# =============================================================================
# Usage: npm run autolytiq [command]
# Commands:
#   build     - Build all services
#   deploy    - Deploy all services to Kubernetes
#   start     - Start all services locally with Docker Compose
#   stop      - Stop all services
#   logs      - View logs for all services
#   status    - Check status of all services
#   test      - Run all tests
#   migrate   - Run database migrations
#   seed      - Seed the database
#   clean     - Clean all build artifacts
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICES_DIR="$PROJECT_ROOT/services"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-autolytiq}"
VERSION="${VERSION:-latest}"

# Service list
SERVICES=(
    "api-gateway"
    "auth-service"
    "config-service"
    "customer-service"
    "deal-service"
    "email-service"
    "inventory-service"
    "messaging-service"
    "settings-service"
    "showroom-service"
    "user-service"
    "data-retention-service"
)

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo ""
    echo -e "${PURPLE}=======================================${NC}"
    echo -e "${PURPLE} $1${NC}"
    echo -e "${PURPLE}=======================================${NC}"
    echo ""
}

# =============================================================================
# Build Functions
# =============================================================================

build_go_service() {
    local service=$1
    local service_dir="$SERVICES_DIR/$service"

    if [[ ! -d "$service_dir" ]]; then
        log_warn "Service directory not found: $service"
        return 1
    fi

    log_info "Building $service..."

    cd "$service_dir"

    # Build Go binary
    if [[ -f "go.mod" ]]; then
        CGO_ENABLED=0 GOOS=linux go build -o "/tmp/$service" .
        log_success "$service built successfully"
    else
        log_warn "$service has no go.mod, skipping Go build"
    fi

    cd "$PROJECT_ROOT"
}

build_docker_image() {
    local service=$1
    local service_dir="$SERVICES_DIR/$service"
    local dockerfile="$service_dir/Dockerfile"

    if [[ ! -f "$dockerfile" ]]; then
        log_warn "Dockerfile not found for $service"
        return 1
    fi

    log_info "Building Docker image for $service..."

    docker build \
        -t "$DOCKER_REGISTRY/$service:$VERSION" \
        -t "$DOCKER_REGISTRY/$service:latest" \
        -f "$dockerfile" \
        "$service_dir"

    log_success "Docker image built: $DOCKER_REGISTRY/$service:$VERSION"
}

build_all() {
    log_header "Building All Autolytiq Services"

    # Build frontend first
    log_info "Building frontend..."
    cd "$PROJECT_ROOT"
    npm run build 2>/dev/null || log_warn "Frontend build skipped (may need npm install)"

    # Build each Go service
    for service in "${SERVICES[@]}"; do
        build_go_service "$service" || true
    done

    log_success "All services built!"
}

build_docker_all() {
    log_header "Building All Docker Images"

    for service in "${SERVICES[@]}"; do
        build_docker_image "$service" || true
    done

    log_success "All Docker images built!"
}

# =============================================================================
# Deploy Functions
# =============================================================================

deploy_kubernetes() {
    log_header "Deploying to Kubernetes"

    local k8s_dir="$PROJECT_ROOT/infrastructure/k8s"

    if [[ ! -d "$k8s_dir" ]]; then
        log_error "Kubernetes manifests not found at $k8s_dir"
        exit 1
    fi

    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl."
        exit 1
    fi

    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi

    log_info "Applying base configurations..."
    kubectl apply -k "$k8s_dir/base" || true

    log_info "Waiting for deployments to be ready..."
    for service in "${SERVICES[@]}"; do
        kubectl rollout status deployment/"$service" -n autolytiq --timeout=120s 2>/dev/null || true
    done

    log_success "Deployment complete!"
}

# =============================================================================
# Local Development Functions
# =============================================================================

start_local() {
    log_header "Starting Local Development Environment"

    # Check if docker-compose is available
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        log_error "docker-compose not found. Please install Docker Compose."
        exit 1
    fi

    cd "$PROJECT_ROOT"

    # Start core infrastructure
    log_info "Starting infrastructure (PostgreSQL, Redis)..."
    $COMPOSE_CMD up -d postgres redis 2>/dev/null || {
        log_warn "docker-compose.yml may not exist, creating minimal setup..."

        # Create a minimal docker-compose for development
        docker run -d --name autolytiq-postgres \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=postgres \
            -e POSTGRES_DB=autolytiq \
            -p 5432:5432 \
            postgres:15-alpine 2>/dev/null || true

        docker run -d --name autolytiq-redis \
            -p 6379:6379 \
            redis:7-alpine 2>/dev/null || true
    }

    log_info "Starting frontend development server..."
    npm run dev &

    log_success "Local environment started!"
    log_info "Frontend: http://localhost:5173"
    log_info "API Gateway: http://localhost:8000"
}

stop_local() {
    log_header "Stopping Local Development Environment"

    # Kill npm processes
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "tsx" 2>/dev/null || true

    # Stop Docker containers
    docker stop autolytiq-postgres autolytiq-redis 2>/dev/null || true
    docker rm autolytiq-postgres autolytiq-redis 2>/dev/null || true

    # Try docker-compose
    if command -v docker-compose &> /dev/null; then
        cd "$PROJECT_ROOT"
        docker-compose down 2>/dev/null || true
    fi

    log_success "All services stopped!"
}

# =============================================================================
# Database Functions
# =============================================================================

run_migrations() {
    log_header "Running Database Migrations"

    cd "$PROJECT_ROOT"

    # Run drizzle migrations
    log_info "Running Drizzle migrations..."
    npm run db:push 2>/dev/null || log_warn "Drizzle migration failed"

    # Run init-db.sql if direct connection
    if [[ -n "$DATABASE_URL" ]]; then
        log_info "Running init-db.sql..."
        psql "$DATABASE_URL" -f "$SERVICES_DIR/init-db.sql" 2>/dev/null || log_warn "init-db.sql failed"
    fi

    log_success "Migrations complete!"
}

seed_database() {
    log_header "Seeding Database"

    cd "$PROJECT_ROOT"
    npm run seed 2>/dev/null || log_warn "Seed script failed"

    log_success "Database seeded!"
}

# =============================================================================
# Testing Functions
# =============================================================================

run_tests() {
    log_header "Running All Tests"

    cd "$PROJECT_ROOT"

    log_info "Running unit tests..."
    npm run test:unit 2>/dev/null || log_warn "Unit tests failed or not configured"

    log_info "Running integration tests..."
    npm run test:integration 2>/dev/null || log_warn "Integration tests failed or not configured"

    log_info "Running type check..."
    npm run typecheck 2>/dev/null || log_warn "Type check failed"

    log_info "Running linter..."
    npm run lint 2>/dev/null || log_warn "Linting failed"

    log_success "Test suite complete!"
}

# =============================================================================
# Status Functions
# =============================================================================

show_status() {
    log_header "Autolytiq System Status"

    echo -e "${CYAN}Docker Containers:${NC}"
    docker ps --filter "name=autolytiq" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No Docker containers running"

    echo ""
    echo -e "${CYAN}Kubernetes Deployments:${NC}"
    kubectl get deployments -n autolytiq 2>/dev/null || echo "Kubernetes not available or namespace not found"

    echo ""
    echo -e "${CYAN}Local Processes:${NC}"
    pgrep -a "node|tsx|vite" 2>/dev/null | head -10 || echo "No Node.js processes running"
}

show_logs() {
    log_header "Service Logs"

    local service="${2:-}"

    if [[ -n "$service" ]]; then
        # Show logs for specific service
        docker logs -f "autolytiq-$service" 2>/dev/null || \
        kubectl logs -f "deployment/$service" -n autolytiq 2>/dev/null || \
        log_error "Cannot find logs for $service"
    else
        # Show combined logs
        docker logs --tail 100 autolytiq-api-gateway 2>/dev/null || \
        kubectl logs -l app=autolytiq --tail=100 -n autolytiq 2>/dev/null || \
        log_warn "No logs available"
    fi
}

# =============================================================================
# Clean Functions
# =============================================================================

clean_all() {
    log_header "Cleaning Build Artifacts"

    cd "$PROJECT_ROOT"

    log_info "Removing build directories..."
    rm -rf dist
    rm -rf node_modules/.vite
    rm -rf client/dist
    rm -rf .tsbuildinfo

    log_info "Removing Go binaries..."
    for service in "${SERVICES[@]}"; do
        rm -f "/tmp/$service"
    done

    log_info "Removing Docker images..."
    for service in "${SERVICES[@]}"; do
        docker rmi "$DOCKER_REGISTRY/$service:$VERSION" 2>/dev/null || true
        docker rmi "$DOCKER_REGISTRY/$service:latest" 2>/dev/null || true
    done

    log_success "Clean complete!"
}

# =============================================================================
# Help Function
# =============================================================================

show_help() {
    echo ""
    echo -e "${PURPLE}Autolytiq CLI - Unified Deployment & Management${NC}"
    echo ""
    echo "Usage: npm run autolytiq [command]"
    echo ""
    echo "Commands:"
    echo "  build         Build all Go services"
    echo "  build:docker  Build all Docker images"
    echo "  deploy        Deploy to Kubernetes"
    echo "  start         Start local development environment"
    echo "  stop          Stop all local services"
    echo "  status        Show system status"
    echo "  logs [svc]    View logs (optionally for specific service)"
    echo "  test          Run all tests"
    echo "  migrate       Run database migrations"
    echo "  seed          Seed the database"
    echo "  clean         Clean all build artifacts"
    echo "  help          Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DOCKER_REGISTRY  Docker registry (default: autolytiq)"
    echo "  VERSION          Image version tag (default: latest)"
    echo "  DATABASE_URL     PostgreSQL connection string"
    echo ""
}

# =============================================================================
# Main Entry Point
# =============================================================================

main() {
    local command="${1:-help}"

    case "$command" in
        build)
            build_all
            ;;
        build:docker|docker)
            build_docker_all
            ;;
        deploy)
            build_docker_all
            deploy_kubernetes
            ;;
        start|up)
            start_local
            ;;
        stop|down)
            stop_local
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$@"
            ;;
        test)
            run_tests
            ;;
        migrate)
            run_migrations
            ;;
        seed)
            seed_database
            ;;
        clean)
            clean_all
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
