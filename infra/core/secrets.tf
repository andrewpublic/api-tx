# Secrets are created empty — populate manually after first apply:
#   aws secretsmanager put-secret-value --secret-id api-tx/deepseek \
#     --secret-string '{"apiKey":"your-deepseek-key"}'
#
#   aws secretsmanager put-secret-value --secret-id api-tx/twilio \
#     --secret-string '{"accountSid":"AC...","authToken":"...","fromNumber":"+61..."}'
#
#   aws secretsmanager put-secret-value --secret-id api-tx/google-sheets \
#     --secret-string "$(cat /path/to/service-account.json)"

resource "aws_secretsmanager_secret" "deepseek" {
  name                    = "api-tx/deepseek"
  description             = "DeepSeek API key"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret" "twilio" {
  name                    = "api-tx/twilio"
  description             = "Twilio SMS credentials (accountSid, authToken, fromNumber)"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret" "google_sheets" {
  name                    = "api-tx/google-sheets"
  description             = "Google service account JSON for Sheets API"
  recovery_window_in_days = 7
}
