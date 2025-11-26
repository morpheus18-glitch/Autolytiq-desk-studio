resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name}-redis"
  subnet_ids = module.vpc.private_subnets

  tags = {
    Name = "${local.name}-redis"
  }
}

resource "aws_security_group" "redis" {
  name        = "${local.name}-redis"
  description = "Security group for Redis"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
    description     = "Redis from EKS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name}-redis"
  }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = local.name
  description          = "Redis cluster for ${local.name}"

  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.redis_node_type[var.environment]
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.main.name

  num_cache_clusters = var.environment == "prod" ? 3 : 1

  automatic_failover_enabled = var.environment == "prod" ? true : false
  multi_az_enabled           = var.environment == "prod" ? true : false

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_password.result

  snapshot_retention_limit = var.environment == "prod" ? 7 : 1
  snapshot_window          = "03:00-05:00"
  maintenance_window       = "sun:05:00-sun:06:00"

  apply_immediately = var.environment != "prod"

  tags = {
    Name = local.name
  }
}

resource "aws_elasticache_parameter_group" "main" {
  name   = "${local.name}-redis7"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }
}

resource "random_password" "redis_password" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "redis_credentials" {
  name = "autolytiq/${var.environment}/redis"
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id
  secret_string = jsonencode({
    host     = aws_elasticache_replication_group.main.primary_endpoint_address
    port     = 6379
    password = random_password.redis_password.result
    url      = "rediss://:${random_password.redis_password.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
  })
}
