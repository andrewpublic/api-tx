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

resource "aws_s3_bucket_policy" "frontend_cloudfront" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    "Version" : "2008-10-17",
    "Id" : "PolicyForCloudFrontPrivateContent",
    "Statement" : [
      {
        "Sid" : "AllowCloudFrontServicePrincipal",
        "Effect" : "Allow",
        "Principal" : {
          "Service" : "cloudfront.amazonaws.com"
        },
        "Action" : "s3:GetObject",
        "Resource" : "${aws_s3_bucket.frontend.arn}/*",
        "Condition" : {
          "StringEquals" : {
            "AWS:SourceArn" : aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}

