# =============================================================================
# ElastiCache Redis Module
# =============================================================================
# This module creates an ElastiCache Redis cluster with:
# - Encryption at rest and in transit
# - Multi-AZ support for production
# - Automatic failover
# - Parameter groups optimized for caching
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.0"
    }
  }
}

# =============================================================================
# Local Variables
# =============================================================================

locals {
  name = "${var.project_name}-${var.environment}"

  tags = merge(var.tags, {
    Module = "elasticache"
  })
}

# =============================================================================
# Subnet Group
# =============================================================================

resource "aws_elasticache_subnet_group" "this" {
  name        = "${local.name}-redis"
  subnet_ids  = var.subnet_ids
  description = "Redis subnet group for ${local.name}"

  tags = merge(local.tags, {
    Name = "${local.name}-redis-subnet-group"
  })
}

# =============================================================================
# Security Group
# =============================================================================

resource "aws_security_group" "this" {
  name        = "${local.name}-redis"
  description = "Security group for Redis cluster"
  vpc_id      = var.vpc_id

  # Redis port from allowed security groups
  dynamic "ingress" {
    for_each = var.allowed_security_group_ids
    content {
      from_port       = 6379
      to_port         = 6379
      protocol        = "tcp"
      security_groups = [ingress.value]
      description     = "Redis access from allowed security group"
    }
  }

  # Redis port from allowed CIDR blocks
  dynamic "ingress" {
    for_each = length(var.allowed_cidr_blocks) > 0 ? [1] : []
    content {
      from_port   = 6379
      to_port     = 6379
      protocol    = "tcp"
      cidr_blocks = var.allowed_cidr_blocks
      description = "Redis access from allowed CIDR blocks"
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(local.tags, {
    Name = "${local.name}-redis-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# Parameter Group
# =============================================================================

resource "aws_elasticache_parameter_group" "this" {
  name        = "${local.name}-redis7"
  family      = "redis7"
  description = "Redis 7 parameter group for ${local.name}"

  # Memory management
  parameter {
    name  = "maxmemory-policy"
    value = var.maxmemory_policy
  }

  # Connection timeout
  parameter {
    name  = "timeout"
    value = var.connection_timeout
  }

  # TCP keepalive
  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  tags = local.tags
}

# =============================================================================
# Auth Token (Password)
# =============================================================================

resource "random_password" "auth_token" {
  length  = 32
  special = false # ElastiCache auth tokens don't support all special chars
}

# =============================================================================
# Replication Group (Redis Cluster)
# =============================================================================

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = local.name
  description          = "Redis cluster for ${local.name}"

  # Engine configuration
  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.this.name

  # Cluster configuration
  num_cache_clusters = var.num_cache_clusters

  # High availability
  automatic_failover_enabled = var.num_cache_clusters > 1 ? true : false
  multi_az_enabled           = var.num_cache_clusters > 1 ? var.multi_az_enabled : false

  # Networking
  subnet_group_name  = aws_elasticache_subnet_group.this.name
  security_group_ids = [aws_security_group.this.id]

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.auth_token.result

  # Maintenance
  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window          = var.snapshot_window
  maintenance_window       = var.maintenance_window

  # Apply changes
  apply_immediately = var.apply_immediately

  # Notifications
  notification_topic_arn = var.sns_topic_arn

  tags = merge(local.tags, {
    Name = local.name
  })

  lifecycle {
    ignore_changes = [
      # Ignore auth token changes (managed separately)
      auth_token,
    ]
  }
}

# =============================================================================
# CloudWatch Alarms
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.name}-redis-cpu-utilization"
  alarm_description   = "Redis cluster CPU utilization is high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.this.id}-001"
  }

  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "memory_usage" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.name}-redis-memory-usage"
  alarm_description   = "Redis cluster memory usage is high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.this.id}-001"
  }

  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "evictions" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.name}-redis-evictions"
  alarm_description   = "Redis cluster has high eviction rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Sum"
  threshold           = 1000
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.this.id}-001"
  }

  tags = local.tags
}

# =============================================================================
# Secrets Manager
# =============================================================================

resource "aws_secretsmanager_secret" "redis_credentials" {
  name        = "${var.project_name}/${var.environment}/redis"
  description = "Redis credentials for ${local.name}"

  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id
  secret_string = jsonencode({
    host     = aws_elasticache_replication_group.this.primary_endpoint_address
    port     = 6379
    password = random_password.auth_token.result
    url      = "rediss://:${random_password.auth_token.result}@${aws_elasticache_replication_group.this.primary_endpoint_address}:6379"
  })
}
