#!/bin/bash

# ===========================================
# AUTOLYTIQ PRODUCTION DEPLOYMENT SCRIPT
# ===========================================
# Usage: ./deploy.sh [command]
# Commands:
#   setup     - First-time setup (SSL, directories)
#   build     - Build all services
#   deploy    - Deploy/update services
#   rollback  - Rollback to previous version
#   logs      - View service logs
#   status    - Check service status
#   backup    - Backup database
#   restore   - Restore database from backup
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CLIENT_DIR="$(dirname "$ROOT_DIR")/client"
BACKUP_DIR="$ROOT_DIR/postgres-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Load environment
if [ -f "$ROOT_DIR/.env" ]; then
    export $(cat "$ROOT_DIR/.env" | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Copy .env.production.example to .env and configure it first."
    exit 1
fi

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# ===========================================
# SETUP COMMAND
# ===========================================
setup() {
    log "Starting first-time setup..."

    # Create necessary directories
    mkdir -p "$ROOT_DIR/certbot/conf"
    mkdir -p "$ROOT_DIR/certbot/www"
    mkdir -p "$ROOT_DIR/client-dist"
    mkdir -p "$BACKUP_DIR"

    # Check if domain is set
    if [ -z "$DOMAIN" ]; then
        error "DOMAIN is not set in .env file"
    fi

    # Generate dhparam if not exists
    if [ ! -f "$ROOT_DIR/certbot/conf/dhparam.pem" ]; then
        log "Generating DH parameters (this may take a few minutes)..."
        openssl dhparam -out "$ROOT_DIR/certbot/conf/dhparam.pem" 2048
    fi

    # Create initial self-signed certificate for nginx to start
    if [ ! -d "$ROOT_DIR/certbot/conf/live/$DOMAIN" ]; then
        log "Creating temporary self-signed certificate..."
        mkdir -p "$ROOT_DIR/certbot/conf/live/$DOMAIN"
        openssl req -x509 -nodes -days 1 \
            -newkey rsa:2048 \
            -keyout "$ROOT_DIR/certbot/conf/live/$DOMAIN/privkey.pem" \
            -out "$ROOT_DIR/certbot/conf/live/$DOMAIN/fullchain.pem" \
            -subj "/CN=$DOMAIN"
    fi

    success "Setup complete! Next steps:"
    echo "  1. Run './deploy.sh build' to build all services"
    echo "  2. Run './deploy.sh deploy' to start services"
    echo "  3. Run './deploy.sh ssl' to obtain real SSL certificate"
}

# ===========================================
# BUILD COMMAND
# ===========================================
build() {
    log "Building all services..."

    # Build client
    log "Building frontend..."
    cd "$CLIENT_DIR"
    npm ci --no-audit --no-fund
    npm run build

    # Copy to nginx serving directory
    rm -rf "$ROOT_DIR/client-dist/*"
    cp -r "$CLIENT_DIR/dist/"* "$ROOT_DIR/client-dist/"

    # Build docker images
    log "Building Docker images..."
    cd "$ROOT_DIR"
    docker-compose -f docker-compose.prod.yml build --no-cache

    success "Build complete!"
}

# ===========================================
# DEPLOY COMMAND
# ===========================================
deploy() {
    log "Deploying services..."

    # Ensure client files exist
    if [ ! -f "$ROOT_DIR/client-dist/index.html" ]; then
        warn "Client not built. Running build first..."
        build
    fi

    cd "$ROOT_DIR"

    # Pull latest images and start
    docker-compose -f docker-compose.prod.yml up -d

    # Wait for health checks
    log "Waiting for services to be healthy..."
    sleep 10

    # Check status
    status

    success "Deployment complete!"
}

# ===========================================
# STATUS COMMAND
# ===========================================
status() {
    log "Checking service status..."
    cd "$ROOT_DIR"
    docker-compose -f docker-compose.prod.yml ps

    echo ""
    log "Health check results:"

    services=(
        "api-gateway:8080"
        "auth-service:8087"
        "deal-service:8081"
        "customer-service:8082"
        "inventory-service:8083"
        "email-service:8084"
        "user-service:8085"
        "config-service:8086"
        "showroom-service:8088"
        "messaging-service:8089"
        "settings-service:8090"
    )

    for service in "${services[@]}"; do
        name="${service%%:*}"
        port="${service##*:}"
        if docker exec "autolytiq-${name%-service}" wget -q --spider "http://localhost:$port/health" 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} $name"
        else
            echo -e "  ${RED}✗${NC} $name"
        fi
    done
}

# ===========================================
# LOGS COMMAND
# ===========================================
logs() {
    cd "$ROOT_DIR"
    if [ -n "$2" ]; then
        docker-compose -f docker-compose.prod.yml logs -f "$2"
    else
        docker-compose -f docker-compose.prod.yml logs -f --tail=100
    fi
}

# ===========================================
# BACKUP COMMAND
# ===========================================
backup() {
    log "Creating database backup..."

    mkdir -p "$BACKUP_DIR"

    BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

    docker exec autolytiq-postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

    success "Backup created: $BACKUP_FILE"

    # Keep only last 7 backups
    log "Cleaning old backups (keeping last 7)..."
    ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm
}

# ===========================================
# RESTORE COMMAND
# ===========================================
restore() {
    if [ -z "$2" ]; then
        echo "Usage: ./deploy.sh restore <backup_file>"
        echo ""
        echo "Available backups:"
        ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No backups found"
        exit 1
    fi

    BACKUP_FILE="$2"

    if [ ! -f "$BACKUP_FILE" ]; then
        error "Backup file not found: $BACKUP_FILE"
    fi

    warn "This will OVERWRITE the current database!"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled"
        exit 0
    fi

    log "Restoring database from $BACKUP_FILE..."

    gunzip -c "$BACKUP_FILE" | docker exec -i autolytiq-postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"

    success "Database restored!"
}

# ===========================================
# SSL COMMAND
# ===========================================
ssl() {
    log "Obtaining SSL certificate from Let's Encrypt..."

    if [ -z "$DOMAIN" ] || [ -z "$CERTBOT_EMAIL" ]; then
        error "DOMAIN and CERTBOT_EMAIL must be set in .env"
    fi

    # Start nginx for ACME challenge
    docker-compose -f docker-compose.prod.yml up -d nginx

    # Get certificate
    docker run --rm \
        -v "$ROOT_DIR/certbot/conf:/etc/letsencrypt" \
        -v "$ROOT_DIR/certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$CERTBOT_EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN"

    # Reload nginx
    docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

    success "SSL certificate obtained!"
}

# ===========================================
# ROLLBACK COMMAND
# ===========================================
rollback() {
    warn "Rollback not yet implemented"
    echo "To rollback manually:"
    echo "  1. Restore database: ./deploy.sh restore <backup_file>"
    echo "  2. Deploy previous version: git checkout <commit> && ./deploy.sh build && ./deploy.sh deploy"
}

# ===========================================
# STOP COMMAND
# ===========================================
stop() {
    log "Stopping all services..."
    cd "$ROOT_DIR"
    docker-compose -f docker-compose.prod.yml down
    success "Services stopped"
}

# ===========================================
# MAIN
# ===========================================
case "${1:-}" in
    setup)
        setup
        ;;
    build)
        build
        ;;
    deploy)
        deploy
        ;;
    status)
        status
        ;;
    logs)
        logs "$@"
        ;;
    backup)
        backup
        ;;
    restore)
        restore "$@"
        ;;
    ssl)
        ssl
        ;;
    rollback)
        rollback
        ;;
    stop)
        stop
        ;;
    *)
        echo "Autolytiq Deployment Script"
        echo ""
        echo "Usage: ./deploy.sh <command>"
        echo ""
        echo "Commands:"
        echo "  setup     First-time setup (directories, temp SSL)"
        echo "  build     Build frontend and Docker images"
        echo "  deploy    Deploy/update all services"
        echo "  status    Check service health status"
        echo "  logs      View service logs (optional: service name)"
        echo "  backup    Create database backup"
        echo "  restore   Restore database from backup"
        echo "  ssl       Obtain Let's Encrypt SSL certificate"
        echo "  stop      Stop all services"
        echo "  rollback  Rollback to previous version"
        ;;
esac
