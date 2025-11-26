# =============================================================================
# IAM Module Variables
# =============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "oidc_provider_arn" {
  description = "ARN of the EKS OIDC provider for IRSA"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace where services are deployed"
  type        = string
  default     = "autolytiq"
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket for backend services"
  type        = string
  default     = null
}

variable "enable_ses_access" {
  description = "Enable SES access for email service (if using AWS SES)"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
