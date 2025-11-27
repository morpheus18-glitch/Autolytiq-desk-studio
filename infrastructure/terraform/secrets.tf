# =============================================================================
# AWS Secrets Manager Configuration
# =============================================================================
# Production-grade secrets management with:
# - Centralized secret storage in AWS Secrets Manager
# - Automatic credential rotation for RDS
# - IAM policies for EKS pod access via IRSA
# - Environment-separated secrets (dev/staging/prod)
# =============================================================================

locals {
  secrets_prefix = "autolytiq/${var.environment}"
}

# -----------------------------------------------------------------------------
# JWT Secrets
# -----------------------------------------------------------------------------
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret" "jwt" {
  name                    = "${local.secrets_prefix}/jwt"
  description             = "JWT authentication secrets for ${var.environment}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name        = "${local.name}-jwt"
    Environment = var.environment
    Service     = "auth-service"
  }
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id = aws_secretsmanager_secret.jwt.id
  secret_string = jsonencode({
    secret = random_password.jwt_secret.result
    issuer = "autolytiq"
  })
}

# -----------------------------------------------------------------------------
# PII Encryption Key
# -----------------------------------------------------------------------------
resource "random_password" "pii_encryption_key" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "pii_encryption" {
  name                    = "${local.secrets_prefix}/pii-encryption"
  description             = "PII field encryption key (AES-256) for ${var.environment}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name        = "${local.name}-pii-encryption"
    Environment = var.environment
    Service     = "all"
    Sensitive   = "true"
  }
}

# Generate hex-encoded key for AES-256 (32 bytes = 64 hex chars)
resource "random_id" "pii_encryption_key_hex" {
  byte_length = 32
}

resource "aws_secretsmanager_secret_version" "pii_encryption" {
  secret_id = aws_secretsmanager_secret.pii_encryption.id
  secret_string = jsonencode({
    key            = random_id.pii_encryption_key_hex.hex
    version        = "v1"
    algorithm      = "AES-256-GCM"
    key_size_bytes = 32
  })
}

# -----------------------------------------------------------------------------
# Session Secret
# -----------------------------------------------------------------------------
resource "random_password" "session_secret" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret" "session" {
  name                    = "${local.secrets_prefix}/session"
  description             = "Session encryption secret for ${var.environment}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name        = "${local.name}-session"
    Environment = var.environment
    Service     = "api-gateway"
  }
}

resource "aws_secretsmanager_secret_version" "session" {
  secret_id = aws_secretsmanager_secret.session.id
  secret_string = jsonencode({
    secret = random_password.session_secret.result
  })
}

# -----------------------------------------------------------------------------
# SMTP/Email Service Credentials
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "smtp" {
  name                    = "${local.secrets_prefix}/smtp"
  description             = "SMTP credentials for email service in ${var.environment}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name        = "${local.name}-smtp"
    Environment = var.environment
    Service     = "email-service"
  }
}

# Note: SMTP credentials should be manually populated after infrastructure creation
# This creates the secret with placeholder values
resource "aws_secretsmanager_secret_version" "smtp" {
  secret_id = aws_secretsmanager_secret.smtp.id
  secret_string = jsonencode({
    host       = "smtp.sendgrid.net"
    port       = 587
    username   = "apikey"
    password   = "REPLACE_WITH_ACTUAL_API_KEY"
    from_email = "noreply@autolytiq.com"
    from_name  = "Autolytiq"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# -----------------------------------------------------------------------------
# Resend API Key (alternative email provider)
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "resend" {
  name                    = "${local.secrets_prefix}/resend"
  description             = "Resend API key for email service in ${var.environment}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name        = "${local.name}-resend"
    Environment = var.environment
    Service     = "email-service"
  }
}

resource "aws_secretsmanager_secret_version" "resend" {
  secret_id = aws_secretsmanager_secret.resend.id
  secret_string = jsonencode({
    api_key = "REPLACE_WITH_ACTUAL_API_KEY"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# -----------------------------------------------------------------------------
# External API Keys
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "external_apis" {
  name                    = "${local.secrets_prefix}/external-apis"
  description             = "External API keys and credentials for ${var.environment}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name        = "${local.name}-external-apis"
    Environment = var.environment
    Service     = "multiple"
  }
}

resource "aws_secretsmanager_secret_version" "external_apis" {
  secret_id = aws_secretsmanager_secret.external_apis.id
  secret_string = jsonencode({
    sentry_dsn        = ""
    datadog_api_key   = ""
    stripe_secret_key = ""
    stripe_webhook_secret = ""
    # Add other external API keys as needed
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# -----------------------------------------------------------------------------
# RDS Credential Rotation Configuration
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret_rotation" "db_credentials" {
  count = var.environment == "prod" ? 1 : 0

  secret_id           = aws_secretsmanager_secret.db_credentials.id
  rotation_lambda_arn = aws_lambda_function.rotate_db_credentials[0].arn

  rotation_rules {
    schedule_expression = "rate(30 days)"
  }
}

# Lambda function for RDS credential rotation
resource "aws_lambda_function" "rotate_db_credentials" {
  count = var.environment == "prod" ? 1 : 0

  function_name = "${local.name}-rotate-db-credentials"
  description   = "Rotates RDS database credentials for ${local.name}"

  runtime     = "python3.11"
  handler     = "lambda_function.lambda_handler"
  timeout     = 30
  memory_size = 128

  filename         = data.archive_file.rotation_lambda[0].output_path
  source_code_hash = data.archive_file.rotation_lambda[0].output_base64sha256

  role = aws_iam_role.rotation_lambda[0].arn

  vpc_config {
    subnet_ids         = module.vpc.private_subnets
    security_group_ids = [aws_security_group.rotation_lambda[0].id]
  }

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.${var.aws_region}.amazonaws.com"
    }
  }

  tags = {
    Name        = "${local.name}-rotate-db-credentials"
    Environment = var.environment
  }
}

# Lambda rotation function code
data "archive_file" "rotation_lambda" {
  count = var.environment == "prod" ? 1 : 0

  type        = "zip"
  output_path = "${path.module}/lambda/rotation_lambda.zip"

  source {
    content  = <<-EOF
import boto3
import json
import logging
import os
import psycopg2
import string
import secrets

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """Rotates RDS PostgreSQL credentials."""
    arn = event['SecretId']
    token = event['ClientRequestToken']
    step = event['Step']

    service_client = boto3.client('secretsmanager')

    metadata = service_client.describe_secret(SecretId=arn)
    if not metadata['RotationEnabled']:
        raise ValueError(f"Rotation not enabled for secret {arn}")

    versions = metadata['VersionIdsToStages']
    if token not in versions:
        raise ValueError(f"Secret version {token} not found")

    if "AWSCURRENT" in versions[token]:
        logger.info(f"Secret version {token} already set as AWSCURRENT")
        return
    elif "AWSPENDING" not in versions[token]:
        raise ValueError(f"Secret version {token} not set as AWSPENDING")

    if step == "createSecret":
        create_secret(service_client, arn, token)
    elif step == "setSecret":
        set_secret(service_client, arn, token)
    elif step == "testSecret":
        test_secret(service_client, arn, token)
    elif step == "finishSecret":
        finish_secret(service_client, arn, token)
    else:
        raise ValueError(f"Invalid step: {step}")

def create_secret(service_client, arn, token):
    """Create new secret version with new password."""
    current_dict = get_secret_dict(service_client, arn, "AWSCURRENT")

    # Generate new password
    alphabet = string.ascii_letters + string.digits
    new_password = ''.join(secrets.choice(alphabet) for _ in range(32))

    current_dict['password'] = new_password
    current_dict['url'] = f"postgresql://{current_dict['username']}:{new_password}@{current_dict['host']}:{current_dict['port']}/{current_dict['database']}"

    try:
        service_client.put_secret_value(
            SecretId=arn,
            ClientRequestToken=token,
            SecretString=json.dumps(current_dict),
            VersionStages=['AWSPENDING']
        )
        logger.info("Successfully created new secret version")
    except service_client.exceptions.ResourceExistsException:
        logger.info("Secret version already exists")

def set_secret(service_client, arn, token):
    """Set the pending secret in the database."""
    pending_dict = get_secret_dict(service_client, arn, "AWSPENDING", token)
    current_dict = get_secret_dict(service_client, arn, "AWSCURRENT")

    conn = psycopg2.connect(
        host=current_dict['host'],
        port=current_dict['port'],
        database=current_dict['database'],
        user=current_dict['username'],
        password=current_dict['password']
    )

    try:
        with conn.cursor() as cur:
            cur.execute(
                f"ALTER USER {pending_dict['username']} WITH PASSWORD %s",
                (pending_dict['password'],)
            )
        conn.commit()
        logger.info("Successfully set password in database")
    finally:
        conn.close()

def test_secret(service_client, arn, token):
    """Test the pending secret."""
    pending_dict = get_secret_dict(service_client, arn, "AWSPENDING", token)

    conn = psycopg2.connect(
        host=pending_dict['host'],
        port=pending_dict['port'],
        database=pending_dict['database'],
        user=pending_dict['username'],
        password=pending_dict['password']
    )
    conn.close()
    logger.info("Successfully tested new credentials")

def finish_secret(service_client, arn, token):
    """Finish the rotation by marking AWSPENDING as AWSCURRENT."""
    metadata = service_client.describe_secret(SecretId=arn)
    current_version = None

    for version, stages in metadata['VersionIdsToStages'].items():
        if "AWSCURRENT" in stages:
            current_version = version
            break

    service_client.update_secret_version_stage(
        SecretId=arn,
        VersionStage="AWSCURRENT",
        MoveToVersionId=token,
        RemoveFromVersionId=current_version
    )
    logger.info("Successfully finished rotation")

def get_secret_dict(service_client, arn, stage, token=None):
    """Get secret value as dictionary."""
    if token:
        response = service_client.get_secret_value(
            SecretId=arn,
            VersionId=token,
            VersionStage=stage
        )
    else:
        response = service_client.get_secret_value(
            SecretId=arn,
            VersionStage=stage
        )
    return json.loads(response['SecretString'])
EOF
    filename = "lambda_function.py"
  }
}

# IAM role for rotation Lambda
resource "aws_iam_role" "rotation_lambda" {
  count = var.environment == "prod" ? 1 : 0

  name = "${local.name}-rotation-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = {
    Name        = "${local.name}-rotation-lambda"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "rotation_lambda" {
  count = var.environment == "prod" ? 1 : 0

  name = "${local.name}-rotation-lambda"
  role = aws_iam_role.rotation_lambda[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage"
        ]
        Resource = aws_secretsmanager_secret.db_credentials.arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetRandomPassword"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_permission" "rotation" {
  count = var.environment == "prod" ? 1 : 0

  statement_id  = "AllowSecretsManagerInvocation"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rotate_db_credentials[0].function_name
  principal     = "secretsmanager.amazonaws.com"
}

# Security group for rotation Lambda
resource "aws_security_group" "rotation_lambda" {
  count = var.environment == "prod" ? 1 : 0

  name        = "${local.name}-rotation-lambda"
  description = "Security group for credential rotation Lambda"
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name}-rotation-lambda"
  }
}

# Allow Lambda to connect to RDS
resource "aws_security_group_rule" "rds_from_rotation_lambda" {
  count = var.environment == "prod" ? 1 : 0

  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.rotation_lambda[0].id
  security_group_id        = aws_security_group.rds.id
  description              = "PostgreSQL from rotation Lambda"
}

# -----------------------------------------------------------------------------
# IAM Policy for Application Secrets Access
# -----------------------------------------------------------------------------
resource "aws_iam_policy" "secrets_access" {
  name        = "${local.name}-secrets-access"
  description = "Policy for EKS pods to access secrets in Secrets Manager"

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
          aws_secretsmanager_secret.db_credentials.arn,
          aws_secretsmanager_secret.redis_credentials.arn,
          aws_secretsmanager_secret.jwt.arn,
          aws_secretsmanager_secret.pii_encryption.arn,
          aws_secretsmanager_secret.session.arn,
          aws_secretsmanager_secret.smtp.arn,
          aws_secretsmanager_secret.resend.arn,
          aws_secretsmanager_secret.external_apis.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${var.aws_region}.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${local.name}-secrets-access"
    Environment = var.environment
  }
}

# IRSA role for services to access secrets
module "secrets_access_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name = "${local.name}-secrets-access"

  role_policy_arns = {
    secrets_access = aws_iam_policy.secrets_access.arn
  }

  oidc_providers = {
    main = {
      provider_arn = module.eks.oidc_provider_arn
      namespace_service_accounts = [
        "autolytiq:api-gateway",
        "autolytiq:auth-service",
        "autolytiq:deal-service",
        "autolytiq:customer-service",
        "autolytiq:inventory-service",
        "autolytiq:email-service",
        "autolytiq:user-service",
        "autolytiq:config-service",
        "autolytiq:messaging-service",
        "autolytiq:showroom-service",
        "autolytiq:settings-service"
      ]
    }
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "jwt_secret_arn" {
  description = "JWT secret ARN"
  value       = aws_secretsmanager_secret.jwt.arn
}

output "pii_encryption_secret_arn" {
  description = "PII encryption key secret ARN"
  value       = aws_secretsmanager_secret.pii_encryption.arn
}

output "session_secret_arn" {
  description = "Session secret ARN"
  value       = aws_secretsmanager_secret.session.arn
}

output "smtp_secret_arn" {
  description = "SMTP credentials secret ARN"
  value       = aws_secretsmanager_secret.smtp.arn
}

output "resend_secret_arn" {
  description = "Resend API key secret ARN"
  value       = aws_secretsmanager_secret.resend.arn
}

output "external_apis_secret_arn" {
  description = "External APIs secret ARN"
  value       = aws_secretsmanager_secret.external_apis.arn
}

output "secrets_access_role_arn" {
  description = "IAM role ARN for secrets access"
  value       = module.secrets_access_irsa.iam_role_arn
}
