locals {
  s3_origin_id = "${var.frontend_bucket_name}-origin"
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.s3_origin_id}-oac"
  description                       = "Origin Access Control for S3 Cloudfront"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# resource "aws_cloudfront_response_headers_policy" "frontend_js" {
#   name = "frontend-js-mime"
# 
#   custom_headers_config {
#     items {
#       header = "Content-Type"
#       override = true
#       value = "application/javascript"
#     }
#   }
# }

resource "aws_cloudfront_response_headers_policy" "frontend_html" {
  name = "frontend-html-mime"

  custom_headers_config {
    items {
      header   = "Content-Type"
      override = true
      value    = "application/html"
    }
  }
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    #custom_origin_config {
    #  http_port              = 80
    #  https_port             = 443
    #  origin_protocol_policy = "http-only"
    #  origin_ssl_protocols   = ["TLSv1"]
    #}
  }

  ordered_cache_behavior {
    path_pattern           = "*.html"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    target_origin_id       = local.s3_origin_id
  }

  default_cache_behavior {
    target_origin_id = local.s3_origin_id
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]

    forwarded_values {
      query_string = true

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

