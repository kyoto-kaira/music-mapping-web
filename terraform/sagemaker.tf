# SageMaker Model
resource "aws_sagemaker_model" "music_mapping_model" {
  name               = var.model_name
  execution_role_arn = aws_iam_role.sagemaker_execution_role.arn

  primary_container {
    # ECRにプッシュされたコンテナイメージ（モデルを含む）
    image = var.image_uri
  }

  tags = var.tags
}

# SageMaker Endpoint Configuration (Scale Down to Zero対応)
resource "aws_sagemaker_endpoint_configuration" "music_mapping_endpoint_config" {
  name = var.endpoint_config_name

  production_variants {
    variant_name           = "AllTraffic"
    model_name             = aws_sagemaker_model.music_mapping_model.name
    instance_type          = var.instance_type
    initial_instance_count = var.initial_instance_count

    # Scale Down to Zero設定
    managed_instance_scaling {
      status             = "ENABLED"
      min_instance_count = 0 # 0までスケールダウン可能
      max_instance_count = var.max_instance_count
    }

    # コンテナ起動のヘルスチェックタイムアウト（秒）
    container_startup_health_check_timeout_in_seconds = 1200

    # ルーティング設定
    routing_config {
      routing_strategy = "LEAST_OUTSTANDING_REQUESTS"
    }
  }

  tags = var.tags
}

# SageMaker Endpoint
resource "aws_sagemaker_endpoint" "music_mapping_endpoint" {
  name                 = var.endpoint_name
  endpoint_config_name = aws_sagemaker_endpoint_configuration.music_mapping_endpoint_config.name

  tags = var.tags
}
