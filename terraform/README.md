# API Gateway + SageMaker リアルタイム推論 (Scale Down to Zero) のTerraform構成

このディレクトリには、API GatewayとSageMakerリアルタイム推論エンドポイントを構築するTerraformコードが含まれています。SageMakerエンドポイントはScale Down to Zero機能に対応しており、トラフィックがない時はインスタンス数を0にスケールダウンしてコストを削減できます。

## 📋 構成内容

### リソース

1. **IAMロール**
   - SageMaker実行ロール（モデル推論実行用）
   - API Gatewayロール（SageMaker呼び出し用）

2. **SageMaker**
   - Model: 機械学習モデル
   - Endpoint Configuration: Scale Down to Zero対応の設定（MinInstanceCount = 0）
   - Endpoint: リアルタイム推論エンドポイント

3. **API Gateway**
   - REST API
   - SageMaker統合
   - APIキー認証（Webアプリ専用）
   - 使用量プラン（レート制限・クォータ設定）
   - CORS対応（OPTIONSメソッド）
   - CloudWatch Logs統合

## 🚀 デプロイ方法

### 前提条件

- AWS CLIがインストールされ、認証情報が設定されている
- Terraform 1.0以上がインストールされている
- 適切なAWS権限を持っている

### 1. 変数の設定

`terraform.tfvars` ファイルを作成して変数を設定します：

```hcl
aws_region           = "ap-northeast-1"
model_name           = "music-mapping-model"
endpoint_name        = "music-mapping-endpoint"
instance_type        = "ml.m5.large"
max_instance_count   = 3
initial_instance_count = 1
api_gateway_name     = "music-mapping-api"

# ECRコンテナイメージURI（必須: モデルを含むECRイメージ）
image_uri = "your-account.dkr.ecr.ap-northeast-1.amazonaws.com/music-mapping-model:latest"
```

**重要**: モデルはECRにプッシュされたコンテナイメージ内に含まれている必要があります。S3からのモデルデータのダウンロードはサポートされていません。

### 2. Terraformの実行

```bash
# Terraformの初期化
terraform init

# 実行計画の確認
terraform plan

# リソースの作成
terraform apply
```

## 📝 重要な注意事項

### Scale Down to Zeroについて

- **MinInstanceCount = 0** に設定されているため、トラフィックがない時はインスタンスが0になります
- エンドポイントが0にスケールダウンしている場合、**リクエストは失敗**します
- インスタンスが起動するまでに時間がかかるため（数分）、開発・テスト用途や失敗してもリカバリ可能なシステムに適しています

### ベストプラクティス

参考記事（[AWS re:Invent 2024](https://dev.classmethod.jp/articles/amazon-sagemaker-inference-scale-down-to-zero-feature/)）によると：

1. **SQSキューイング**: リクエスト失敗時のために、前段にSQSを置いてキューイングすることを推奨
2. **適切なユースケース**: 
   - 開発・テスト環境
   - トラフィックが予測できるユースケース
   - 失敗してもリカバリできるシステム

### パフォーマンス設定

- `container_startup_health_check_timeout_in_seconds`: コンテナ起動のヘルスチェックタイムアウト（デフォルト: 3600秒）

大規模なモデルや起動時間が長いコンテナを使用する場合、この値を調整してください。

## 🔧 カスタマイズ

### インスタンスタイプの変更

GPUインスタンスを使用する場合：

```hcl
instance_type = "ml.g5.xlarge"  # 例
```

### 最大インスタンス数の調整

```hcl
max_instance_count = 5  # 例
```

### リージョンの変更

```hcl
aws_region = "us-east-1"  # 例
```

## 🔐 APIキー認証

API GatewayにはAPIキー認証が設定されています。すべてのリクエストには有効なAPIキーが必要です。

### APIキーの取得

デプロイ後、以下のコマンドでAPIキーを取得できます：

```bash
terraform output -raw api_key_value
```

このAPIキーをコピーして、Webアプリの環境変数に設定してください。

### 使用量プラン

以下の制限が設定されています：

- **レート制限**: 10リクエスト/秒
- **バースト制限**: 20リクエスト
- **月間クォータ**: 10,000リクエスト/月

必要に応じて `api_gateway.tf` の `throttle_settings` と `quota_settings` を調整してください。

## 📊 出力値

デプロイ後、以下の出力値が利用可能です：

- `sagemaker_endpoint_name`: SageMakerエンドポイント名
- `sagemaker_endpoint_arn`: SageMakerエンドポイントARN
- `api_gateway_url`: API GatewayエンドポイントURL
- `api_gateway_id`: API Gateway ID
- `sagemaker_execution_role_arn`: SageMaker実行ロールARN
- `api_gateway_role_arn`: API GatewayロールARN
- `api_key_value`: APIキーの値（機密情報）
- `api_key_id`: APIキーID

出力値を確認するには：

```bash
terraform output
```

## 🧪 APIの使用例

デプロイ後、以下のようにAPIを呼び出せます：

```bash
# API Gateway URLとAPIキーを取得
API_URL=$(terraform output -raw api_gateway_url)
API_KEY=$(terraform output -raw api_key_value)

# 推論リクエストの送信（APIキーをヘッダーに追加）
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "xAxis": "明るい-暗い",
    "yAxis": "激しい-穏やか",
    "songs": [
      {
        "id": "1",
        "title": "Song Title",
        "artist": "Artist Name"
      }
    ]
  }'
```

**重要**: APIキーは `x-api-key` ヘッダーに設定してください。

## 🗑️ リソースの削除

```bash
terraform destroy
```

## 📚 参考リンク

- [AWS SageMaker Scale Down to Zero機能](https://dev.classmethod.jp/articles/amazon-sagemaker-inference-scale-down-to-zero-feature/)
- [AWS SageMaker推論エンドポイント](https://docs.aws.amazon.com/sagemaker/latest/dg/realtime-endpoints.html)
- [API Gateway統合](https://docs.aws.amazon.com/apigateway/latest/developerguide/integrating-api-with-aws-services-sagemaker.html)

