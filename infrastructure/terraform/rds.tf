resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db"
  subnet_ids = module.vpc.private_subnets

  tags = {
    Name = "${local.name}-db"
  }
}

resource "aws_security_group" "rds" {
  name        = "${local.name}-rds"
  description = "Security group for RDS"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
    description     = "PostgreSQL from EKS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name}-rds"
  }
}

resource "aws_db_parameter_group" "main" {
  name   = "${local.name}-pg15"
  family = "postgres15"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
}

resource "aws_rds_cluster" "main" {
  cluster_identifier = local.name

  engine         = "aurora-postgresql"
  engine_version = "15.4"
  engine_mode    = "provisioned"

  database_name   = "autolytiq"
  master_username = "autolytiq_admin"
  master_password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  storage_encrypted   = true
  deletion_protection = var.environment == "prod" ? true : false
  skip_final_snapshot = var.environment != "prod"

  backup_retention_period      = var.environment == "prod" ? 35 : 7
  preferred_backup_window      = "03:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  serverlessv2_scaling_configuration {
    min_capacity = var.environment == "prod" ? 2 : 0.5
    max_capacity = var.environment == "prod" ? 16 : 4
  }

  tags = {
    Name = local.name
  }
}

resource "aws_rds_cluster_instance" "main" {
  count = var.environment == "prod" ? 2 : 1

  identifier         = "${local.name}-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  performance_insights_enabled    = true
  performance_insights_retention_period = 7

  tags = {
    Name = "${local.name}-${count.index + 1}"
  }
}

resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name = "autolytiq/${var.environment}/database"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = aws_rds_cluster.main.master_username
    password = random_password.db_password.result
    host     = aws_rds_cluster.main.endpoint
    port     = 5432
    database = aws_rds_cluster.main.database_name
    url      = "postgresql://${aws_rds_cluster.main.master_username}:${random_password.db_password.result}@${aws_rds_cluster.main.endpoint}:5432/${aws_rds_cluster.main.database_name}"
  })
}
