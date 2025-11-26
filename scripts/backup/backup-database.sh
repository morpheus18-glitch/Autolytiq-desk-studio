#!/usr/bin/env bash
# =============================================================================
# Database Backup Script
# =============================================================================
# Creates a manual backup of the Aurora PostgreSQL database to S3
#
# Usage:
#   ./backup-database.sh [options]
#
# Options:
#   -e, --environment    Environment (dev|staging|prod) [required]
#   -t, --type           Backup type (full|incremental|pre-deploy) [default: full]
#   -r, --reason         Reason for backup (e.g., "pre-deployment", "maintenance")
#   -w, --wait           Wait for backup to complete [default: true]
#   -n, --notify         Send notification on completion [default: true]
#   -h, --help           Show this help message
#
# Examples:
#   ./backup-database.sh -e prod -t pre-deploy -r "v2.0 deployment"
#   ./backup-database.sh -e staging -t full
#
# Requirements:
#   - AWS CLI v2 configured with appropriate permissions
#   - jq for JSON parsing
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="autolytiq"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
LOG_FILE="/tmp/backup-${TIMESTAMP}.log"

# Default values
ENVIRONMENT=""
BACKUP_TYPE="full"
REASON=""
WAIT_FOR_COMPLETION="true"
SEND_NOTIFICATION="true"

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
    head -50 "$0" | grep -E "^#" | sed 's/^# //' | sed 's/^#//'
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

get_backup_bucket() {
    local account_id
    account_id=$(get_aws_account_id)
    echo "${PROJECT_NAME}-${ENVIRONMENT}-backups-${account_id}"
}

get_snapshot_identifier() {
    local cluster_id
    cluster_id=$(get_cluster_identifier)
    echo "${cluster_id}-${BACKUP_TYPE}-${TIMESTAMP}"
}

get_sns_topic_arn() {
    local account_id region
    account_id=$(get_aws_account_id)
    region=$(aws configure get region || echo "us-east-1")
    echo "arn:aws:sns:${region}:${account_id}:${PROJECT_NAME}-${ENVIRONMENT}-backup-alerts"
}

check_cluster_exists() {
    local cluster_id
    cluster_id=$(get_cluster_identifier)

    info "Checking if cluster '${cluster_id}' exists..."

    if ! aws rds describe-db-clusters --db-cluster-identifier "${cluster_id}" &>/dev/null; then
        die "RDS cluster '${cluster_id}' not found"
    fi

    success "Cluster '${cluster_id}' found"
}

check_cluster_status() {
    local cluster_id status
    cluster_id=$(get_cluster_identifier)

    status=$(aws rds describe-db-clusters \
        --db-cluster-identifier "${cluster_id}" \
        --query 'DBClusters[0].Status' \
        --output text)

    if [[ "${status}" != "available" ]]; then
        die "Cluster is not available. Current status: ${status}"
    fi

    info "Cluster status: ${status}"
}

create_rds_snapshot() {
    local cluster_id snapshot_id
    cluster_id=$(get_cluster_identifier)
    snapshot_id=$(get_snapshot_identifier)

    info "Creating RDS cluster snapshot: ${snapshot_id}"

    local tags="Key=Environment,Value=${ENVIRONMENT} Key=BackupType,Value=${BACKUP_TYPE} Key=CreatedBy,Value=manual-script Key=Timestamp,Value=${TIMESTAMP}"

    if [[ -n "${REASON}" ]]; then
        tags="${tags} Key=Reason,Value=${REASON// /-}"
    fi

    aws rds create-db-cluster-snapshot \
        --db-cluster-identifier "${cluster_id}" \
        --db-cluster-snapshot-identifier "${snapshot_id}" \
        --tags ${tags}

    success "Snapshot creation initiated: ${snapshot_id}"
    echo "${snapshot_id}"
}

wait_for_snapshot() {
    local snapshot_id=$1
    local max_wait=3600  # 1 hour timeout
    local interval=30
    local elapsed=0

    info "Waiting for snapshot '${snapshot_id}' to complete..."

    while [[ ${elapsed} -lt ${max_wait} ]]; do
        local status
        status=$(aws rds describe-db-cluster-snapshots \
            --db-cluster-snapshot-identifier "${snapshot_id}" \
            --query 'DBClusterSnapshots[0].Status' \
            --output text 2>/dev/null || echo "creating")

        case "${status}" in
            available)
                success "Snapshot completed successfully"
                return 0
                ;;
            creating|pending)
                info "Status: ${status} (elapsed: ${elapsed}s)"
                sleep ${interval}
                elapsed=$((elapsed + interval))
                ;;
            failed|deleted|deleting)
                die "Snapshot failed with status: ${status}"
                ;;
            *)
                warn "Unknown status: ${status}"
                sleep ${interval}
                elapsed=$((elapsed + interval))
                ;;
        esac
    done

    die "Timeout waiting for snapshot to complete"
}

export_snapshot_to_s3() {
    local snapshot_id=$1
    local bucket export_task_id
    bucket=$(get_backup_bucket)
    export_task_id="${snapshot_id}-export"

    info "Exporting snapshot to S3: s3://${bucket}/snapshots/${snapshot_id}/"

    local account_id kms_key_id iam_role_arn
    account_id=$(get_aws_account_id)
    kms_key_id="alias/${PROJECT_NAME}-${ENVIRONMENT}-backup"
    iam_role_arn="arn:aws:iam::${account_id}:role/${PROJECT_NAME}-${ENVIRONMENT}-backup-operator"

    # Get the snapshot ARN
    local snapshot_arn
    snapshot_arn=$(aws rds describe-db-cluster-snapshots \
        --db-cluster-snapshot-identifier "${snapshot_id}" \
        --query 'DBClusterSnapshots[0].DBClusterSnapshotArn' \
        --output text)

    aws rds start-export-task \
        --export-task-identifier "${export_task_id}" \
        --source-arn "${snapshot_arn}" \
        --s3-bucket-name "${bucket}" \
        --s3-prefix "snapshots/${snapshot_id}" \
        --iam-role-arn "${iam_role_arn}" \
        --kms-key-id "${kms_key_id}"

    success "Export task initiated: ${export_task_id}"
}

send_notification() {
    local snapshot_id=$1
    local status=$2
    local topic_arn
    topic_arn=$(get_sns_topic_arn)

    local subject message
    if [[ "${status}" == "success" ]]; then
        subject="[SUCCESS] Database Backup Completed - ${ENVIRONMENT}"
        message=$(cat <<EOF
Database backup completed successfully.

Environment: ${ENVIRONMENT}
Backup Type: ${BACKUP_TYPE}
Snapshot ID: ${snapshot_id}
Timestamp: ${TIMESTAMP}
Reason: ${REASON:-N/A}

The backup is available in AWS RDS snapshots and will be exported to S3.
EOF
)
    else
        subject="[FAILED] Database Backup Failed - ${ENVIRONMENT}"
        message=$(cat <<EOF
Database backup FAILED.

Environment: ${ENVIRONMENT}
Backup Type: ${BACKUP_TYPE}
Timestamp: ${TIMESTAMP}
Reason: ${REASON:-N/A}

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

get_backup_info() {
    local snapshot_id=$1

    aws rds describe-db-cluster-snapshots \
        --db-cluster-snapshot-identifier "${snapshot_id}" \
        --query 'DBClusterSnapshots[0].{
            SnapshotId: DBClusterSnapshotIdentifier,
            Status: Status,
            Engine: Engine,
            EngineVersion: EngineVersion,
            SnapshotCreateTime: SnapshotCreateTime,
            AllocatedStorage: AllocatedStorage,
            PercentProgress: PercentProgress
        }' \
        --output table
}

cleanup_old_snapshots() {
    local cluster_id retention_days
    cluster_id=$(get_cluster_identifier)

    case "${ENVIRONMENT}" in
        dev) retention_days=7 ;;
        staging) retention_days=14 ;;
        prod) retention_days=35 ;;
    esac

    info "Cleaning up snapshots older than ${retention_days} days..."

    local cutoff_date
    cutoff_date=$(date -u -d "-${retention_days} days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || \
                  date -u -v-${retention_days}d +"%Y-%m-%dT%H:%M:%SZ")

    local old_snapshots
    old_snapshots=$(aws rds describe-db-cluster-snapshots \
        --db-cluster-identifier "${cluster_id}" \
        --snapshot-type manual \
        --query "DBClusterSnapshots[?SnapshotCreateTime<='${cutoff_date}'].DBClusterSnapshotIdentifier" \
        --output text)

    if [[ -n "${old_snapshots}" ]]; then
        for snapshot in ${old_snapshots}; do
            info "Deleting old snapshot: ${snapshot}"
            aws rds delete-db-cluster-snapshot \
                --db-cluster-snapshot-identifier "${snapshot}" || \
                warn "Failed to delete snapshot: ${snapshot}"
        done
        success "Cleanup completed"
    else
        info "No old snapshots to clean up"
    fi
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
            -t|--type)
                BACKUP_TYPE="$2"
                shift 2
                ;;
            -r|--reason)
                REASON="$2"
                shift 2
                ;;
            -w|--wait)
                WAIT_FOR_COMPLETION="$2"
                shift 2
                ;;
            -n|--notify)
                SEND_NOTIFICATION="$2"
                shift 2
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
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
main() {
    parse_args "$@"

    info "=========================================="
    info "Starting database backup"
    info "=========================================="
    info "Environment: ${ENVIRONMENT}"
    info "Backup Type: ${BACKUP_TYPE}"
    info "Timestamp: ${TIMESTAMP}"
    info "Log File: ${LOG_FILE}"
    info "=========================================="

    # Validate environment
    validate_environment

    # Pre-flight checks
    check_cluster_exists
    check_cluster_status

    # Create snapshot
    local snapshot_id
    snapshot_id=$(create_rds_snapshot)

    # Wait for completion if requested
    if [[ "${WAIT_FOR_COMPLETION}" == "true" ]]; then
        wait_for_snapshot "${snapshot_id}"

        # Export to S3
        export_snapshot_to_s3 "${snapshot_id}"

        # Get backup info
        info "Backup details:"
        get_backup_info "${snapshot_id}"
    fi

    # Send notification
    if [[ "${SEND_NOTIFICATION}" == "true" ]]; then
        send_notification "${snapshot_id}" "success"
    fi

    # Cleanup old snapshots
    cleanup_old_snapshots

    success "=========================================="
    success "Backup completed successfully!"
    success "Snapshot ID: ${snapshot_id}"
    success "=========================================="
}

# Run main with error handling
if ! main "$@"; then
    if [[ "${SEND_NOTIFICATION}" == "true" ]]; then
        send_notification "" "failed"
    fi
    exit 1
fi
