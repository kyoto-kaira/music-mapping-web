variable "aws_region" {
  description = "AWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "model_name" {
  description = "SageMakerモデル名"
  type        = string
  default     = "music-mapping-model"
}

variable "endpoint_config_name" {
  description = "SageMakerエンドポイント設定名"
  type        = string
  default     = "music-mapping-endpoint-config"
}

variable "endpoint_name" {
  description = "SageMakerエンドポイント名"
  type        = string
  default     = "music-mapping-endpoint"
}

variable "instance_type" {
  description = "SageMakerインスタンスタイプ"
  type        = string
  default     = "ml.m5.large"
}

variable "max_instance_count" {
  description = "最大インスタンス数"
  type        = number
  default     = 3
}

variable "initial_instance_count" {
  description = "初期インスタンス数"
  type        = number
  default     = 1
}

variable "image_uri" {
  description = "ECRコンテナイメージURI (必須: モデルを含むECRイメージ)"
  type        = string
}

variable "api_gateway_name" {
  description = "API Gateway名"
  type        = string
  default     = "music-mapping-api"
}

variable "api_gateway_stage" {
  description = "API Gatewayステージ名"
  type        = string
  default     = "prod"
}

variable "tags" {
  description = "リソースに追加するタグ"
  type        = map(string)
  default = {
    Project     = "music-mapping"
    Environment = "production"
  }
}

