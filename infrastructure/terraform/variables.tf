variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "autolytiq.com"
}

variable "eks_node_instance_types" {
  description = "Instance types for EKS node groups"
  type        = map(list(string))
  default = {
    general  = ["t3.medium", "t3.large"]
    database = ["r5.large", "r5.xlarge"]
  }
}

variable "eks_node_desired_size" {
  description = "Desired number of nodes"
  type        = map(number)
  default = {
    dev     = 2
    staging = 3
    prod    = 5
  }
}

variable "eks_node_min_size" {
  description = "Minimum number of nodes"
  type        = map(number)
  default = {
    dev     = 1
    staging = 2
    prod    = 3
  }
}

variable "eks_node_max_size" {
  description = "Maximum number of nodes"
  type        = map(number)
  default = {
    dev     = 5
    staging = 8
    prod    = 15
  }
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = map(string)
  default = {
    dev     = "db.t3.micro"
    staging = "db.t3.small"
    prod    = "db.r5.large"
  }
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = map(string)
  default = {
    dev     = "cache.t3.micro"
    staging = "cache.t3.small"
    prod    = "cache.r5.large"
  }
}

# -----------------------------------------------------------------------------
# Backup and Disaster Recovery Variables
# -----------------------------------------------------------------------------
variable "dr_region" {
  description = "Disaster recovery region for cross-region replication"
  type        = string
  default     = "us-west-2"
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = map(number)
  default = {
    dev     = 7
    staging = 14
    prod    = 35
  }
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for databases"
  type        = bool
  default     = true
}

variable "backup_window" {
  description = "Preferred backup window (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Preferred maintenance window (UTC)"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "alert_email" {
  description = "Email address for backup alerts"
  type        = string
  default     = ""
}

variable "enable_cross_region_backup" {
  description = "Enable cross-region backup replication"
  type        = map(bool)
  default = {
    dev     = false
    staging = false
    prod    = true
  }
}
