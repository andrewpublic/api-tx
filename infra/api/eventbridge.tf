resource "aws_cloudwatch_event_rule" "hourly_fetch" {
  name                = "api-tx-hourly-fetch"
  description         = "Trigger Up Bank transaction fetch every 1 minute"
  schedule_expression = "rate(1 minute)"
}

resource "aws_cloudwatch_event_target" "fetch_lambda" {
  rule      = aws_cloudwatch_event_rule.hourly_fetch.name
  target_id = "FetchLambda"
  arn       = aws_lambda_function.fetch.arn
}

resource "aws_lambda_permission" "eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.fetch.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.hourly_fetch.arn
}
