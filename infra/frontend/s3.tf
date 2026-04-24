locals {
  frontend_static_path = "../../frontend/build"
}

resource "aws_s3_bucket" "frontend" {
  bucket = "api-tx-frontend-${data.aws_caller_identity.current.account_id}"
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

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }

  routing_rule {
    condition {
      key_prefix_equals = "docs/"
    }
    redirect {
      replace_key_prefix_with = "documents/"
    }
  }
}
