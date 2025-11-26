# =============================================================================
# S3 Bucket Module
# =============================================================================
# This module creates an S3 bucket with:
# - Server-side encryption (SSE-S3 or SSE-KMS)
# - Versioning support
# - Lifecycle policies
# - CORS configuration for direct uploads
# - IAM policies for access control
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# =============================================================================
# Local Variables
# =============================================================================

locals {
  bucket_name = "${var.project_name}-${var.environment}-${var.bucket_suffix}"

  tags = merge(var.tags, {
    Module = "s3"
  })
}

# =============================================================================
# S3 Bucket
# =============================================================================

resource "aws_s3_bucket" "this" {
  bucket        = local.bucket_name
  force_destroy = var.force_destroy

  tags = merge(local.tags, {
    Name = local.bucket_name
  })
}

# =============================================================================
# Bucket Versioning
# =============================================================================

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Suspended"
  }
}

# =============================================================================
# Server-Side Encryption
# =============================================================================

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_arn != null ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = var.kms_key_arn != null
  }
}

# =============================================================================
# Public Access Block
# =============================================================================

resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# =============================================================================
# CORS Configuration
# =============================================================================

resource "aws_s3_bucket_cors_configuration" "this" {
  count  = length(var.cors_allowed_origins) > 0 ? 1 : 0
  bucket = aws_s3_bucket.this.id

  cors_rule {
    allowed_headers = var.cors_allowed_headers
    allowed_methods = var.cors_allowed_methods
    allowed_origins = var.cors_allowed_origins
    expose_headers  = var.cors_expose_headers
    max_age_seconds = var.cors_max_age_seconds
  }
}

# =============================================================================
# Lifecycle Rules
# =============================================================================

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  count  = length(var.lifecycle_rules) > 0 ? 1 : 0
  bucket = aws_s3_bucket.this.id

  dynamic "rule" {
    for_each = var.lifecycle_rules
    content {
      id     = rule.value.id
      status = rule.value.enabled ? "Enabled" : "Disabled"

      filter {
        prefix = lookup(rule.value, "prefix", "")
      }

      dynamic "transition" {
        for_each = lookup(rule.value, "transitions", [])
        content {
          days          = transition.value.days
          storage_class = transition.value.storage_class
        }
      }

      dynamic "expiration" {
        for_each = lookup(rule.value, "expiration_days", null) != null ? [1] : []
        content {
          days = rule.value.expiration_days
        }
      }

      dynamic "noncurrent_version_expiration" {
        for_each = lookup(rule.value, "noncurrent_version_expiration_days", null) != null ? [1] : []
        content {
          noncurrent_days = rule.value.noncurrent_version_expiration_days
        }
      }
    }
  }
}

# =============================================================================
# Bucket Policy
# =============================================================================

resource "aws_s3_bucket_policy" "this" {
  count  = var.create_bucket_policy ? 1 : 0
  bucket = aws_s3_bucket.this.id
  policy = data.aws_iam_policy_document.bucket_policy[0].json
}

data "aws_iam_policy_document" "bucket_policy" {
  count = var.create_bucket_policy ? 1 : 0

  # Deny insecure transport
  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]

    resources = [
      aws_s3_bucket.this.arn,
      "${aws_s3_bucket.this.arn}/*"
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  # Allow access from specific IAM roles
  dynamic "statement" {
    for_each = length(var.allowed_iam_role_arns) > 0 ? [1] : []
    content {
      sid    = "AllowAccessFromIAMRoles"
      effect = "Allow"

      principals {
        type        = "AWS"
        identifiers = var.allowed_iam_role_arns
      }

      actions = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ]

      resources = [
        aws_s3_bucket.this.arn,
        "${aws_s3_bucket.this.arn}/*"
      ]
    }
  }
}

# =============================================================================
# IAM Policy for Application Access
# =============================================================================

resource "aws_iam_policy" "bucket_access" {
  count       = var.create_access_policy ? 1 : 0
  name        = "${local.bucket_name}-access"
  description = "IAM policy for accessing ${local.bucket_name} bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ListBucket"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = aws_s3_bucket.this.arn
      },
      {
        Sid    = "ObjectOperations"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObjectAcl",
          "s3:PutObjectAcl"
        ]
        Resource = "${aws_s3_bucket.this.arn}/*"
      }
    ]
  })

  tags = local.tags
}

# =============================================================================
# CloudWatch Alarms
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "bucket_size" {
  count = var.create_cloudwatch_alarms && var.bucket_size_alarm_threshold > 0 ? 1 : 0

  alarm_name          = "${local.bucket_name}-size"
  alarm_description   = "S3 bucket size exceeds threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BucketSizeBytes"
  namespace           = "AWS/S3"
  period              = 86400 # 1 day
  statistic           = "Average"
  threshold           = var.bucket_size_alarm_threshold
  alarm_actions       = var.alarm_actions

  dimensions = {
    BucketName  = aws_s3_bucket.this.id
    StorageType = "StandardStorage"
  }

  tags = local.tags
}
