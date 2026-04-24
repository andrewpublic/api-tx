terraform {
  required_version = ">= 1.9"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project   = "api-tx"
      ManagedBy = "Terraform"
      Module    = "api"
    }
  }
}

data "terraform_remote_state" "core" {
  backend = "s3"
  config = {
    bucket = var.tfstate_bucket
    key    = "api-tx/core.tfstate"
    region = var.aws_region
  }
}
