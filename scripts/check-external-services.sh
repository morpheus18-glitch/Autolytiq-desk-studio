#!/bin/bash
#
# External Services Health Check Script
# ======================================
# Validates environment variables and tests connectivity to all external services.
#
# Usage:
#   ./scripts/check-external-services.sh [--env development|staging|production]
#
# Exit codes:
#   0 - All checks passed
#   1 - Missing required environment variables
#   2 - Critical service connection failed
#   3 - Non-critical service connection failed (warning)
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
ENVIRONMENT="${1:-development}"
if [[ "$1" == "--env" ]]; then
    ENVIRONMENT="${2:-development}"
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Autolytiq External Services Check${NC}"
echo -e "${BLUE}  Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to print status
print_status() {
    local name="$1"
    local status="$2"
    local message="${3:-}"

    if [[ "$status" == "pass" ]]; then
        echo -e "  ${GREEN}[PASS]${NC} $name ${message:+- $message}"
        ((PASSED++))
    elif [[ "$status" == "fail" ]]; then
        echo -e "  ${RED}[FAIL]${NC} $name ${message:+- $message}"
        ((FAILED++))
    elif [[ "$status" == "warn" ]]; then
        echo -e "  ${YELLOW}[WARN]${NC} $name ${message:+- $message}"
        ((WARNINGS++))
    elif [[ "$status" == "skip" ]]; then
        echo -e "  ${BLUE}[SKIP]${NC} $name ${message:+- $message}"
    fi
}

# Function to check if a variable is set
check_env_var() {
    local var_name="$1"
    local required="${2:-true}"
    local description="${3:-}"

    if [[ -n "${!var_name:-}" ]]; then
        print_status "$var_name" "pass" "Set"
        return 0
    else
        if [[ "$required" == "true" ]]; then
            print_status "$var_name" "fail" "Not set (required) - $description"
            return 1
        else
            print_status "$var_name" "warn" "Not set (optional) - $description"
            return 0
        fi
    fi
}

# Function to check PostgreSQL connectivity
check_postgres() {
    local url="${DATABASE_URL:-}"

    if [[ -z "$url" ]]; then
        print_status "PostgreSQL" "fail" "DATABASE_URL not set"
        return 1
    fi

    echo -e "\n${BLUE}Testing PostgreSQL connection...${NC}"

    # Try to connect using psql if available
    if command -v psql &> /dev/null; then
        if timeout 10 psql "$url" -c "SELECT 1" &> /dev/null; then
            print_status "PostgreSQL" "pass" "Connection successful"
            return 0
        else
            print_status "PostgreSQL" "fail" "Connection failed"
            return 1
        fi
    else
        # Try using pg_isready if available
        if command -v pg_isready &> /dev/null; then
            # Extract host and port from URL
            local host=$(echo "$url" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
            local port=$(echo "$url" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
            port="${port:-5432}"

            if timeout 10 pg_isready -h "$host" -p "$port" &> /dev/null; then
                print_status "PostgreSQL" "pass" "Server is accepting connections"
                return 0
            else
                print_status "PostgreSQL" "fail" "Server not accepting connections"
                return 1
            fi
        else
            # Try basic TCP connection
            local host=$(echo "$url" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
            local port=$(echo "$url" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
            port="${port:-5432}"

            if timeout 5 bash -c "echo > /dev/tcp/$host/$port" 2>/dev/null; then
                print_status "PostgreSQL" "pass" "Port reachable (install psql for full check)"
                return 0
            else
                print_status "PostgreSQL" "fail" "Cannot reach host:port"
                return 1
            fi
        fi
    fi
}

# Function to check Redis connectivity
check_redis() {
    local url="${REDIS_URL:-}"

    if [[ -z "$url" ]]; then
        print_status "Redis" "warn" "REDIS_URL not set"
        return 0
    fi

    echo -e "\n${BLUE}Testing Redis connection...${NC}"

    # Extract host and port from URL
    local host
    local port

    if [[ "$url" =~ redis(s)?://(:([^@]+)@)?([^:]+):([0-9]+) ]]; then
        host="${BASH_REMATCH[4]}"
        port="${BASH_REMATCH[5]}"
    else
        host=$(echo "$url" | sed -n 's/.*\/\/\([^:@\/]*\).*/\1/p')
        port=$(echo "$url" | sed -n 's/.*:\([0-9]*\)$/\1/p')
        port="${port:-6379}"
    fi

    # Try redis-cli if available
    if command -v redis-cli &> /dev/null; then
        local redis_args="-h $host -p $port"

        # Check for TLS
        if [[ "$url" == rediss://* ]]; then
            redis_args="$redis_args --tls"
        fi

        # Check for password
        if [[ -n "${REDIS_PASSWORD:-}" ]]; then
            redis_args="$redis_args -a $REDIS_PASSWORD"
        fi

        if timeout 10 redis-cli $redis_args PING 2>/dev/null | grep -q "PONG"; then
            print_status "Redis" "pass" "PING successful"
            return 0
        else
            print_status "Redis" "fail" "PING failed"
            return 1
        fi
    else
        # Try basic TCP connection
        if timeout 5 bash -c "echo > /dev/tcp/$host/$port" 2>/dev/null; then
            print_status "Redis" "pass" "Port reachable (install redis-cli for full check)"
            return 0
        else
            print_status "Redis" "fail" "Cannot reach host:port"
            return 1
        fi
    fi
}

# Function to check Resend API
check_resend() {
    local api_key="${RESEND_API_KEY:-}"

    if [[ -z "$api_key" ]]; then
        print_status "Resend" "warn" "RESEND_API_KEY not set"
        return 0
    fi

    echo -e "\n${BLUE}Testing Resend API...${NC}"

    if command -v curl &> /dev/null; then
        local response
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $api_key" \
            "https://api.resend.com/emails/test-health-check" 2>/dev/null)

        # 404 means API key is valid (email doesn't exist)
        # 401 means invalid API key
        if [[ "$response" == "404" || "$response" == "200" ]]; then
            print_status "Resend" "pass" "API key valid"
            return 0
        elif [[ "$response" == "401" ]]; then
            print_status "Resend" "fail" "Invalid API key"
            return 1
        else
            print_status "Resend" "warn" "Unexpected response: $response"
            return 0
        fi
    else
        print_status "Resend" "skip" "curl not available"
        return 0
    fi
}

# Function to check AWS S3
check_s3() {
    local bucket="${AWS_S3_BUCKET:-}"

    if [[ -z "$bucket" ]]; then
        print_status "S3" "warn" "AWS_S3_BUCKET not set"
        return 0
    fi

    echo -e "\n${BLUE}Testing AWS S3...${NC}"

    if command -v aws &> /dev/null; then
        if aws s3api head-bucket --bucket "$bucket" 2>/dev/null; then
            print_status "S3" "pass" "Bucket accessible"
            return 0
        else
            print_status "S3" "fail" "Cannot access bucket"
            return 1
        fi
    else
        print_status "S3" "skip" "aws-cli not available"
        return 0
    fi
}

# Function to check AWS Secrets Manager
check_secrets_manager() {
    echo -e "\n${BLUE}Testing AWS Secrets Manager...${NC}"

    if command -v aws &> /dev/null; then
        local secret_prefix="autolytiq/${ENVIRONMENT}"

        if aws secretsmanager list-secrets \
            --filter Key=name,Values="$secret_prefix" \
            --max-results 1 &>/dev/null; then
            print_status "Secrets Manager" "pass" "Accessible"
            return 0
        else
            print_status "Secrets Manager" "warn" "Cannot list secrets (check IAM permissions)"
            return 0
        fi
    else
        print_status "Secrets Manager" "skip" "aws-cli not available"
        return 0
    fi
}

# Function to check EKS cluster (if kubectl is configured)
check_eks() {
    echo -e "\n${BLUE}Testing EKS cluster...${NC}"

    if command -v kubectl &> /dev/null; then
        if kubectl cluster-info &>/dev/null; then
            print_status "EKS" "pass" "Cluster accessible"

            # Check if namespace exists
            if kubectl get namespace autolytiq &>/dev/null; then
                print_status "EKS namespace" "pass" "autolytiq namespace exists"
            else
                print_status "EKS namespace" "warn" "autolytiq namespace not found"
            fi
            return 0
        else
            print_status "EKS" "warn" "Cluster not accessible (check kubeconfig)"
            return 0
        fi
    else
        print_status "EKS" "skip" "kubectl not available"
        return 0
    fi
}

# Function to check ECR (if aws-cli is configured)
check_ecr() {
    echo -e "\n${BLUE}Testing AWS ECR...${NC}"

    if command -v aws &> /dev/null; then
        local registry
        registry=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)

        if [[ -n "$registry" ]]; then
            local region="${AWS_REGION:-us-east-1}"
            local ecr_url="${registry}.dkr.ecr.${region}.amazonaws.com"

            if aws ecr describe-repositories --registry-id "$registry" --max-items 1 &>/dev/null; then
                print_status "ECR" "pass" "Registry accessible at $ecr_url"
                return 0
            else
                print_status "ECR" "warn" "Cannot list repositories (check IAM permissions)"
                return 0
            fi
        else
            print_status "ECR" "warn" "Cannot determine AWS account"
            return 0
        fi
    else
        print_status "ECR" "skip" "aws-cli not available"
        return 0
    fi
}

# Main execution
echo -e "${BLUE}Checking required environment variables...${NC}"
echo ""

# Required variables
REQUIRED_VARS=(
    "DATABASE_URL:PostgreSQL connection string"
    "JWT_SECRET:JWT signing secret"
)

# Critical optional variables
CRITICAL_VARS=(
    "REDIS_URL:Redis connection string"
    "PII_ENCRYPTION_KEY:PII encryption key"
)

# Optional variables
OPTIONAL_VARS=(
    "RESEND_API_KEY:Email service API key"
    "AWS_S3_BUCKET:S3 bucket name"
    "AWS_REGION:AWS region"
    "SENTRY_DSN:Error tracking DSN"
)

echo -e "${BLUE}Required Variables:${NC}"
for var_desc in "${REQUIRED_VARS[@]}"; do
    var_name="${var_desc%%:*}"
    description="${var_desc#*:}"
    check_env_var "$var_name" "true" "$description" || true
done

echo ""
echo -e "${BLUE}Critical Optional Variables:${NC}"
for var_desc in "${CRITICAL_VARS[@]}"; do
    var_name="${var_desc%%:*}"
    description="${var_desc#*:}"
    check_env_var "$var_name" "false" "$description" || true
done

echo ""
echo -e "${BLUE}Optional Variables:${NC}"
for var_desc in "${OPTIONAL_VARS[@]}"; do
    var_name="${var_desc%%:*}"
    description="${var_desc#*:}"
    check_env_var "$var_name" "false" "$description" || true
done

# Service connectivity checks
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Service Connectivity Checks${NC}"
echo -e "${BLUE}========================================${NC}"

check_postgres || true
check_redis || true
check_resend || true
check_s3 || true
check_secrets_manager || true
check_eks || true
check_ecr || true

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "  ${GREEN}Passed:${NC}   $PASSED"
echo -e "  ${RED}Failed:${NC}   $FAILED"
echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

# Determine exit code
if [[ $FAILED -gt 0 ]]; then
    echo -e "${RED}Some critical checks failed. Please review the output above.${NC}"
    exit 2
elif [[ $WARNINGS -gt 0 ]]; then
    echo -e "${YELLOW}All critical checks passed, but there are warnings.${NC}"
    exit 0
else
    echo -e "${GREEN}All checks passed!${NC}"
    exit 0
fi
