# =============================================================================
# ElastiCache Module Outputs
# =============================================================================

output "replication_group_id" {
  description = "ID of the ElastiCache replication group"
  value       = aws_elasticache_replication_group.this.id
}

output "replication_group_arn" {
  description = "ARN of the ElastiCache replication group"
  value       = aws_elasticache_replication_group.this.arn
}

output "primary_endpoint_address" {
  description = "Primary endpoint address for the Redis cluster"
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "reader_endpoint_address" {
  description = "Reader endpoint address for the Redis cluster"
  value       = aws_elasticache_replication_group.this.reader_endpoint_address
}

output "port" {
  description = "Redis port"
  value       = 6379
}

output "security_group_id" {
  description = "ID of the Redis security group"
  value       = aws_security_group.this.id
}

output "subnet_group_name" {
  description = "Name of the Redis subnet group"
  value       = aws_elasticache_subnet_group.this.name
}

output "parameter_group_name" {
  description = "Name of the Redis parameter group"
  value       = aws_elasticache_parameter_group.this.name
}

output "secret_arn" {
  description = "ARN of the Secrets Manager secret containing Redis credentials"
  value       = aws_secretsmanager_secret.redis_credentials.arn
}

output "secret_name" {
  description = "Name of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.redis_credentials.name
}

output "connection_url" {
  description = "Redis connection URL (sensitive)"
  value       = "rediss://:${random_password.auth_token.result}@${aws_elasticache_replication_group.this.primary_endpoint_address}:6379"
  sensitive   = true
}
