module "infrastructure" {
  source = "../../"

  environment = "prod"
  aws_region  = "us-east-1"
  domain_name = "autolytiq.com"
}

output "eks_cluster_name" {
  value = module.infrastructure.eks_cluster_name
}

output "eks_cluster_endpoint" {
  value = module.infrastructure.eks_cluster_endpoint
}

output "rds_cluster_endpoint" {
  value = module.infrastructure.rds_cluster_endpoint
}

output "redis_endpoint" {
  value = module.infrastructure.redis_endpoint
}
