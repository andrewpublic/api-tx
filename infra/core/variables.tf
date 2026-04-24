variable "aws_region" {
  default = "ap-southeast-2"
}

variable "lambda_packages_bucket" {
  description = "S3 bucket for Lambda deployment packages (from bootstrap output)"
}
