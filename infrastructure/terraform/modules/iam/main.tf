# =============================================================================
# IAM Module for EKS Service Accounts
# =============================================================================
# This module creates IAM roles for Kubernetes service accounts using IRSA
# (IAM Roles for Service Accounts).
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
  name = "${var.project_name}-${var.environment}"

  tags = merge(var.tags, {
    Module = "iam"
  })
}

# =============================================================================
# Data Sources
# =============================================================================

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# =============================================================================
# API Gateway Service Account Role
# =============================================================================

resource "aws_iam_role" "api_gateway" {
  name = "${local.name}-api-gateway"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(var.oidc_provider_arn, "/^(.*provider/)/", "")}:aud" = "sts.amazonaws.com"
            "${replace(var.oidc_provider_arn, "/^(.*provider/)/", "")}:sub" = "system:serviceaccount:${var.namespace}:api-gateway"
          }
        }
      }
    ]
  })

  tags = local.tags
}

# Policy for API Gateway (secrets access)
resource "aws_iam_role_policy" "api_gateway_secrets" {
  name = "secrets-access"
  role = aws_iam_role.api_gateway.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/${var.environment}/*"
        ]
      }
    ]
  })
}

# =============================================================================
# Backend Services Role (shared by all backend services)
# =============================================================================

resource "aws_iam_role" "backend_services" {
  name = "${local.name}-backend-services"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringLike = {
            "${replace(var.oidc_provider_arn, "/^(.*provider/)/", "")}:aud" = "sts.amazonaws.com"
            "${replace(var.oidc_provider_arn, "/^(.*provider/)/", "")}:sub" = "system:serviceaccount:${var.namespace}:*-service"
          }
        }
      }
    ]
  })

  tags = local.tags
}

# Policy for backend services (secrets + S3)
resource "aws_iam_role_policy" "backend_secrets" {
  name = "secrets-access"
  role = aws_iam_role.backend_services.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/${var.environment}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "backend_s3" {
  count = var.s3_bucket_arn != null ? 1 : 0
  name  = "s3-access"
  role  = aws_iam_role.backend_services.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.s3_bucket_arn,
          "${var.s3_bucket_arn}/*"
        ]
      }
    ]
  })
}

# =============================================================================
# Email Service Role
# =============================================================================

resource "aws_iam_role" "email_service" {
  name = "${local.name}-email-service"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(var.oidc_provider_arn, "/^(.*provider/)/", "")}:aud" = "sts.amazonaws.com"
            "${replace(var.oidc_provider_arn, "/^(.*provider/)/", "")}:sub" = "system:serviceaccount:${var.namespace}:email-service"
          }
        }
      }
    ]
  })

  tags = local.tags
}

# Policy for email service (secrets + SES)
resource "aws_iam_role_policy" "email_secrets" {
  name = "secrets-access"
  role = aws_iam_role.email_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/${var.environment}/resend*"
        ]
      }
    ]
  })
}

# Optional SES access (if using AWS SES instead of Resend)
resource "aws_iam_role_policy" "email_ses" {
  count = var.enable_ses_access ? 1 : 0
  name  = "ses-access"
  role  = aws_iam_role.email_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail"
        ]
        Resource = "*"
      }
    ]
  })
}

# =============================================================================
# External Secrets Operator Role
# =============================================================================

resource "aws_iam_role" "external_secrets" {
  name = "${local.name}-external-secrets"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(var.oidc_provider_arn, "/^(.*provider/)/", "")}:aud" = "sts.amazonaws.com"
            "${replace(var.oidc_provider_arn, "/^(.*provider/)/", "")}:sub" = "system:serviceaccount:external-secrets:external-secrets"
          }
        }
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy" "external_secrets" {
  name = "secrets-access"
  role = aws_iam_role.external_secrets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecrets"
        ]
        Resource = [
          "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/*"
        ]
      }
    ]
  })
}
