# =============================================================================
# ElastiCache Module Variables
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

# =============================================================================
# Networking
# =============================================================================

variable "vpc_id" {
  description = "VPC ID where Redis cluster will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the Redis cluster"
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "List of security group IDs allowed to access Redis"
  type        = list(string)
  default     = []
}

variable "allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to access Redis"
  type        = list(string)
  default     = []
}

# =============================================================================
# Cluster Configuration
# =============================================================================

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "num_cache_clusters" {
  description = "Number of cache clusters (nodes)"
  type        = number
  default     = 1

  validation {
    condition     = var.num_cache_clusters >= 1 && var.num_cache_clusters <= 6
    error_message = "Number of cache clusters must be between 1 and 6."
  }
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

# =============================================================================
# Parameter Group Configuration
# =============================================================================

variable "maxmemory_policy" {
  description = "How Redis handles keys when memory is full"
  type        = string
  default     = "volatile-lru"

  validation {
    condition = contains([
      "volatile-lru",
      "allkeys-lru",
      "volatile-lfu",
      "allkeys-lfu",
      "volatile-random",
      "allkeys-random",
      "volatile-ttl",
      "noeviction"
    ], var.maxmemory_policy)
    error_message = "Invalid maxmemory policy."
  }
}

variable "connection_timeout" {
  description = "Connection timeout in seconds (0 = no timeout)"
  type        = string
  default     = "0"
}

# =============================================================================
# Maintenance
# =============================================================================

variable "snapshot_retention_limit" {
  description = "Number of days to retain automatic snapshots"
  type        = number
  default     = 7
}

variable "snapshot_window" {
  description = "Daily time range for snapshots (UTC)"
  type        = string
  default     = "03:00-05:00"
}

variable "maintenance_window" {
  description = "Weekly time range for maintenance (UTC)"
  type        = string
  default     = "sun:05:00-sun:06:00"
}

variable "apply_immediately" {
  description = "Apply changes immediately (true) or during maintenance window (false)"
  type        = bool
  default     = false
}

# =============================================================================
# Monitoring
# =============================================================================

variable "sns_topic_arn" {
  description = "SNS topic ARN for notifications"
  type        = string
  default     = null
}

variable "create_cloudwatch_alarms" {
  description = "Create CloudWatch alarms for the cluster"
  type        = bool
  default     = true
}

variable "alarm_actions" {
  description = "List of ARNs to notify when alarm triggers"
  type        = list(string)
  default     = []
}

variable "ok_actions" {
  description = "List of ARNs to notify when alarm returns to OK"
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
