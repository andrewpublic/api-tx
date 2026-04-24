resource "aws_dynamodb_table" "users" {
  name         = "api-tx-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  point_in_time_recovery { enabled = true }
}

resource "aws_dynamodb_table" "transactions" {
  name         = "api-tx-transactions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "transactionId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "transactionId"
    type = "S"
  }

  attribute {
    name = "settledAt"
    type = "S"
  }

  # For monthly spend queries (enrich lambda budget check)
  global_secondary_index {
    name            = "userId-settledAt-index"
    hash_key        = "userId"
    range_key       = "settledAt"
    projection_type = "ALL"
  }

  point_in_time_recovery { enabled = true }
}
