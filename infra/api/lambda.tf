locals {
  core = data.terraform_remote_state.core.outputs
}

# ── Fetch Lambda ──────────────────────────────────────────────────────────────

resource "aws_lambda_function" "fetch" {
  function_name = "api-tx-fetch"
  role          = local.core.fetch_role_arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 900
  memory_size   = 512

  s3_bucket = local.core.lambda_packages_bucket
  s3_key    = "fetch.zip"
  # Code updates handled by aws lambda update-function-code in CI/CD

  environment {
    variables = {
      USERS_TABLE        = local.core.users_table_name
      TRANSACTIONS_TABLE = local.core.transactions_table_name
      ENRICH_QUEUE_URL   = local.core.enrich_queue_url
      RAW_BUCKET         = local.core.raw_bucket_name
    }
  }
}

# ── Enrich Lambda ─────────────────────────────────────────────────────────────

resource "aws_lambda_function" "enrich" {
  function_name = "api-tx-enrich"
  role          = local.core.enrich_role_arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256

  s3_bucket = local.core.lambda_packages_bucket
  s3_key    = "enrich.zip"
  # Code updates handled by aws lambda update-function-code in CI/CD

  environment {
    variables = {
      TRANSACTIONS_TABLE  = local.core.transactions_table_name
      USERS_TABLE         = local.core.users_table_name
      SHEETS_QUEUE_URL    = local.core.sheets_queue_url
      DEEPSEEK_SECRET_ARN = local.core.deepseek_secret_arn
      TWILIO_SECRET_ARN   = local.core.twilio_secret_arn
    }
  }
}

resource "aws_lambda_event_source_mapping" "enrich_sqs" {
  event_source_arn                   = local.core.enrich_queue_arn
  function_name                      = aws_lambda_function.enrich.arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 30
}

# ── Sheets-Sync Lambda ────────────────────────────────────────────────────────

resource "aws_lambda_function" "sheets" {
  function_name = "api-tx-sheets-sync"
  role          = local.core.sheets_role_arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 60
  memory_size   = 256

  s3_bucket = local.core.lambda_packages_bucket
  s3_key    = "sheets-sync.zip"
  # Code updates handled by aws lambda update-function-code in CI/CD

  environment {
    variables = {
      TRANSACTIONS_TABLE = local.core.transactions_table_name
      SHEETS_SECRET_ARN  = local.core.google_sheets_secret_arn
      SPREADSHEET_ID     = var.spreadsheet_id
    }
  }
}

resource "aws_lambda_event_source_mapping" "sheets_sqs" {
  event_source_arn                   = local.core.sheets_queue_arn
  function_name                      = aws_lambda_function.sheets.arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 30
}

# ── API Lambda ────────────────────────────────────────────────────────────────

resource "aws_lambda_function" "api" {
  function_name = "api-tx-api"
  role          = local.core.api_role_arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256

  s3_bucket = local.core.lambda_packages_bucket
  s3_key    = "api.zip"
  # Code updates handled by aws lambda update-function-code in CI/CD

  environment {
    variables = {
      USERS_TABLE        = local.core.users_table_name
      TRANSACTIONS_TABLE = local.core.transactions_table_name
      KMS_KEY_ID         = local.core.kms_key_id
      FETCH_LAMBDA_ARN   = aws_lambda_function.fetch.arn
    }
  }
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
