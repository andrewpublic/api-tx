locals {
  frontend_static_path = "../../frontend/build"
}

resource "aws_s3_bucket" "frontend" {
  bucket = var.frontend_bucket_name
}

resource "aws_s3_object" "frontend" {
  for_each = fileset(local.frontend_static_path, "**")

  bucket = aws_s3_bucket.frontend.id
  key    = each.key
  source = "${local.frontend_static_path}/${each.value}"
  etag   = filemd5("${local.frontend_static_path}/${each.value}")
}

