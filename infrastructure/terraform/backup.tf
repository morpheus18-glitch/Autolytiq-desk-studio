# =============================================================================
# Backup and Disaster Recovery Infrastructure
# =============================================================================
# This file configures comprehensive backup infrastructure for the Autolytiq
# application including:
# - S3 buckets for backup storage
# - Cross-region replication for disaster recovery
# - IAM roles and policies for backup operations
# - KMS keys for backup encryption
# - SNS topics for backup notifications
# =============================================================================

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------
data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------
locals {
  backup_bucket_name    = "autolytiq-${var.environment}-backups-${data.aws_caller_identity.current.account_id}"
  dr_bucket_name        = "autolytiq-${var.environment}-dr-${data.aws_caller_identity.current.account_id}"
  dr_region             = var.environment == "prod" ? var.dr_region : var.aws_region
  enable_cross_region   = var.environment == "prod"
}

# -----------------------------------------------------------------------------
# KMS Key for Backup Encryption
# -----------------------------------------------------------------------------
resource "aws_kms_key" "backup" {
  description             = "KMS key for Autolytiq ${var.environment} backup encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow RDS to use the key"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow S3 to use the key"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name    = "${local.name}-backup-key"
    Purpose = "backup-encryption"
  }
}

resource "aws_kms_alias" "backup" {
  name          = "alias/autolytiq-${var.environment}-backup"
  target_key_id = aws_kms_key.backup.key_id
}

# -----------------------------------------------------------------------------
# Primary Backup S3 Bucket
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "backup" {
  bucket = local.backup_bucket_name

  tags = {
    Name    = local.backup_bucket_name
    Purpose = "database-backups"
  }
}

resource "aws_s3_bucket_versioning" "backup" {
  bucket = aws_s3_bucket.backup.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.backup.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "backup" {
  bucket = aws_s3_bucket.backup.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id

  rule {
    id     = "backup-lifecycle"
    status = "Enabled"

    filter {
      prefix = ""
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = var.environment == "prod" ? 2555 : 90  # 7 years for prod, 90 days for others
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Bucket policy for secure access
resource "aws_s3_bucket_policy" "backup" {
  bucket = aws_s3_bucket.backup.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceTLS"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.backup.arn,
          "${aws_s3_bucket.backup.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid       = "EnforceKMSEncryption"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.backup.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Disaster Recovery Region Resources (Production Only)
# -----------------------------------------------------------------------------
# KMS key in DR region
resource "aws_kms_key" "backup_dr" {
  count = local.enable_cross_region ? 1 : 0

  provider                = aws.dr
  description             = "KMS key for Autolytiq ${var.environment} DR backup encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })

  tags = {
    Name    = "${local.name}-backup-dr-key"
    Purpose = "dr-backup-encryption"
  }
}

# DR S3 Bucket
resource "aws_s3_bucket" "backup_dr" {
  count = local.enable_cross_region ? 1 : 0

  provider = aws.dr
  bucket   = local.dr_bucket_name

  tags = {
    Name    = local.dr_bucket_name
    Purpose = "disaster-recovery-backups"
  }
}

resource "aws_s3_bucket_versioning" "backup_dr" {
  count = local.enable_cross_region ? 1 : 0

  provider = aws.dr
  bucket   = aws_s3_bucket.backup_dr[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup_dr" {
  count = local.enable_cross_region ? 1 : 0

  provider = aws.dr
  bucket   = aws_s3_bucket.backup_dr[0].id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.backup_dr[0].arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "backup_dr" {
  count = local.enable_cross_region ? 1 : 0

  provider = aws.dr
  bucket   = aws_s3_bucket.backup_dr[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# -----------------------------------------------------------------------------
# Cross-Region Replication Configuration
# -----------------------------------------------------------------------------
resource "aws_iam_role" "replication" {
  count = local.enable_cross_region ? 1 : 0

  name = "${local.name}-backup-replication"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "replication" {
  count = local.enable_cross_region ? 1 : 0

  name = "${local.name}-backup-replication"
  role = aws_iam_role.replication[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.backup.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = "${aws_s3_bucket.backup.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = "${aws_s3_bucket.backup_dr[0].arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = aws_kms_key.backup.arn
        Condition = {
          StringLike = {
            "kms:ViaService"    = "s3.${var.aws_region}.amazonaws.com"
            "kms:EncryptionContext:aws:s3:arn" = "${aws_s3_bucket.backup.arn}/*"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt"
        ]
        Resource = aws_kms_key.backup_dr[0].arn
        Condition = {
          StringLike = {
            "kms:ViaService"    = "s3.${local.dr_region}.amazonaws.com"
            "kms:EncryptionContext:aws:s3:arn" = "${aws_s3_bucket.backup_dr[0].arn}/*"
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_replication_configuration" "backup" {
  count = local.enable_cross_region ? 1 : 0

  depends_on = [aws_s3_bucket_versioning.backup]

  role   = aws_iam_role.replication[0].arn
  bucket = aws_s3_bucket.backup.id

  rule {
    id     = "backup-replication"
    status = "Enabled"

    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }

    destination {
      bucket        = aws_s3_bucket.backup_dr[0].arn
      storage_class = "STANDARD_IA"

      encryption_configuration {
        replica_kms_key_id = aws_kms_key.backup_dr[0].arn
      }
    }
  }
}

# -----------------------------------------------------------------------------
# RDS Cross-Region DR (Production Only)
# Note: Aurora PostgreSQL Global Database setup requires cluster recreation.
# For now, DR is handled via S3 cross-region backup replication.
# TODO: Implement Global Database for real-time cross-region replication
# -----------------------------------------------------------------------------

# Disabled: Aurora PostgreSQL requires Global Database for cross-region replication
# The existing cluster would need to be recreated to support this feature.
# Cross-region DR is currently provided via S3 backup replication above.

# resource "aws_rds_global_cluster" "main" {
#   count = local.enable_cross_region ? 1 : 0
#   global_cluster_identifier = "${local.name}-global"
#   engine                    = "aurora-postgresql"
#   engine_version            = "15.6"
#   database_name             = "autolytiq"
#   storage_encrypted         = true
# }

resource "aws_rds_cluster" "dr_replica" {
  # Disabled until Global Database migration is performed
  count = 0  # Was: local.enable_cross_region ? 1 : 0

  provider           = aws.dr
  cluster_identifier = "${local.name}-dr"

  engine         = "aurora-postgresql"
  engine_version = "15.6"
  engine_mode    = "provisioned"

  db_subnet_group_name   = aws_db_subnet_group.dr[0].name
  vpc_security_group_ids = [aws_security_group.rds_dr[0].id]

  storage_encrypted = true
  kms_key_id        = aws_kms_key.backup_dr[0].arn

  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${local.name}-dr-final-snapshot"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 8
  }

  tags = {
    Name    = "${local.name}-dr"
    Purpose = "disaster-recovery"
  }
}

resource "aws_rds_cluster_instance" "dr_replica" {
  # Disabled until Global Database migration is performed
  count = 0  # Was: local.enable_cross_region ? 1 : 0

  provider           = aws.dr
  identifier         = "${local.name}-dr-1"
  cluster_identifier = aws_rds_cluster.dr_replica[0].id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.dr_replica[0].engine
  engine_version     = aws_rds_cluster.dr_replica[0].engine_version

  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  tags = {
    Name    = "${local.name}-dr-1"
    Purpose = "disaster-recovery"
  }
}

# DR Region VPC Resources
resource "aws_db_subnet_group" "dr" {
  count = local.enable_cross_region ? 1 : 0

  provider   = aws.dr
  name       = "${local.name}-dr-db"
  subnet_ids = module.vpc_dr[0].private_subnets

  tags = {
    Name = "${local.name}-dr-db"
  }
}

resource "aws_security_group" "rds_dr" {
  count = local.enable_cross_region ? 1 : 0

  provider    = aws.dr
  name        = "${local.name}-dr-rds"
  description = "Security group for DR RDS"
  vpc_id      = module.vpc_dr[0].vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [module.vpc_dr[0].vpc_cidr_block]
    description = "PostgreSQL from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name}-dr-rds"
  }
}

# DR Region VPC Module
module "vpc_dr" {
  count = local.enable_cross_region ? 1 : 0

  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  providers = {
    aws = aws.dr
  }

  name = "${local.name}-dr"
  cidr = "10.1.0.0/16"

  azs             = ["${local.dr_region}a", "${local.dr_region}b", "${local.dr_region}c"]
  private_subnets = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
  public_subnets  = ["10.1.101.0/24", "10.1.102.0/24", "10.1.103.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = true
  enable_dns_hostnames   = true
  enable_dns_support     = true

  tags = {
    Name    = "${local.name}-dr"
    Purpose = "disaster-recovery"
  }
}

# -----------------------------------------------------------------------------
# IAM Role for Backup Operations
# -----------------------------------------------------------------------------
resource "aws_iam_role" "backup_operator" {
  name = "${local.name}-backup-operator"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = [
            "backup.amazonaws.com",
            "ec2.amazonaws.com"
          ]
        }
        Action = "sts:AssumeRole"
      },
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "aws:PrincipalTag/backup-operator" = "true"
          }
        }
      }
    ]
  })

  tags = {
    Name = "${local.name}-backup-operator"
  }
}

resource "aws_iam_role_policy" "backup_operator" {
  name = "${local.name}-backup-operator"
  role = aws_iam_role.backup_operator.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "RDSBackupPermissions"
        Effect = "Allow"
        Action = [
          "rds:CreateDBClusterSnapshot",
          "rds:CreateDBSnapshot",
          "rds:DeleteDBClusterSnapshot",
          "rds:DeleteDBSnapshot",
          "rds:DescribeDBClusterSnapshots",
          "rds:DescribeDBSnapshots",
          "rds:DescribeDBClusters",
          "rds:DescribeDBInstances",
          "rds:ListTagsForResource",
          "rds:AddTagsToResource",
          "rds:CopyDBClusterSnapshot",
          "rds:CopyDBSnapshot",
          "rds:RestoreDBClusterFromSnapshot",
          "rds:RestoreDBInstanceFromDBSnapshot"
        ]
        Resource = "*"
      },
      {
        Sid    = "S3BackupPermissions"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:GetBucketVersioning"
        ]
        Resource = [
          aws_s3_bucket.backup.arn,
          "${aws_s3_bucket.backup.arn}/*"
        ]
      },
      {
        Sid    = "KMSPermissions"
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey",
          "kms:CreateGrant"
        ]
        Resource = [
          aws_kms_key.backup.arn
        ]
      },
      {
        Sid    = "SecretsManagerPermissions"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.db_credentials.arn
      },
      {
        Sid    = "CloudWatchLogsPermissions"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:log-group:/aws/backup/*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# AWS Backup Vault and Plans
# -----------------------------------------------------------------------------
resource "aws_backup_vault" "main" {
  name        = "${local.name}-vault"
  kms_key_arn = aws_kms_key.backup.arn

  tags = {
    Name = "${local.name}-vault"
  }
}

# Backup vault in DR region
resource "aws_backup_vault" "dr" {
  count = local.enable_cross_region ? 1 : 0

  provider    = aws.dr
  name        = "${local.name}-dr-vault"
  kms_key_arn = aws_kms_key.backup_dr[0].arn

  tags = {
    Name = "${local.name}-dr-vault"
  }
}

# Continuous backup plan for production (15-minute RPO)
resource "aws_backup_plan" "continuous" {
  count = var.environment == "prod" ? 1 : 0

  name = "${local.name}-continuous-backup"

  rule {
    rule_name         = "continuous-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 * * * ? *)"  # Every hour (AWS minimum interval is 60 minutes)

    lifecycle {
      delete_after = 35  # 35 days retention
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr[0].arn
      lifecycle {
        delete_after = 7
      }
    }

    enable_continuous_backup = true
  }

  advanced_backup_setting {
    backup_options = {
      WindowsVSS = "disabled"
    }
    resource_type = "EC2"
  }

  tags = {
    Name = "${local.name}-continuous-backup"
  }
}

# Daily backup plan
resource "aws_backup_plan" "daily" {
  name = "${local.name}-daily-backup"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 * * ? *)"  # Daily at 3 AM UTC

    lifecycle {
      cold_storage_after = var.environment == "prod" ? 30 : null
      delete_after       = var.environment == "prod" ? 365 : 30
    }

    dynamic "copy_action" {
      for_each = local.enable_cross_region ? [1] : []
      content {
        destination_vault_arn = aws_backup_vault.dr[0].arn
        lifecycle {
          delete_after = 30
        }
      }
    }
  }

  tags = {
    Name = "${local.name}-daily-backup"
  }
}

# Weekly backup plan
resource "aws_backup_plan" "weekly" {
  name = "${local.name}-weekly-backup"

  rule {
    rule_name         = "weekly-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 4 ? * SUN *)"  # Weekly on Sunday at 4 AM UTC

    lifecycle {
      cold_storage_after = var.environment == "prod" ? 90 : null
      delete_after       = var.environment == "prod" ? 2555 : 90  # 7 years for prod
    }

    dynamic "copy_action" {
      for_each = local.enable_cross_region ? [1] : []
      content {
        destination_vault_arn = aws_backup_vault.dr[0].arn
        lifecycle {
          cold_storage_after = 30
          delete_after       = 365
        }
      }
    }
  }

  tags = {
    Name = "${local.name}-weekly-backup"
  }
}

# Monthly backup plan (for compliance)
resource "aws_backup_plan" "monthly" {
  count = var.environment == "prod" ? 1 : 0

  name = "${local.name}-monthly-backup"

  rule {
    rule_name         = "monthly-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 1 * ? *)"  # Monthly on the 1st at 5 AM UTC

    lifecycle {
      cold_storage_after = 30
      delete_after       = 2555  # 7 years retention
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr[0].arn
      lifecycle {
        cold_storage_after = 90
        delete_after       = 2555
      }
    }
  }

  tags = {
    Name = "${local.name}-monthly-backup"
  }
}

# Backup selection for RDS
resource "aws_backup_selection" "rds_daily" {
  name         = "${local.name}-rds-daily"
  plan_id      = aws_backup_plan.daily.id
  iam_role_arn = aws_iam_role.backup_operator.arn

  resources = [
    aws_rds_cluster.main.arn
  ]
}

resource "aws_backup_selection" "rds_weekly" {
  name         = "${local.name}-rds-weekly"
  plan_id      = aws_backup_plan.weekly.id
  iam_role_arn = aws_iam_role.backup_operator.arn

  resources = [
    aws_rds_cluster.main.arn
  ]
}

resource "aws_backup_selection" "rds_continuous" {
  count = var.environment == "prod" ? 1 : 0

  name         = "${local.name}-rds-continuous"
  plan_id      = aws_backup_plan.continuous[0].id
  iam_role_arn = aws_iam_role.backup_operator.arn

  resources = [
    aws_rds_cluster.main.arn
  ]
}

resource "aws_backup_selection" "rds_monthly" {
  count = var.environment == "prod" ? 1 : 0

  name         = "${local.name}-rds-monthly"
  plan_id      = aws_backup_plan.monthly[0].id
  iam_role_arn = aws_iam_role.backup_operator.arn

  resources = [
    aws_rds_cluster.main.arn
  ]
}

# -----------------------------------------------------------------------------
# SNS Topic for Backup Notifications
# -----------------------------------------------------------------------------
resource "aws_sns_topic" "backup_alerts" {
  name = "${local.name}-backup-alerts"

  tags = {
    Name = "${local.name}-backup-alerts"
  }
}

resource "aws_sns_topic_policy" "backup_alerts" {
  arn = aws_sns_topic.backup_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowBackupPublish"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.backup_alerts.arn
      },
      {
        Sid    = "AllowCloudWatchPublish"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.backup_alerts.arn
      }
    ]
  })
}

# Backup vault notifications
resource "aws_backup_vault_notifications" "main" {
  backup_vault_name   = aws_backup_vault.main.name
  sns_topic_arn       = aws_sns_topic.backup_alerts.arn
  backup_vault_events = [
    "BACKUP_JOB_STARTED",
    "BACKUP_JOB_COMPLETED",
    "BACKUP_JOB_FAILED",
    "RESTORE_JOB_STARTED",
    "RESTORE_JOB_COMPLETED",
    "RESTORE_JOB_FAILED",
    "COPY_JOB_STARTED",
    "COPY_JOB_SUCCESSFUL",
    "COPY_JOB_FAILED"
  ]
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms for Backup Monitoring
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_metric_alarm" "backup_job_failed" {
  alarm_name          = "${local.name}-backup-job-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NumberOfBackupJobsFailed"
  namespace           = "AWS/Backup"
  period              = 3600  # 1 hour
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Backup job failed for ${local.name}"
  alarm_actions       = [aws_sns_topic.backup_alerts.arn]
  ok_actions          = [aws_sns_topic.backup_alerts.arn]

  dimensions = {
    BackupVaultName = aws_backup_vault.main.name
  }

  tags = {
    Name = "${local.name}-backup-job-failed"
  }
}

resource "aws_cloudwatch_metric_alarm" "backup_copy_failed" {
  count = local.enable_cross_region ? 1 : 0

  alarm_name          = "${local.name}-backup-copy-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NumberOfCopyJobsFailed"
  namespace           = "AWS/Backup"
  period              = 3600
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Backup copy job failed for ${local.name}"
  alarm_actions       = [aws_sns_topic.backup_alerts.arn]
  ok_actions          = [aws_sns_topic.backup_alerts.arn]

  dimensions = {
    BackupVaultName = aws_backup_vault.main.name
  }

  tags = {
    Name = "${local.name}-backup-copy-failed"
  }
}

# -----------------------------------------------------------------------------
# Pre-Deployment Snapshot Lambda Function
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "pre_deployment_snapshot" {
  count = var.environment == "prod" ? 1 : 0

  filename         = data.archive_file.pre_deployment_snapshot[0].output_path
  function_name    = "${local.name}-pre-deployment-snapshot"
  role             = aws_iam_role.pre_deployment_snapshot[0].arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.pre_deployment_snapshot[0].output_base64sha256
  runtime          = "python3.11"
  timeout          = 300

  environment {
    variables = {
      CLUSTER_IDENTIFIER = aws_rds_cluster.main.cluster_identifier
      SNS_TOPIC_ARN      = aws_sns_topic.backup_alerts.arn
    }
  }

  tags = {
    Name = "${local.name}-pre-deployment-snapshot"
  }
}

data "archive_file" "pre_deployment_snapshot" {
  count = var.environment == "prod" ? 1 : 0

  type        = "zip"
  output_path = "${path.module}/lambda/pre_deployment_snapshot.zip"

  source {
    content  = <<-EOF
      import boto3
      import os
      import json
      from datetime import datetime

      def handler(event, context):
          rds = boto3.client('rds')
          sns = boto3.client('sns')

          cluster_id = os.environ['CLUSTER_IDENTIFIER']
          sns_topic = os.environ['SNS_TOPIC_ARN']

          timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
          snapshot_id = f"{cluster_id}-pre-deploy-{timestamp}"

          try:
              # Create manual snapshot
              response = rds.create_db_cluster_snapshot(
                  DBClusterSnapshotIdentifier=snapshot_id,
                  DBClusterIdentifier=cluster_id,
                  Tags=[
                      {'Key': 'Purpose', 'Value': 'pre-deployment'},
                      {'Key': 'CreatedBy', 'Value': 'lambda'},
                      {'Key': 'Timestamp', 'Value': timestamp}
                  ]
              )

              # Wait for snapshot to be available
              waiter = rds.get_waiter('db_cluster_snapshot_available')
              waiter.wait(
                  DBClusterSnapshotIdentifier=snapshot_id,
                  WaiterConfig={'Delay': 30, 'MaxAttempts': 60}
              )

              # Send success notification
              sns.publish(
                  TopicArn=sns_topic,
                  Subject=f'Pre-deployment snapshot created: {snapshot_id}',
                  Message=json.dumps({
                      'status': 'success',
                      'snapshot_id': snapshot_id,
                      'cluster_id': cluster_id,
                      'timestamp': timestamp
                  })
              )

              return {
                  'statusCode': 200,
                  'body': json.dumps({
                      'snapshot_id': snapshot_id,
                      'status': 'available'
                  })
              }

          except Exception as e:
              # Send failure notification
              sns.publish(
                  TopicArn=sns_topic,
                  Subject=f'Pre-deployment snapshot FAILED',
                  Message=json.dumps({
                      'status': 'failed',
                      'error': str(e),
                      'cluster_id': cluster_id
                  })
              )
              raise e
    EOF
    filename = "index.py"
  }
}

resource "aws_iam_role" "pre_deployment_snapshot" {
  count = var.environment == "prod" ? 1 : 0

  name = "${local.name}-pre-deployment-snapshot"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "pre_deployment_snapshot" {
  count = var.environment == "prod" ? 1 : 0

  name = "${local.name}-pre-deployment-snapshot"
  role = aws_iam_role.pre_deployment_snapshot[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:CreateDBClusterSnapshot",
          "rds:DescribeDBClusterSnapshots",
          "rds:AddTagsToResource"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.backup_alerts.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}
