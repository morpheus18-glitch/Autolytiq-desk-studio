# =============================================================================
# S3 Module Variables
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

variable "bucket_suffix" {
  description = "Suffix for the bucket name (e.g., 'assets', 'uploads')"
  type        = string
  default     = "assets"
}

# =============================================================================
# Bucket Configuration
# =============================================================================

variable "force_destroy" {
  description = "Allow destruction of bucket with objects"
  type        = bool
  default     = false
}

variable "versioning_enabled" {
  description = "Enable versioning for the bucket"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "KMS key ARN for bucket encryption (uses AES256 if not provided)"
  type        = string
  default     = null
}

# =============================================================================
# CORS Configuration
# =============================================================================

variable "cors_allowed_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
  default     = []
}

variable "cors_allowed_methods" {
  description = "List of allowed HTTP methods for CORS"
  type        = list(string)
  default     = ["GET", "PUT", "POST", "DELETE", "HEAD"]
}

variable "cors_allowed_headers" {
  description = "List of allowed headers for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "cors_expose_headers" {
  description = "List of headers to expose in CORS response"
  type        = list(string)
  default     = ["ETag", "Content-Length", "Content-Type"]
}

variable "cors_max_age_seconds" {
  description = "Max age for CORS preflight cache in seconds"
  type        = number
  default     = 3600
}

# =============================================================================
# Lifecycle Rules
# =============================================================================

variable "lifecycle_rules" {
  description = "List of lifecycle rules for the bucket"
  type = list(object({
    id      = string
    enabled = bool
    prefix  = optional(string, "")
    transitions = optional(list(object({
      days          = number
      storage_class = string
    })), [])
    expiration_days                     = optional(number)
    noncurrent_version_expiration_days = optional(number)
  }))
  default = []
}

# =============================================================================
# Access Control
# =============================================================================

variable "create_bucket_policy" {
  description = "Create a bucket policy"
  type        = bool
  default     = true
}

variable "allowed_iam_role_arns" {
  description = "List of IAM role ARNs allowed to access the bucket"
  type        = list(string)
  default     = []
}

variable "create_access_policy" {
  description = "Create an IAM policy for bucket access"
  type        = bool
  default     = true
}

# =============================================================================
# Monitoring
# =============================================================================

variable "create_cloudwatch_alarms" {
  description = "Create CloudWatch alarms for the bucket"
  type        = bool
  default     = false
}

variable "bucket_size_alarm_threshold" {
  description = "Bucket size threshold in bytes for alarm (0 to disable)"
  type        = number
  default     = 0
}

variable "alarm_actions" {
  description = "List of ARNs to notify when alarm triggers"
  type        = list(string)
  default     = []
}

# =============================================================================
# Tags
# =============================================================================

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
