# AWSリージョン
aws_region = "ap-northeast-1"

# SageMaker設定
model_name             = "music-mapping-model"
endpoint_config_name   = "music-mapping-endpoint-config"
endpoint_name          = "music-mapping-endpoint"
instance_type          = "ml.t2.medium"
max_instance_count     = 1
initial_instance_count = 1

# ECRコンテナイメージURI（必須: モデルを含むECRイメージ）
image_uri = "209266688699.dkr.ecr.ap-northeast-1.amazonaws.com/music-mapping-api:latest"

# API Gateway設定
api_gateway_name  = "music-mapping-api"
api_gateway_stage = "prod"

# タグ
tags = {
  Project     = "music-mapping"
  Environment = "production"
  ManagedBy   = "terraform"
}
