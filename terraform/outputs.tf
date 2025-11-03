output "sagemaker_endpoint_name" {
  description = "SageMakerエンドポイント名"
  value       = aws_sagemaker_endpoint.music_mapping_endpoint.name
}

output "sagemaker_endpoint_arn" {
  description = "SageMakerエンドポイントARN"
  value       = aws_sagemaker_endpoint.music_mapping_endpoint.arn
}

output "api_gateway_url" {
  description = "API GatewayエンドポイントURL"
  value       = "${aws_api_gateway_stage.prod.invoke_url}/${aws_api_gateway_resource.inference.path_part}"
}

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = aws_api_gateway_rest_api.music_mapping_api.id
}

output "sagemaker_execution_role_arn" {
  description = "SageMaker実行ロールARN"
  value       = aws_iam_role.sagemaker_execution_role.arn
}

output "api_gateway_role_arn" {
  description = "API GatewayロールARN"
  value       = aws_iam_role.api_gateway_role.arn
}

output "api_key_value" {
  description = "APIキーの値（この値をコピーしてWebアプリの環境変数に設定してください）"
  value       = aws_api_gateway_api_key.web_app_key.value
  sensitive   = true
}

output "api_key_id" {
  description = "APIキーID"
  value       = aws_api_gateway_api_key.web_app_key.id
}
