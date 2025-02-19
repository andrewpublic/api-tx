resource "aws_cloudfront_distribution" "frontend" {
  enabled = true

  origin {
    origin_id   = "${var.frontend_bucket_name}-origin"
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_procotols   = ["TLSv1"]
    }
  }
}

