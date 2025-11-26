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
