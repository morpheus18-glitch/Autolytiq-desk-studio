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
