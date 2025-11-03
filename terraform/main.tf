terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # 状態ファイルの保存先（オプション: S3バックエンドを使用する場合）
  backend "s3" {
    bucket = "nf2025-terraform-state-bucket"
    key    = "music-mapping/terraform.tfstate"
    region = "ap-northeast-1"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.tags
  }
}

