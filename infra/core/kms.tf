resource "aws_kms_key" "api_tx" {
  description             = "api-tx: encrypts Up Bank API keys stored in DynamoDB"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

resource "aws_kms_alias" "api_tx" {
  name          = "alias/api-tx"
  target_key_id = aws_kms_key.api_tx.id
}
