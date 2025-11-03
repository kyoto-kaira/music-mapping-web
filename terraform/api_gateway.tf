# API Gateway REST API
resource "aws_api_gateway_rest_api" "music_mapping_api" {
  name        = var.api_gateway_name
  description = "Music Mapping API with SageMaker Integration"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = var.tags
}

# API Gatewayアカウント設定（CloudWatch Logsロールの設定）
resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch_logs_role.arn
}

# API Gateway Resource (推論エンドポイント)
resource "aws_api_gateway_resource" "inference" {
  rest_api_id = aws_api_gateway_rest_api.music_mapping_api.id
  parent_id   = aws_api_gateway_rest_api.music_mapping_api.root_resource_id
  path_part   = "invoke"
}

# API Gateway Method (POST)
resource "aws_api_gateway_method" "invoke" {
  rest_api_id      = aws_api_gateway_rest_api.music_mapping_api.id
  resource_id      = aws_api_gateway_resource.inference.id
  http_method      = "POST"
  authorization    = "NONE"
  api_key_required = true
}

# API Gateway Method Settings (リクエストボディサイズなど)
resource "aws_api_gateway_method_settings" "invoke_settings" {
  rest_api_id = aws_api_gateway_rest_api.music_mapping_api.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "${aws_api_gateway_resource.inference.path_part}/${aws_api_gateway_method.invoke.http_method}"

  settings {
    metrics_enabled = true
    logging_level   = "INFO"
  }
}

# API Gateway Integration (SageMaker)
resource "aws_api_gateway_integration" "sagemaker" {
  rest_api_id             = aws_api_gateway_rest_api.music_mapping_api.id
  resource_id             = aws_api_gateway_resource.inference.id
  http_method             = aws_api_gateway_method.invoke.http_method
  type                    = "AWS"
  integration_http_method = "POST"
  uri                     = "arn:aws:apigateway:${var.aws_region}:runtime.sagemaker:path/endpoints/${aws_sagemaker_endpoint.music_mapping_endpoint.name}/invocations"
  credentials             = aws_iam_role.api_gateway_role.arn

  # リクエストボディをそのままSageMakerに転送
  passthrough_behavior = "WHEN_NO_MATCH"

  # 統合リクエストパラメータ
  request_parameters = {
    "integration.request.header.Content-Type" = "'application/json'"
  }
}

# API Gateway Method Response
resource "aws_api_gateway_method_response" "invoke_200" {
  rest_api_id = aws_api_gateway_rest_api.music_mapping_api.id
  resource_id = aws_api_gateway_resource.inference.id
  http_method = aws_api_gateway_method.invoke.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

# API Gateway Integration Response
resource "aws_api_gateway_integration_response" "sagemaker_200" {
  rest_api_id = aws_api_gateway_rest_api.music_mapping_api.id
  resource_id = aws_api_gateway_resource.inference.id
  http_method = aws_api_gateway_method.invoke.http_method
  status_code = aws_api_gateway_method_response.invoke_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }

  depends_on = [aws_api_gateway_integration.sagemaker]
}

# OPTIONSメソッド（CORS対応）
resource "aws_api_gateway_method" "options" {
  rest_api_id   = aws_api_gateway_rest_api.music_mapping_api.id
  resource_id   = aws_api_gateway_resource.inference.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options" {
  rest_api_id = aws_api_gateway_rest_api.music_mapping_api.id
  resource_id = aws_api_gateway_resource.inference.id
  http_method = aws_api_gateway_method.options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_200" {
  rest_api_id = aws_api_gateway_rest_api.music_mapping_api.id
  resource_id = aws_api_gateway_resource.inference.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "options" {
  rest_api_id = aws_api_gateway_rest_api.music_mapping_api.id
  resource_id = aws_api_gateway_resource.inference.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = aws_api_gateway_method_response.options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.options]
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "prod" {
  depends_on = [
    aws_api_gateway_integration.sagemaker,
    aws_api_gateway_integration.options,
    aws_api_gateway_method_response.invoke_200,
    aws_api_gateway_method_response.options_200,
  ]

  rest_api_id = aws_api_gateway_rest_api.music_mapping_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.inference.id,
      aws_api_gateway_method.invoke.id,
      aws_api_gateway_method.options.id,
      aws_api_gateway_integration.sagemaker.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.prod.id
  rest_api_id   = aws_api_gateway_rest_api.music_mapping_api.id
  stage_name    = var.api_gateway_stage

  # CloudWatch Logs設定
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }

  depends_on = [aws_api_gateway_account.main]

  tags = var.tags
}

# CloudWatch Logs for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.api_gateway_name}"
  retention_in_days = 7

  tags = var.tags
}

# API Key
resource "aws_api_gateway_api_key" "web_app_key" {
  name        = "${var.api_gateway_name}-web-app-key"
  description = "API Key for Web Application"
  enabled     = true

  tags = var.tags
}

# Usage Plan
resource "aws_api_gateway_usage_plan" "web_app_plan" {
  name        = "${var.api_gateway_name}-web-app-plan"
  description = "Usage plan for Web Application"

  api_stages {
    api_id = aws_api_gateway_rest_api.music_mapping_api.id
    stage  = aws_api_gateway_stage.prod.stage_name
  }

  throttle_settings {
    burst_limit = 20
    rate_limit  = 10
  }

  quota_settings {
    limit  = 10000
    period = "MONTH"
  }

  tags = var.tags
}

# API KeyとUsage Planの関連付け
resource "aws_api_gateway_usage_plan_key" "web_app_key" {
  key_id        = aws_api_gateway_api_key.web_app_key.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.web_app_plan.id
}

