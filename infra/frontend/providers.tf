terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {}

  default_tags {
    tags = {
      CreatedBy = "Terraform"
    }
  }
}

provider "aws" {
  region = "ap-southeast-2"
}

