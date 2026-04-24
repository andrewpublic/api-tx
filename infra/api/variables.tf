variable "aws_region" {
  default = "ap-southeast-2"
}

variable "tfstate_bucket" {
  description = "S3 bucket holding Terraform state (from bootstrap)"
}

variable "spreadsheet_id" {
  description = "Google Sheets spreadsheet ID for the Budget workbook"
  default     = "10KMC3jk1lcQAGNIk3ejS3qdsCohZi9VmHpXYu1cBZmQ"
}
