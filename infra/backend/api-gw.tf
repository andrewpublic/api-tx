resource "aws_api_gateway_rest_api" "api_tx" {
    name = "api-tx"
    body = file("${path.module}/openapi.json")
}

