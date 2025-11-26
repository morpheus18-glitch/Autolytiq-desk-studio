output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnets
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_security_group_id" {
  description = "EKS cluster security group ID"
  value       = module.eks.cluster_security_group_id
}

output "eks_oidc_provider_arn" {
  description = "EKS OIDC provider ARN"
  value       = module.eks.oidc_provider_arn
}

output "rds_cluster_endpoint" {
  description = "RDS cluster endpoint"
  value       = aws_rds_cluster.main.endpoint
}

output "rds_cluster_reader_endpoint" {
  description = "RDS cluster reader endpoint"
  value       = aws_rds_cluster.main.reader_endpoint
}

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "alb_controller_role_arn" {
  description = "ALB controller IAM role ARN"
  value       = module.alb_controller_irsa.iam_role_arn
}

output "external_secrets_role_arn" {
  description = "External secrets IAM role ARN"
  value       = module.external_secrets_irsa.iam_role_arn
}

output "db_secret_arn" {
  description = "Database credentials secret ARN"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "redis_secret_arn" {
  description = "Redis credentials secret ARN"
  value       = aws_secretsmanager_secret.redis_credentials.arn
}

# -----------------------------------------------------------------------------
# Backup and Disaster Recovery Outputs
# -----------------------------------------------------------------------------
output "backup_bucket_name" {
  description = "S3 bucket for database backups"
  value       = aws_s3_bucket.backup.bucket
}

output "backup_bucket_arn" {
  description = "ARN of the backup S3 bucket"
  value       = aws_s3_bucket.backup.arn
}

output "backup_kms_key_arn" {
  description = "KMS key ARN for backup encryption"
  value       = aws_kms_key.backup.arn
}

output "backup_vault_name" {
  description = "AWS Backup vault name"
  value       = aws_backup_vault.main.name
}

output "backup_vault_arn" {
  description = "AWS Backup vault ARN"
  value       = aws_backup_vault.main.arn
}

output "backup_operator_role_arn" {
  description = "IAM role ARN for backup operations"
  value       = aws_iam_role.backup_operator.arn
}

output "backup_alerts_topic_arn" {
  description = "SNS topic ARN for backup alerts"
  value       = aws_sns_topic.backup_alerts.arn
}

output "dr_region" {
  description = "Disaster recovery region"
  value       = var.dr_region
}

output "dr_bucket_name" {
  description = "DR region backup bucket name (prod only)"
  value       = var.environment == "prod" ? aws_s3_bucket.backup_dr[0].bucket : null
}

output "dr_rds_cluster_endpoint" {
  description = "DR RDS cluster endpoint (prod only)"
  value       = var.environment == "prod" ? aws_rds_cluster.dr_replica[0].endpoint : null
}

output "dr_backup_vault_arn" {
  description = "DR backup vault ARN (prod only)"
  value       = var.environment == "prod" ? aws_backup_vault.dr[0].arn : null
}

output "pre_deployment_snapshot_lambda_arn" {
  description = "Lambda function ARN for pre-deployment snapshots (prod only)"
  value       = var.environment == "prod" ? aws_lambda_function.pre_deployment_snapshot[0].arn : null
}
