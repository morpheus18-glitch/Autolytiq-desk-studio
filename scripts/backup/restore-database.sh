#!/usr/bin/env bash
# =============================================================================
# Database Restore Script
# =============================================================================
# Restores an Aurora PostgreSQL database from a snapshot or point-in-time
#
# Usage:
#   ./restore-database.sh [options]
#
# Options:
#   -e, --environment        Environment (dev|staging|prod) [required]
#   -s, --snapshot-id        Snapshot ID to restore from
#   -p, --point-in-time      Restore to specific point in time (ISO 8601 format)
#   -n, --new-cluster-name   Name for the new cluster [default: autolytiq-{env}-restored]
#   -c, --confirm            Skip confirmation prompt
#   -h, --help               Show this help message
#
# Examples:
#   ./restore-database.sh -e prod -s autolytiq-prod-full-20240101-120000
#   ./restore-database.sh -e prod -p "2024-01-15T10:30:00Z"
#   ./restore-database.sh -e staging -s autolytiq-staging-full-20240101 -c
#
# Requirements:
#   - AWS CLI v2 configured with appropriate permissions
#   - jq for JSON parsing
#
# WARNING: This script creates a NEW cluster. It does NOT modify the existing
# production cluster. After verification, you must manually swap endpoints.
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="autolytiq"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
LOG_FILE="/tmp/restore-${TIMESTAMP}.log"

# Default values
ENVIRONMENT=""
SNAPSHOT_ID=""
POINT_IN_TIME=""
NEW_CLUSTER_NAME=""
SKIP_CONFIRM="false"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Functions
# -----------------------------------------------------------------------------
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
    echo -e "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

info() { log "INFO" "${BLUE}$*${NC}"; }
success() { log "SUCCESS" "${GREEN}$*${NC}"; }
warn() { log "WARN" "${YELLOW}$*${NC}"; }
error() { log "ERROR" "${RED}$*${NC}"; }

die() {
    error "$1"
    exit 1
}

show_help() {
    head -55 "$0" | grep -E "^#" | sed 's/^# //' | sed 's/^#//'
    exit 0
}

validate_environment() {
    case "${ENVIRONMENT}" in
        dev|staging|prod)
            info "Environment: ${ENVIRONMENT}"
            ;;
        *)
            die "Invalid environment '${ENVIRONMENT}'. Must be one of: dev, staging, prod"
            ;;
    esac
}

get_aws_account_id() {
    aws sts get-caller-identity --query 'Account' --output text
}

get_cluster_identifier() {
    echo "${PROJECT_NAME}-${ENVIRONMENT}"
}

get_sns_topic_arn() {
    local account_id region
    account_id=$(get_aws_account_id)
    region=$(aws configure get region || echo "us-east-1")
    echo "arn:aws:sns:${region}:${account_id}:${PROJECT_NAME}-${ENVIRONMENT}-backup-alerts"
}

get_original_cluster_config() {
    local cluster_id
    cluster_id=$(get_cluster_identifier)

    info "Fetching original cluster configuration..."

    aws rds describe-db-clusters \
        --db-cluster-identifier "${cluster_id}" \
        --query 'DBClusters[0]' \
        --output json
}

get_db_subnet_group() {
    local cluster_id
    cluster_id=$(get_cluster_identifier)

    aws rds describe-db-clusters \
        --db-cluster-identifier "${cluster_id}" \
        --query 'DBClusters[0].DBSubnetGroup' \
        --output text
}

get_security_groups() {
    local cluster_id
    cluster_id=$(get_cluster_identifier)

    aws rds describe-db-clusters \
        --db-cluster-identifier "${cluster_id}" \
        --query 'DBClusters[0].VpcSecurityGroups[*].VpcSecurityGroupId' \
        --output text
}

list_available_snapshots() {
    local cluster_id
    cluster_id=$(get_cluster_identifier)

    info "Available snapshots for ${cluster_id}:"

    aws rds describe-db-cluster-snapshots \
        --db-cluster-identifier "${cluster_id}" \
        --query 'DBClusterSnapshots[*].{
            SnapshotId: DBClusterSnapshotIdentifier,
            Status: Status,
            CreateTime: SnapshotCreateTime,
            Engine: Engine,
            Size: AllocatedStorage
        }' \
        --output table
}

validate_snapshot_exists() {
    local snapshot_id=$1

    info "Validating snapshot '${snapshot_id}' exists..."

    local status
    status=$(aws rds describe-db-cluster-snapshots \
        --db-cluster-snapshot-identifier "${snapshot_id}" \
        --query 'DBClusterSnapshots[0].Status' \
        --output text 2>/dev/null || echo "not-found")

    if [[ "${status}" == "not-found" ]]; then
        error "Snapshot '${snapshot_id}' not found"
        list_available_snapshots
        exit 1
    fi

    if [[ "${status}" != "available" ]]; then
        die "Snapshot status is '${status}'. Must be 'available' for restore."
    fi

    success "Snapshot is available for restore"
}

confirm_restore() {
    if [[ "${SKIP_CONFIRM}" == "true" ]]; then
        return 0
    fi

    echo ""
    warn "=========================================="
    warn "DATABASE RESTORE CONFIRMATION"
    warn "=========================================="
    warn "Environment: ${ENVIRONMENT}"

    if [[ -n "${SNAPSHOT_ID}" ]]; then
        warn "Source: Snapshot ${SNAPSHOT_ID}"
    else
        warn "Source: Point-in-time ${POINT_IN_TIME}"
    fi

    warn "New Cluster: ${NEW_CLUSTER_NAME}"
    warn "=========================================="
    echo ""

    read -p "Are you sure you want to proceed? (yes/no): " confirmation

    if [[ "${confirmation}" != "yes" ]]; then
        die "Restore cancelled by user"
    fi
}

restore_from_snapshot() {
    local snapshot_id=$1
    local new_cluster=$2

    info "Restoring cluster from snapshot: ${snapshot_id}"
    info "New cluster name: ${new_cluster}"

    local subnet_group security_groups kms_key
    subnet_group=$(get_db_subnet_group)
    security_groups=$(get_security_groups)
    kms_key="alias/${PROJECT_NAME}-${ENVIRONMENT}-backup"

    # Convert security groups to array format
    local sg_array=""
    for sg in ${security_groups}; do
        sg_array="${sg_array} ${sg}"
    done

    aws rds restore-db-cluster-from-snapshot \
        --db-cluster-identifier "${new_cluster}" \
        --snapshot-identifier "${snapshot_id}" \
        --engine aurora-postgresql \
        --engine-version "15.4" \
        --db-subnet-group-name "${subnet_group}" \
        --vpc-security-group-ids ${sg_array} \
        --kms-key-id "${kms_key}" \
        --deletion-protection \
        --enable-cloudwatch-logs-exports postgresql \
        --serverless-v2-scaling-configuration MinCapacity=0.5,MaxCapacity=8 \
        --tags Key=Environment,Value="${ENVIRONMENT}" \
               Key=RestoredFrom,Value="${snapshot_id}" \
               Key=RestoredAt,Value="${TIMESTAMP}" \
               Key=Purpose,Value=restored-cluster

    success "Cluster restore initiated"
}

restore_point_in_time() {
    local pit=$1
    local new_cluster=$2
    local source_cluster
    source_cluster=$(get_cluster_identifier)

    info "Restoring cluster to point-in-time: ${pit}"
    info "Source cluster: ${source_cluster}"
    info "New cluster name: ${new_cluster}"

    local subnet_group security_groups kms_key
    subnet_group=$(get_db_subnet_group)
    security_groups=$(get_security_groups)
    kms_key="alias/${PROJECT_NAME}-${ENVIRONMENT}-backup"

    # Convert security groups to array format
    local sg_array=""
    for sg in ${security_groups}; do
        sg_array="${sg_array} ${sg}"
    done

    aws rds restore-db-cluster-to-point-in-time \
        --db-cluster-identifier "${new_cluster}" \
        --source-db-cluster-identifier "${source_cluster}" \
        --restore-to-time "${pit}" \
        --db-subnet-group-name "${subnet_group}" \
        --vpc-security-group-ids ${sg_array} \
        --kms-key-id "${kms_key}" \
        --deletion-protection \
        --enable-cloudwatch-logs-exports postgresql \
        --serverless-v2-scaling-configuration MinCapacity=0.5,MaxCapacity=8 \
        --tags Key=Environment,Value="${ENVIRONMENT}" \
               Key=RestoredToTime,Value="${pit}" \
               Key=RestoredAt,Value="${TIMESTAMP}" \
               Key=Purpose,Value=restored-cluster

    success "Point-in-time restore initiated"
}

wait_for_cluster() {
    local cluster_id=$1
    local max_wait=3600  # 1 hour timeout
    local interval=30
    local elapsed=0

    info "Waiting for cluster '${cluster_id}' to become available..."

    while [[ ${elapsed} -lt ${max_wait} ]]; do
        local status
        status=$(aws rds describe-db-clusters \
            --db-cluster-identifier "${cluster_id}" \
            --query 'DBClusters[0].Status' \
            --output text 2>/dev/null || echo "creating")

        case "${status}" in
            available)
                success "Cluster is available"
                return 0
                ;;
            creating|modifying|backing-up)
                info "Status: ${status} (elapsed: ${elapsed}s)"
                sleep ${interval}
                elapsed=$((elapsed + interval))
                ;;
            failed|deleting|deleted)
                die "Cluster failed with status: ${status}"
                ;;
            *)
                warn "Unknown status: ${status}"
                sleep ${interval}
                elapsed=$((elapsed + interval))
                ;;
        esac
    done

    die "Timeout waiting for cluster to become available"
}

create_cluster_instance() {
    local cluster_id=$1
    local instance_id="${cluster_id}-1"

    info "Creating cluster instance: ${instance_id}"

    aws rds create-db-instance \
        --db-instance-identifier "${instance_id}" \
        --db-cluster-identifier "${cluster_id}" \
        --engine aurora-postgresql \
        --db-instance-class db.serverless \
        --enable-performance-insights \
        --performance-insights-retention-period 7 \
        --tags Key=Environment,Value="${ENVIRONMENT}" \
               Key=Purpose,Value=restored-instance

    success "Instance creation initiated"

    # Wait for instance to be available
    info "Waiting for instance to become available..."
    aws rds wait db-instance-available \
        --db-instance-identifier "${instance_id}"

    success "Instance is available"
}

get_new_cluster_endpoint() {
    local cluster_id=$1

    aws rds describe-db-clusters \
        --db-cluster-identifier "${cluster_id}" \
        --query 'DBClusters[0].Endpoint' \
        --output text
}

send_notification() {
    local new_cluster=$1
    local source=$2
    local status=$3
    local topic_arn
    topic_arn=$(get_sns_topic_arn)

    local subject message
    if [[ "${status}" == "success" ]]; then
        local endpoint
        endpoint=$(get_new_cluster_endpoint "${new_cluster}" 2>/dev/null || echo "pending")

        subject="[SUCCESS] Database Restore Completed - ${ENVIRONMENT}"
        message=$(cat <<EOF
Database restore completed successfully.

Environment: ${ENVIRONMENT}
New Cluster: ${new_cluster}
Source: ${source}
Endpoint: ${endpoint}
Timestamp: ${TIMESTAMP}

NEXT STEPS:
1. Verify data integrity in the restored cluster
2. Run application smoke tests against the restored cluster
3. If verification passes, update DNS/application configuration to point to new cluster
4. Monitor the new cluster for any issues
5. Once stable, consider deleting the old cluster (after additional backup)

Log file: ${LOG_FILE}
EOF
)
    else
        subject="[FAILED] Database Restore Failed - ${ENVIRONMENT}"
        message=$(cat <<EOF
Database restore FAILED.

Environment: ${ENVIRONMENT}
Source: ${source}
Timestamp: ${TIMESTAMP}

Please check the logs and investigate immediately.
Log file: ${LOG_FILE}
EOF
)
    fi

    if aws sns publish \
        --topic-arn "${topic_arn}" \
        --subject "${subject}" \
        --message "${message}" &>/dev/null; then
        info "Notification sent to SNS topic"
    else
        warn "Failed to send notification (SNS topic may not exist)"
    fi
}

print_next_steps() {
    local new_cluster=$1
    local endpoint
    endpoint=$(get_new_cluster_endpoint "${new_cluster}")

    echo ""
    success "=========================================="
    success "RESTORE COMPLETE"
    success "=========================================="
    success "New Cluster: ${new_cluster}"
    success "Endpoint: ${endpoint}"
    success "=========================================="
    echo ""
    info "NEXT STEPS:"
    echo "1. Verify data integrity:"
    echo "   psql -h ${endpoint} -U autolytiq_admin -d autolytiq -c 'SELECT count(*) FROM deals;'"
    echo ""
    echo "2. Run application smoke tests"
    echo ""
    echo "3. Update application configuration to use new endpoint:"
    echo "   DATABASE_HOST=${endpoint}"
    echo ""
    echo "4. If using DNS failover, update Route 53 records"
    echo ""
    echo "5. Monitor the new cluster in CloudWatch"
    echo ""
}

# -----------------------------------------------------------------------------
# Parse Arguments
# -----------------------------------------------------------------------------
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -s|--snapshot-id)
                SNAPSHOT_ID="$2"
                shift 2
                ;;
            -p|--point-in-time)
                POINT_IN_TIME="$2"
                shift 2
                ;;
            -n|--new-cluster-name)
                NEW_CLUSTER_NAME="$2"
                shift 2
                ;;
            -c|--confirm)
                SKIP_CONFIRM="true"
                shift
                ;;
            -h|--help)
                show_help
                ;;
            *)
                die "Unknown option: $1"
                ;;
        esac
    done

    if [[ -z "${ENVIRONMENT}" ]]; then
        die "Environment is required. Use -e or --environment"
    fi

    if [[ -z "${SNAPSHOT_ID}" && -z "${POINT_IN_TIME}" ]]; then
        die "Either --snapshot-id or --point-in-time is required"
    fi

    if [[ -n "${SNAPSHOT_ID}" && -n "${POINT_IN_TIME}" ]]; then
        die "Cannot specify both --snapshot-id and --point-in-time"
    fi

    # Set default new cluster name if not provided
    if [[ -z "${NEW_CLUSTER_NAME}" ]]; then
        NEW_CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-restored-${TIMESTAMP}"
    fi
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
main() {
    parse_args "$@"

    info "=========================================="
    info "Starting database restore"
    info "=========================================="
    info "Environment: ${ENVIRONMENT}"
    info "Timestamp: ${TIMESTAMP}"
    info "Log File: ${LOG_FILE}"
    info "=========================================="

    # Validate environment
    validate_environment

    # Validate snapshot if provided
    if [[ -n "${SNAPSHOT_ID}" ]]; then
        validate_snapshot_exists "${SNAPSHOT_ID}"
    fi

    # Confirm restore
    confirm_restore

    # Perform restore
    if [[ -n "${SNAPSHOT_ID}" ]]; then
        restore_from_snapshot "${SNAPSHOT_ID}" "${NEW_CLUSTER_NAME}"
    else
        restore_point_in_time "${POINT_IN_TIME}" "${NEW_CLUSTER_NAME}"
    fi

    # Wait for cluster
    wait_for_cluster "${NEW_CLUSTER_NAME}"

    # Create instance
    create_cluster_instance "${NEW_CLUSTER_NAME}"

    # Send notification
    local source="${SNAPSHOT_ID:-${POINT_IN_TIME}}"
    send_notification "${NEW_CLUSTER_NAME}" "${source}" "success"

    # Print next steps
    print_next_steps "${NEW_CLUSTER_NAME}"
}

# Run main with error handling
if ! main "$@"; then
    local source="${SNAPSHOT_ID:-${POINT_IN_TIME}}"
    send_notification "" "${source}" "failed"
    exit 1
fi
