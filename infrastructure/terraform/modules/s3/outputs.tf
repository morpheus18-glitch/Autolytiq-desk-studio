# =============================================================================
# S3 Module Outputs
# =============================================================================

output "bucket_id" {
  description = "ID of the S3 bucket"
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.this.arn
}

output "bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.this.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  value       = aws_s3_bucket.this.bucket_regional_domain_name
}

output "bucket_region" {
  description = "AWS region where the bucket is located"
  value       = aws_s3_bucket.this.region
}

output "access_policy_arn" {
  description = "ARN of the IAM policy for bucket access"
  value       = var.create_access_policy ? aws_iam_policy.bucket_access[0].arn : null
}

output "access_policy_name" {
  description = "Name of the IAM policy for bucket access"
  value       = var.create_access_policy ? aws_iam_policy.bucket_access[0].name : null
}
