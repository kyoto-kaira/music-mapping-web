# SageMaker実行用IAMロール
resource "aws_iam_role" "sagemaker_execution_role" {
  name = "sagemaker-music-mapping-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "sagemaker.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# SageMaker実行ロールのポリシー
resource "aws_iam_role_policy_attachment" "sagemaker_full_access" {
  role       = aws_iam_role.sagemaker_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}

# CloudWatch Logsへの書き込み権限
resource "aws_iam_role_policy" "sagemaker_logs" {
  name = "sagemaker-logs-policy"
  role = aws_iam_role.sagemaker_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/aws/sagemaker/*"
      }
    ]
  })
}

# API Gateway用IAMロール（SageMakerを呼び出すため）
resource "aws_iam_role" "api_gateway_role" {
  name = "api-gateway-sagemaker-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# API GatewayがSageMakerを呼び出すためのポリシー
resource "aws_iam_role_policy" "api_gateway_sagemaker_policy" {
  name = "api-gateway-sagemaker-policy"
  role = aws_iam_role.api_gateway_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sagemaker:InvokeEndpoint"
        ]
        Resource = "arn:aws:sagemaker:${var.aws_region}:*:endpoint/${var.endpoint_name}"
      }
    ]
  })
}

# API Gateway用CloudWatch Logsロール
resource "aws_iam_role" "api_gateway_cloudwatch_logs_role" {
  name = "api-gateway-cloudwatch-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# API GatewayがCloudWatch Logsに書き込むためのポリシー
resource "aws_iam_role_policy" "api_gateway_cloudwatch_logs_policy" {
  name = "api-gateway-cloudwatch-logs-policy"
  role = aws_iam_role.api_gateway_cloudwatch_logs_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
          "logs:DescribeLogGroups"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:*:log-group:/aws/apigateway/*",
          "arn:aws:logs:${var.aws_region}:*:log-group:/aws/apigateway/${var.api_gateway_name}:*"
        ]
      }
    ]
  })
}

