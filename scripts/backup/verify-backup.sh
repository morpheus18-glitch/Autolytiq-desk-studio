#!/usr/bin/env bash
# =============================================================================
# Backup Verification Script
# =============================================================================
# Verifies the integrity and restorability of database backups
#
# Usage:
#   ./verify-backup.sh [options]
#
# Options:
#   -e, --environment        Environment (dev|staging|prod) [required]
#   -s, --snapshot-id        Specific snapshot to verify (optional)
#   -a, --all                Verify all recent snapshots
#   -r, --restore-test       Perform full restore test (creates temporary cluster)
#   -d, --data-validation    Run data validation queries after restore
#   -c, --cleanup            Clean up test resources after verification
#   -h, --help               Show this help message
#
# Examples:
#   ./verify-backup.sh -e prod -s autolytiq-prod-full-20240101-120000
#   ./verify-backup.sh -e staging -a
#   ./verify-backup.sh -e prod -r -d -c
#
# Requirements:
#   - AWS CLI v2 configured with appropriate permissions
#   - jq for JSON parsing
#   - psql (PostgreSQL client) for data validation
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="autolytiq"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
LOG_FILE="/tmp/verify-backup-${TIMESTAMP}.log"

# Default values
ENVIRONMENT=""
SNAPSHOT_ID=""
VERIFY_ALL="false"
RESTORE_TEST="false"
DATA_VALIDATION="false"
CLEANUP="false"

# Test cluster name
TEST_CLUSTER_NAME=""

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

# -----------------------------------------------------------------------------
# Snapshot Metadata Verification
# -----------------------------------------------------------------------------
verify_snapshot_metadata() {
    local snapshot_id=$1

    info "Verifying snapshot metadata: ${snapshot_id}"

    local snapshot_info
    snapshot_info=$(aws rds describe-db-cluster-snapshots \
        --db-cluster-snapshot-identifier "${snapshot_id}" \
        --query 'DBClusterSnapshots[0]' \
        --output json 2>/dev/null)

    if [[ -z "${snapshot_info}" || "${snapshot_info}" == "null" ]]; then
        error "Snapshot not found: ${snapshot_id}"
        return 1
    fi

    # Extract and verify key attributes
    local status engine storage encrypted
    status=$(echo "${snapshot_info}" | jq -r '.Status')
    engine=$(echo "${snapshot_info}" | jq -r '.Engine')
    storage=$(echo "${snapshot_info}" | jq -r '.AllocatedStorage')
    encrypted=$(echo "${snapshot_info}" | jq -r '.StorageEncrypted')

    info "  Status: ${status}"
    info "  Engine: ${engine}"
    info "  Storage: ${storage} GB"
    info "  Encrypted: ${encrypted}"

    # Verify status
    if [[ "${status}" != "available" ]]; then
        error "Snapshot status is not 'available': ${status}"
        return 1
    fi

    # Verify encryption
    if [[ "${encrypted}" != "true" ]]; then
        warn "Snapshot is not encrypted!"
    fi

    success "Snapshot metadata verified"
    return 0
}

# -----------------------------------------------------------------------------
# S3 Export Verification
# -----------------------------------------------------------------------------
verify_s3_export() {
    local snapshot_id=$1
    local bucket
    bucket="${PROJECT_NAME}-${ENVIRONMENT}-backups-$(get_aws_account_id)"

    info "Verifying S3 export for snapshot: ${snapshot_id}"

    # Check if export exists
    local s3_path="s3://${bucket}/snapshots/${snapshot_id}/"

    if aws s3 ls "${s3_path}" &>/dev/null; then
        local file_count size
        file_count=$(aws s3 ls "${s3_path}" --recursive | wc -l)
        size=$(aws s3 ls "${s3_path}" --recursive --summarize | grep "Total Size" | awk '{print $3}')

        info "  S3 Export Location: ${s3_path}"
        info "  File Count: ${file_count}"
        info "  Total Size: ${size} bytes"

        if [[ ${file_count} -gt 0 ]]; then
            success "S3 export verified"
            return 0
        else
            warn "S3 export exists but has no files"
            return 1
        fi
    else
        warn "No S3 export found for snapshot"
        return 1
    fi
}

# -----------------------------------------------------------------------------
# Cross-Region Replication Verification
# -----------------------------------------------------------------------------
verify_cross_region_copy() {
    local snapshot_id=$1
    local dr_region="us-west-2"  # Default DR region

    info "Verifying cross-region copy to ${dr_region}..."

    # Check for copied snapshot in DR region
    local dr_snapshot_id="${snapshot_id}-copy"

    local status
    status=$(aws rds describe-db-cluster-snapshots \
        --region "${dr_region}" \
        --db-cluster-snapshot-identifier "${dr_snapshot_id}" \
        --query 'DBClusterSnapshots[0].Status' \
        --output text 2>/dev/null || echo "not-found")

    if [[ "${status}" == "available" ]]; then
        success "Cross-region copy verified in ${dr_region}"
        return 0
    elif [[ "${status}" == "not-found" ]]; then
        warn "Cross-region copy not found in ${dr_region}"
        return 1
    else
        warn "Cross-region copy status: ${status}"
        return 1
    fi
}

# -----------------------------------------------------------------------------
# Restore Test
# -----------------------------------------------------------------------------
perform_restore_test() {
    local snapshot_id=$1
    TEST_CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-verify-${TIMESTAMP}"

    info "Performing restore test..."
    info "Creating test cluster: ${TEST_CLUSTER_NAME}"

    # Get original cluster configuration
    local cluster_id subnet_group security_groups kms_key
    cluster_id=$(get_cluster_identifier)
    subnet_group=$(aws rds describe-db-clusters \
        --db-cluster-identifier "${cluster_id}" \
        --query 'DBClusters[0].DBSubnetGroup' \
        --output text)
    security_groups=$(aws rds describe-db-clusters \
        --db-cluster-identifier "${cluster_id}" \
        --query 'DBClusters[0].VpcSecurityGroups[*].VpcSecurityGroupId' \
        --output text)
    kms_key="alias/${PROJECT_NAME}-${ENVIRONMENT}-backup"

    # Restore cluster from snapshot
    aws rds restore-db-cluster-from-snapshot \
        --db-cluster-identifier "${TEST_CLUSTER_NAME}" \
        --snapshot-identifier "${snapshot_id}" \
        --engine aurora-postgresql \
        --engine-version "15.4" \
        --db-subnet-group-name "${subnet_group}" \
        --vpc-security-group-ids ${security_groups} \
        --kms-key-id "${kms_key}" \
        --serverless-v2-scaling-configuration MinCapacity=0.5,MaxCapacity=2 \
        --tags Key=Environment,Value="${ENVIRONMENT}" \
               Key=Purpose,Value=backup-verification \
               Key=AutoDelete,Value=true

    info "Waiting for cluster to become available..."

    # Wait for cluster
    local max_wait=1800  # 30 minutes
    local interval=30
    local elapsed=0

    while [[ ${elapsed} -lt ${max_wait} ]]; do
        local status
        status=$(aws rds describe-db-clusters \
            --db-cluster-identifier "${TEST_CLUSTER_NAME}" \
            --query 'DBClusters[0].Status' \
            --output text 2>/dev/null || echo "creating")

        if [[ "${status}" == "available" ]]; then
            break
        fi

        info "  Status: ${status} (elapsed: ${elapsed}s)"
        sleep ${interval}
        elapsed=$((elapsed + interval))
    done

    if [[ ${elapsed} -ge ${max_wait} ]]; then
        error "Timeout waiting for test cluster"
        return 1
    fi

    # Create instance
    info "Creating test cluster instance..."
    aws rds create-db-instance \
        --db-instance-identifier "${TEST_CLUSTER_NAME}-1" \
        --db-cluster-identifier "${TEST_CLUSTER_NAME}" \
        --engine aurora-postgresql \
        --db-instance-class db.serverless \
        --tags Key=Environment,Value="${ENVIRONMENT}" \
               Key=Purpose,Value=backup-verification \
               Key=AutoDelete,Value=true

    # Wait for instance
    aws rds wait db-instance-available \
        --db-instance-identifier "${TEST_CLUSTER_NAME}-1"

    success "Test cluster restored successfully"
    return 0
}

# -----------------------------------------------------------------------------
# Data Validation
# -----------------------------------------------------------------------------
run_data_validation() {
    info "Running data validation queries..."

    if [[ -z "${TEST_CLUSTER_NAME}" ]]; then
        warn "No test cluster available for data validation"
        return 1
    fi

    # Get test cluster endpoint
    local endpoint
    endpoint=$(aws rds describe-db-clusters \
        --db-cluster-identifier "${TEST_CLUSTER_NAME}" \
        --query 'DBClusters[0].Endpoint' \
        --output text)

    # Get database credentials from Secrets Manager
    local secret_name="autolytiq/${ENVIRONMENT}/database"
    local credentials
    credentials=$(aws secretsmanager get-secret-value \
        --secret-id "${secret_name}" \
        --query 'SecretString' \
        --output text)

    local db_user db_password db_name
    db_user=$(echo "${credentials}" | jq -r '.username')
    db_password=$(echo "${credentials}" | jq -r '.password')
    db_name=$(echo "${credentials}" | jq -r '.database')

    export PGPASSWORD="${db_password}"

    info "Connecting to: ${endpoint}"

    # Run validation queries
    local validation_queries=(
        "SELECT 'connection_test' as test, 1 as result"
        "SELECT 'table_count' as test, count(*) as result FROM information_schema.tables WHERE table_schema = 'public'"
        "SELECT 'deal_count' as test, count(*) as result FROM deals"
        "SELECT 'user_count' as test, count(*) as result FROM users"
        "SELECT 'customer_count' as test, count(*) as result FROM customers"
        "SELECT 'recent_deals' as test, count(*) as result FROM deals WHERE created_at > NOW() - INTERVAL '30 days'"
    )

    local all_passed=true

    for query in "${validation_queries[@]}"; do
        info "  Running: ${query}"

        if result=$(psql -h "${endpoint}" -U "${db_user}" -d "${db_name}" \
            -t -A -c "${query}" 2>&1); then
            success "    Result: ${result}"
        else
            error "    Failed: ${result}"
            all_passed=false
        fi
    done

    unset PGPASSWORD

    if [[ "${all_passed}" == "true" ]]; then
        success "Data validation completed successfully"
        return 0
    else
        error "Some data validation queries failed"
        return 1
    fi
}

# -----------------------------------------------------------------------------
# Cleanup
# -----------------------------------------------------------------------------
cleanup_test_resources() {
    if [[ -z "${TEST_CLUSTER_NAME}" ]]; then
        return 0
    fi

    info "Cleaning up test resources..."

    # Delete instance first
    info "Deleting test instance: ${TEST_CLUSTER_NAME}-1"
    aws rds delete-db-instance \
        --db-instance-identifier "${TEST_CLUSTER_NAME}-1" \
        --skip-final-snapshot \
        --delete-automated-backups 2>/dev/null || true

    # Wait for instance deletion
    info "Waiting for instance deletion..."
    aws rds wait db-instance-deleted \
        --db-instance-identifier "${TEST_CLUSTER_NAME}-1" 2>/dev/null || true

    # Delete cluster
    info "Deleting test cluster: ${TEST_CLUSTER_NAME}"
    aws rds delete-db-cluster \
        --db-cluster-identifier "${TEST_CLUSTER_NAME}" \
        --skip-final-snapshot 2>/dev/null || true

    success "Cleanup completed"
}

# -----------------------------------------------------------------------------
# Verification Report
# -----------------------------------------------------------------------------
generate_report() {
    local snapshot_id=$1
    local metadata_status=$2
    local s3_status=$3
    local crr_status=$4
    local restore_status=$5
    local data_status=$6

    echo ""
    info "=========================================="
    info "BACKUP VERIFICATION REPORT"
    info "=========================================="
    info "Environment: ${ENVIRONMENT}"
    info "Snapshot: ${snapshot_id}"
    info "Timestamp: ${TIMESTAMP}"
    info "=========================================="
    echo ""

    local overall_status="PASSED"

    echo "Verification Results:"
    echo "---------------------"

    if [[ "${metadata_status}" == "0" ]]; then
        echo -e "  Metadata Verification: ${GREEN}PASSED${NC}"
    else
        echo -e "  Metadata Verification: ${RED}FAILED${NC}"
        overall_status="FAILED"
    fi

    if [[ "${s3_status}" == "0" ]]; then
        echo -e "  S3 Export Verification: ${GREEN}PASSED${NC}"
    elif [[ "${s3_status}" == "skipped" ]]; then
        echo -e "  S3 Export Verification: ${YELLOW}SKIPPED${NC}"
    else
        echo -e "  S3 Export Verification: ${RED}FAILED${NC}"
    fi

    if [[ "${crr_status}" == "0" ]]; then
        echo -e "  Cross-Region Replication: ${GREEN}PASSED${NC}"
    elif [[ "${crr_status}" == "skipped" ]]; then
        echo -e "  Cross-Region Replication: ${YELLOW}SKIPPED${NC}"
    else
        echo -e "  Cross-Region Replication: ${YELLOW}NOT AVAILABLE${NC}"
    fi

    if [[ "${restore_status}" == "0" ]]; then
        echo -e "  Restore Test: ${GREEN}PASSED${NC}"
    elif [[ "${restore_status}" == "skipped" ]]; then
        echo -e "  Restore Test: ${YELLOW}SKIPPED${NC}"
    else
        echo -e "  Restore Test: ${RED}FAILED${NC}"
        overall_status="FAILED"
    fi

    if [[ "${data_status}" == "0" ]]; then
        echo -e "  Data Validation: ${GREEN}PASSED${NC}"
    elif [[ "${data_status}" == "skipped" ]]; then
        echo -e "  Data Validation: ${YELLOW}SKIPPED${NC}"
    else
        echo -e "  Data Validation: ${RED}FAILED${NC}"
        overall_status="FAILED"
    fi

    echo ""
    echo "=========================================="
    if [[ "${overall_status}" == "PASSED" ]]; then
        echo -e "Overall Status: ${GREEN}${overall_status}${NC}"
    else
        echo -e "Overall Status: ${RED}${overall_status}${NC}"
    fi
    echo "=========================================="

    return $([ "${overall_status}" == "PASSED" ] && echo 0 || echo 1)
}

send_notification() {
    local snapshot_id=$1
    local status=$2
    local topic_arn
    topic_arn=$(get_sns_topic_arn)

    local subject message
    if [[ "${status}" == "0" ]]; then
        subject="[SUCCESS] Backup Verification Passed - ${ENVIRONMENT}"
        message="Backup verification completed successfully for ${ENVIRONMENT}.\n\nSnapshot: ${snapshot_id}\nTimestamp: ${TIMESTAMP}\n\nAll verification checks passed."
    else
        subject="[FAILED] Backup Verification Failed - ${ENVIRONMENT}"
        message="Backup verification FAILED for ${ENVIRONMENT}.\n\nSnapshot: ${snapshot_id}\nTimestamp: ${TIMESTAMP}\n\nPlease investigate immediately.\nLog file: ${LOG_FILE}"
    fi

    aws sns publish \
        --topic-arn "${topic_arn}" \
        --subject "${subject}" \
        --message "${message}" 2>/dev/null || true
}

# -----------------------------------------------------------------------------
# Get Latest Snapshot
# -----------------------------------------------------------------------------
get_latest_snapshot() {
    local cluster_id
    cluster_id=$(get_cluster_identifier)

    aws rds describe-db-cluster-snapshots \
        --db-cluster-identifier "${cluster_id}" \
        --query 'sort_by(DBClusterSnapshots, &SnapshotCreateTime)[-1].DBClusterSnapshotIdentifier' \
        --output text
}

# -----------------------------------------------------------------------------
# List and Verify All Snapshots
# -----------------------------------------------------------------------------
verify_all_snapshots() {
    local cluster_id
    cluster_id=$(get_cluster_identifier)

    info "Verifying all snapshots for cluster: ${cluster_id}"

    local snapshots
    snapshots=$(aws rds describe-db-cluster-snapshots \
        --db-cluster-identifier "${cluster_id}" \
        --query 'DBClusterSnapshots[*].DBClusterSnapshotIdentifier' \
        --output text)

    local total=0
    local passed=0
    local failed=0

    for snapshot in ${snapshots}; do
        ((total++))

        if verify_snapshot_metadata "${snapshot}"; then
            ((passed++))
        else
            ((failed++))
        fi
    done

    echo ""
    info "=========================================="
    info "ALL SNAPSHOTS VERIFICATION SUMMARY"
    info "=========================================="
    info "Total Snapshots: ${total}"
    success "Passed: ${passed}"
    if [[ ${failed} -gt 0 ]]; then
        error "Failed: ${failed}"
    fi
    info "=========================================="
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
            -a|--all)
                VERIFY_ALL="true"
                shift
                ;;
            -r|--restore-test)
                RESTORE_TEST="true"
                shift
                ;;
            -d|--data-validation)
                DATA_VALIDATION="true"
                shift
                ;;
            -c|--cleanup)
                CLEANUP="true"
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
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
main() {
    parse_args "$@"

    info "=========================================="
    info "Starting backup verification"
    info "=========================================="
    info "Environment: ${ENVIRONMENT}"
    info "Timestamp: ${TIMESTAMP}"
    info "Log File: ${LOG_FILE}"
    info "=========================================="

    # Validate environment
    validate_environment

    # Verify all snapshots if requested
    if [[ "${VERIFY_ALL}" == "true" ]]; then
        verify_all_snapshots
        exit 0
    fi

    # Get snapshot to verify
    if [[ -z "${SNAPSHOT_ID}" ]]; then
        SNAPSHOT_ID=$(get_latest_snapshot)
        info "Using latest snapshot: ${SNAPSHOT_ID}"
    fi

    # Track verification status
    local metadata_status="skipped"
    local s3_status="skipped"
    local crr_status="skipped"
    local restore_status="skipped"
    local data_status="skipped"

    # Run verifications
    if verify_snapshot_metadata "${SNAPSHOT_ID}"; then
        metadata_status="0"
    else
        metadata_status="1"
    fi

    if verify_s3_export "${SNAPSHOT_ID}"; then
        s3_status="0"
    else
        s3_status="1"
    fi

    if [[ "${ENVIRONMENT}" == "prod" ]]; then
        if verify_cross_region_copy "${SNAPSHOT_ID}"; then
            crr_status="0"
        else
            crr_status="1"
        fi
    fi

    if [[ "${RESTORE_TEST}" == "true" ]]; then
        if perform_restore_test "${SNAPSHOT_ID}"; then
            restore_status="0"
        else
            restore_status="1"
        fi
    fi

    if [[ "${DATA_VALIDATION}" == "true" && "${restore_status}" == "0" ]]; then
        if run_data_validation; then
            data_status="0"
        else
            data_status="1"
        fi
    fi

    # Cleanup if requested
    if [[ "${CLEANUP}" == "true" ]]; then
        cleanup_test_resources
    fi

    # Generate report
    local overall_status
    if generate_report "${SNAPSHOT_ID}" "${metadata_status}" "${s3_status}" "${crr_status}" "${restore_status}" "${data_status}"; then
        overall_status="0"
    else
        overall_status="1"
    fi

    # Send notification
    send_notification "${SNAPSHOT_ID}" "${overall_status}"

    exit ${overall_status}
}

# Run main
main "$@"
