#!/usr/bin/env bash
# =============================================================================
# List Backups Script
# =============================================================================
# Lists available database backups and their status
#
# Usage:
#   ./list-backups.sh [options]
#
# Options:
#   -e, --environment    Environment (dev|staging|prod) [required]
#   -t, --type           Backup type filter (manual|automated|all) [default: all]
#   -n, --count          Number of backups to show [default: 20]
#   -f, --format         Output format (table|json|csv) [default: table]
#   -s, --show-s3        Include S3 exports in listing
#   -d, --show-dr        Include DR region backups
#   -v, --verbose        Show detailed information
#   -h, --help           Show this help message
#
# Examples:
#   ./list-backups.sh -e prod
#   ./list-backups.sh -e staging -t manual -n 10
#   ./list-backups.sh -e prod -f json
#   ./list-backups.sh -e prod -s -d -v
#
# Requirements:
#   - AWS CLI v2 configured with appropriate permissions
#   - jq for JSON parsing
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
PROJECT_NAME="autolytiq"

# Default values
ENVIRONMENT=""
BACKUP_TYPE="all"
BACKUP_COUNT=20
OUTPUT_FORMAT="table"
SHOW_S3="false"
SHOW_DR="false"
VERBOSE="false"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Functions
# -----------------------------------------------------------------------------
info() { echo -e "${BLUE}$*${NC}"; }
success() { echo -e "${GREEN}$*${NC}"; }
warn() { echo -e "${YELLOW}$*${NC}"; }
error() { echo -e "${RED}$*${NC}"; }

die() {
    error "$1"
    exit 1
}

show_help() {
    head -45 "$0" | grep -E "^#" | sed 's/^# //' | sed 's/^#//'
    exit 0
}

validate_environment() {
    case "${ENVIRONMENT}" in
        dev|staging|prod)
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

# -----------------------------------------------------------------------------
# List RDS Snapshots
# -----------------------------------------------------------------------------
list_rds_snapshots() {
    local cluster_id type_filter
    cluster_id=$(get_cluster_identifier)

    case "${BACKUP_TYPE}" in
        manual)
            type_filter="manual"
            ;;
        automated)
            type_filter="automated"
            ;;
        all)
            type_filter=""
            ;;
    esac

    info "RDS Cluster Snapshots for ${cluster_id}"
    echo "=========================================="

    local query_args="--db-cluster-identifier ${cluster_id}"
    if [[ -n "${type_filter}" ]]; then
        query_args="${query_args} --snapshot-type ${type_filter}"
    fi

    case "${OUTPUT_FORMAT}" in
        table)
            aws rds describe-db-cluster-snapshots ${query_args} \
                --query "sort_by(DBClusterSnapshots, &SnapshotCreateTime)[-${BACKUP_COUNT}:] | reverse(@)[*].{
                    SnapshotID: DBClusterSnapshotIdentifier,
                    Status: Status,
                    Type: SnapshotType,
                    Created: SnapshotCreateTime,
                    Engine: Engine,
                    Size: AllocatedStorage
                }" \
                --output table
            ;;
        json)
            aws rds describe-db-cluster-snapshots ${query_args} \
                --query "sort_by(DBClusterSnapshots, &SnapshotCreateTime)[-${BACKUP_COUNT}:] | reverse(@)" \
                --output json
            ;;
        csv)
            echo "SnapshotID,Status,Type,Created,Engine,Size"
            aws rds describe-db-cluster-snapshots ${query_args} \
                --query "sort_by(DBClusterSnapshots, &SnapshotCreateTime)[-${BACKUP_COUNT}:] | reverse(@)[*].[
                    DBClusterSnapshotIdentifier,
                    Status,
                    SnapshotType,
                    SnapshotCreateTime,
                    Engine,
                    AllocatedStorage
                ]" \
                --output text | tr '\t' ','
            ;;
    esac
}

# -----------------------------------------------------------------------------
# List AWS Backup Recovery Points
# -----------------------------------------------------------------------------
list_backup_recovery_points() {
    local vault_name
    vault_name="${PROJECT_NAME}-${ENVIRONMENT}-vault"

    echo ""
    info "AWS Backup Recovery Points in ${vault_name}"
    echo "=========================================="

    case "${OUTPUT_FORMAT}" in
        table)
            aws backup list-recovery-points-by-backup-vault \
                --backup-vault-name "${vault_name}" \
                --max-results "${BACKUP_COUNT}" \
                --query "RecoveryPoints[*].{
                    RecoveryPointARN: RecoveryPointArn,
                    Status: Status,
                    Created: CreationDate,
                    ResourceType: ResourceType,
                    Size: BackupSizeInBytes
                }" \
                --output table 2>/dev/null || warn "Backup vault not found or no recovery points"
            ;;
        json)
            aws backup list-recovery-points-by-backup-vault \
                --backup-vault-name "${vault_name}" \
                --max-results "${BACKUP_COUNT}" \
                --output json 2>/dev/null || echo "[]"
            ;;
        csv)
            echo "RecoveryPointARN,Status,Created,ResourceType,Size"
            aws backup list-recovery-points-by-backup-vault \
                --backup-vault-name "${vault_name}" \
                --max-results "${BACKUP_COUNT}" \
                --query "RecoveryPoints[*].[
                    RecoveryPointArn,
                    Status,
                    CreationDate,
                    ResourceType,
                    BackupSizeInBytes
                ]" \
                --output text 2>/dev/null | tr '\t' ',' || true
            ;;
    esac
}

# -----------------------------------------------------------------------------
# List S3 Backups
# -----------------------------------------------------------------------------
list_s3_backups() {
    local bucket
    bucket=$(get_backup_bucket)

    echo ""
    info "S3 Backup Exports in ${bucket}"
    echo "=========================================="

    if ! aws s3 ls "s3://${bucket}/" &>/dev/null; then
        warn "Backup bucket not found or not accessible"
        return
    fi

    case "${OUTPUT_FORMAT}" in
        table|csv)
            echo "Snapshot Exports:"
            echo "-----------------"
            aws s3 ls "s3://${bucket}/snapshots/" 2>/dev/null | head -${BACKUP_COUNT} || echo "No exports found"
            ;;
        json)
            aws s3api list-objects-v2 \
                --bucket "${bucket}" \
                --prefix "snapshots/" \
                --max-keys "${BACKUP_COUNT}" \
                --query "Contents[*].{Key: Key, Size: Size, LastModified: LastModified}" \
                --output json 2>/dev/null || echo "[]"
            ;;
    esac

    # Show bucket storage summary
    if [[ "${VERBOSE}" == "true" ]]; then
        echo ""
        info "Storage Summary:"
        aws s3 ls "s3://${bucket}/" --recursive --summarize 2>/dev/null | tail -2 || true
    fi
}

# -----------------------------------------------------------------------------
# List DR Region Backups
# -----------------------------------------------------------------------------
list_dr_backups() {
    local dr_region="us-west-2"
    local cluster_id dr_vault_name
    cluster_id=$(get_cluster_identifier)
    dr_vault_name="${PROJECT_NAME}-${ENVIRONMENT}-dr-vault"

    echo ""
    info "Disaster Recovery Backups in ${dr_region}"
    echo "=========================================="

    # Check for DR RDS cluster snapshots
    echo "DR Region Snapshots:"
    aws rds describe-db-cluster-snapshots \
        --region "${dr_region}" \
        --query "DBClusterSnapshots[?contains(DBClusterSnapshotIdentifier, '${cluster_id}')].{
            SnapshotID: DBClusterSnapshotIdentifier,
            Status: Status,
            Created: SnapshotCreateTime
        }" \
        --output table 2>/dev/null || warn "No DR snapshots found"

    # Check for DR backup vault
    echo ""
    echo "DR Backup Vault Recovery Points:"
    aws backup list-recovery-points-by-backup-vault \
        --region "${dr_region}" \
        --backup-vault-name "${dr_vault_name}" \
        --max-results 10 \
        --query "RecoveryPoints[*].{
            RecoveryPointARN: RecoveryPointArn,
            Status: Status,
            Created: CreationDate
        }" \
        --output table 2>/dev/null || warn "DR backup vault not found"

    # Check for DR S3 bucket
    local dr_bucket="${PROJECT_NAME}-${ENVIRONMENT}-dr-$(get_aws_account_id)"
    echo ""
    echo "DR S3 Bucket:"
    if aws s3 ls "s3://${dr_bucket}/" --region "${dr_region}" &>/dev/null; then
        aws s3 ls "s3://${dr_bucket}/" --region "${dr_region}" 2>/dev/null | head -10
    else
        warn "DR S3 bucket not found or not accessible"
    fi
}

# -----------------------------------------------------------------------------
# Show Verbose Information
# -----------------------------------------------------------------------------
show_verbose_info() {
    local cluster_id
    cluster_id=$(get_cluster_identifier)

    echo ""
    info "Cluster Information"
    echo "=========================================="

    aws rds describe-db-clusters \
        --db-cluster-identifier "${cluster_id}" \
        --query "DBClusters[0].{
            ClusterID: DBClusterIdentifier,
            Status: Status,
            Engine: Engine,
            EngineVersion: EngineVersion,
            Endpoint: Endpoint,
            ReaderEndpoint: ReaderEndpoint,
            BackupRetentionPeriod: BackupRetentionPeriod,
            PreferredBackupWindow: PreferredBackupWindow,
            LatestRestorableTime: LatestRestorableTime,
            EarliestRestorableTime: EarliestRestorableTime
        }" \
        --output table 2>/dev/null

    echo ""
    info "Point-in-Time Recovery Window"
    echo "=========================================="

    local earliest latest
    earliest=$(aws rds describe-db-clusters \
        --db-cluster-identifier "${cluster_id}" \
        --query "DBClusters[0].EarliestRestorableTime" \
        --output text)
    latest=$(aws rds describe-db-clusters \
        --db-cluster-identifier "${cluster_id}" \
        --query "DBClusters[0].LatestRestorableTime" \
        --output text)

    echo "Earliest Restorable Time: ${earliest}"
    echo "Latest Restorable Time:   ${latest}"

    echo ""
    info "Backup Plans"
    echo "=========================================="

    aws backup list-backup-plans \
        --query "BackupPlansList[?contains(BackupPlanName, '${PROJECT_NAME}-${ENVIRONMENT}')].{
            PlanName: BackupPlanName,
            PlanID: BackupPlanId,
            Created: CreationDate,
            LastExecution: LastExecutionDate
        }" \
        --output table 2>/dev/null || warn "No backup plans found"
}

# -----------------------------------------------------------------------------
# Show Summary
# -----------------------------------------------------------------------------
show_summary() {
    local cluster_id
    cluster_id=$(get_cluster_identifier)

    echo ""
    info "=========================================="
    info "BACKUP SUMMARY FOR ${ENVIRONMENT}"
    info "=========================================="

    # Count snapshots
    local manual_count automated_count
    manual_count=$(aws rds describe-db-cluster-snapshots \
        --db-cluster-identifier "${cluster_id}" \
        --snapshot-type manual \
        --query "length(DBClusterSnapshots)" \
        --output text 2>/dev/null || echo "0")
    automated_count=$(aws rds describe-db-cluster-snapshots \
        --db-cluster-identifier "${cluster_id}" \
        --snapshot-type automated \
        --query "length(DBClusterSnapshots)" \
        --output text 2>/dev/null || echo "0")

    echo "Manual Snapshots:    ${manual_count}"
    echo "Automated Snapshots: ${automated_count}"
    echo "Total Snapshots:     $((manual_count + automated_count))"

    # Get latest snapshot info
    local latest_snapshot latest_time
    latest_snapshot=$(aws rds describe-db-cluster-snapshots \
        --db-cluster-identifier "${cluster_id}" \
        --query "sort_by(DBClusterSnapshots, &SnapshotCreateTime)[-1].DBClusterSnapshotIdentifier" \
        --output text 2>/dev/null || echo "None")
    latest_time=$(aws rds describe-db-cluster-snapshots \
        --db-cluster-identifier "${cluster_id}" \
        --query "sort_by(DBClusterSnapshots, &SnapshotCreateTime)[-1].SnapshotCreateTime" \
        --output text 2>/dev/null || echo "N/A")

    echo ""
    echo "Latest Snapshot: ${latest_snapshot}"
    echo "Created:         ${latest_time}"

    # PITR info
    local pitr_start pitr_end
    pitr_start=$(aws rds describe-db-clusters \
        --db-cluster-identifier "${cluster_id}" \
        --query "DBClusters[0].EarliestRestorableTime" \
        --output text 2>/dev/null || echo "N/A")
    pitr_end=$(aws rds describe-db-clusters \
        --db-cluster-identifier "${cluster_id}" \
        --query "DBClusters[0].LatestRestorableTime" \
        --output text 2>/dev/null || echo "N/A")

    echo ""
    echo "Point-in-Time Recovery:"
    echo "  Earliest: ${pitr_start}"
    echo "  Latest:   ${pitr_end}"
    echo "=========================================="
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
            -n|--count)
                BACKUP_COUNT="$2"
                shift 2
                ;;
            -f|--format)
                OUTPUT_FORMAT="$2"
                shift 2
                ;;
            -s|--show-s3)
                SHOW_S3="true"
                shift
                ;;
            -d|--show-dr)
                SHOW_DR="true"
                shift
                ;;
            -v|--verbose)
                VERBOSE="true"
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

    # Validate environment
    validate_environment

    # List RDS snapshots
    list_rds_snapshots

    # List AWS Backup recovery points
    list_backup_recovery_points

    # List S3 exports if requested
    if [[ "${SHOW_S3}" == "true" ]]; then
        list_s3_backups
    fi

    # List DR backups if requested
    if [[ "${SHOW_DR}" == "true" && "${ENVIRONMENT}" == "prod" ]]; then
        list_dr_backups
    fi

    # Show verbose info if requested
    if [[ "${VERBOSE}" == "true" ]]; then
        show_verbose_info
    fi

    # Show summary
    show_summary
}

# Run main
main "$@"
