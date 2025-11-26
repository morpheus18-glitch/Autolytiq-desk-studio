# Terraform Modules

This directory contains reusable Terraform modules for Autolytiq infrastructure.

## Available Modules

### elasticache

Creates an ElastiCache Redis cluster with:

- Encryption at rest and in transit
- Multi-AZ support for production
- Automatic failover
- CloudWatch alarms
- Secrets Manager integration

**Usage:**

```hcl
module "redis" {
  source = "./modules/elasticache"

  project_name = "autolytiq"
  environment  = "prod"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  allowed_security_group_ids = [module.eks.cluster_security_group_id]

  node_type          = "cache.r5.large"
  num_cache_clusters = 3
  multi_az_enabled   = true

  tags = local.tags
}
```

### s3

Creates an S3 bucket with:

- Server-side encryption (SSE-S3 or SSE-KMS)
- Versioning support
- Lifecycle policies
- CORS configuration for direct uploads
- IAM policies for access control

**Usage:**

```hcl
module "assets_bucket" {
  source = "./modules/s3"

  project_name  = "autolytiq"
  environment   = "prod"
  bucket_suffix = "assets"

  versioning_enabled = true

  cors_allowed_origins = ["https://app.autolytiq.com"]
  cors_allowed_methods = ["GET", "PUT", "POST"]

  lifecycle_rules = [
    {
      id      = "archive-old-files"
      enabled = true
      transitions = [
        {
          days          = 90
          storage_class = "STANDARD_IA"
        },
        {
          days          = 365
          storage_class = "GLACIER"
        }
      ]
    }
  ]

  tags = local.tags
}
```

### iam

Creates IAM roles for Kubernetes service accounts using IRSA:

- API Gateway role
- Backend services role (shared)
- Email service role
- External Secrets Operator role

**Usage:**

```hcl
module "iam" {
  source = "./modules/iam"

  project_name      = "autolytiq"
  environment       = "prod"
  oidc_provider_arn = module.eks.oidc_provider_arn
  namespace         = "autolytiq"

  s3_bucket_arn   = module.assets_bucket.bucket_arn
  enable_ses_access = false

  tags = local.tags
}
```

## Module Structure

Each module follows a consistent structure:

```
modules/
  <module-name>/
    main.tf       # Main resource definitions
    variables.tf  # Input variables
    outputs.tf    # Output values
```

## Best Practices

1. **Version Pinning**: Always pin module versions in production:

   ```hcl
   module "redis" {
     source  = "./modules/elasticache"
     # Pin to specific commit if using git source
   }
   ```

2. **Environment-Specific Variables**: Use separate tfvars files:

   ```bash
   terraform apply -var-file="environments/prod.tfvars"
   ```

3. **State Management**: Use remote state with locking:

   ```hcl
   backend "s3" {
     bucket         = "autolytiq-terraform-state"
     key            = "infrastructure/terraform.tfstate"
     region         = "us-east-1"
     encrypt        = true
     dynamodb_table = "autolytiq-terraform-lock"
   }
   ```

4. **Tagging**: Always pass consistent tags:
   ```hcl
   tags = {
     Project     = "autolytiq"
     Environment = var.environment
     ManagedBy   = "terraform"
   }
   ```

## Adding New Modules

When creating a new module:

1. Create a new directory under `modules/`
2. Include `main.tf`, `variables.tf`, and `outputs.tf`
3. Add validation to variables where appropriate
4. Document all inputs and outputs
5. Add usage examples to this README
