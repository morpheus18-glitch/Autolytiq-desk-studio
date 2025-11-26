# =============================================================================
# IAM Module Outputs
# =============================================================================

output "api_gateway_role_arn" {
  description = "ARN of the IAM role for API Gateway service account"
  value       = aws_iam_role.api_gateway.arn
}

output "api_gateway_role_name" {
  description = "Name of the IAM role for API Gateway"
  value       = aws_iam_role.api_gateway.name
}

output "backend_services_role_arn" {
  description = "ARN of the IAM role for backend services"
  value       = aws_iam_role.backend_services.arn
}

output "backend_services_role_name" {
  description = "Name of the IAM role for backend services"
  value       = aws_iam_role.backend_services.name
}

output "email_service_role_arn" {
  description = "ARN of the IAM role for email service"
  value       = aws_iam_role.email_service.arn
}

output "email_service_role_name" {
  description = "Name of the IAM role for email service"
  value       = aws_iam_role.email_service.name
}

output "external_secrets_role_arn" {
  description = "ARN of the IAM role for External Secrets Operator"
  value       = aws_iam_role.external_secrets.arn
}

output "external_secrets_role_name" {
  description = "Name of the IAM role for External Secrets Operator"
  value       = aws_iam_role.external_secrets.name
}
