# Run once manually to create Terraform state backend resources.
# After apply, note the outputs and set them as GitHub Actions secrets:
#   TFSTATE_BUCKET  → tfstate_bucket output
#   TFSTATE_DYNAMODB → "api-tx-tflock" (hardcoded)

terraform {
  required_version = ">= 1.9"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = "ap-southeast-2"
}

resource "random_id" "suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "tfstate" {
  bucket = "api-tx-tfstate-${random_id.suffix.hex}"
}

resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket                  = aws_s3_bucket.tfstate.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "tflock" {
  name         = "api-tx-tflock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
}

# S3 bucket for Lambda deployment packages
resource "aws_s3_bucket" "lambda_packages" {
  bucket = "api-tx-lambda-packages-${random_id.suffix.hex}"
}

resource "aws_s3_bucket_versioning" "lambda_packages" {
  bucket = aws_s3_bucket.lambda_packages.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_public_access_block" "lambda_packages" {
  bucket                  = aws_s3_bucket.lambda_packages.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

output "tfstate_bucket" {
  value = aws_s3_bucket.tfstate.id
}

output "tflock_table" {
  value = aws_dynamodb_table.tflock.name
}

output "lambda_packages_bucket" {
  value = aws_s3_bucket.lambda_packages.id
}
