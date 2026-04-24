resource "aws_sqs_queue" "enrich_dlq" {
  name                      = "api-tx-enrich-dlq"
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_sqs_queue" "enrich" {
  name                       = "api-tx-enrich"
  visibility_timeout_seconds = 60
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.enrich_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "sheets_dlq" {
  name                      = "api-tx-sheets-dlq"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "sheets" {
  name                       = "api-tx-sheets"
  visibility_timeout_seconds = 60
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.sheets_dlq.arn
    maxReceiveCount     = 3
  })
}
