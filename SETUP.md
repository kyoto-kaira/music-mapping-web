# 🚀 セットアップガイド

このガイドでは、Music Mappingアプリを最初から最後までセットアップする手順を説明します。

## 📋 目次

1. [前提条件の確認](#前提条件の確認)
2. [Supabaseのセットアップ](#supabaseのセットアップ)
3. [AWS SageMaker/API Gatewayのセットアップ](#aws-sagemakerapi-gatewayのセットアップ)
4. [ローカル開発環境のセットアップ](#ローカル開発環境のセットアップ)
5. [Vercelへのデプロイ](#vercelへのデプロイ)
6. [トラブルシューティング](#トラブルシューティング)

---

## 1. 前提条件の確認

以下がインストールされていることを確認してください：

- **Node.js** (v18以上)
- **npm** または **yarn**
- **Git**
- **AWSアカウント**（SageMakerエンドポイントとAPI Gatewayがデプロイ済みであること、または`terraform/`ディレクトリからデプロイ可能であること）

バージョン確認:
```bash
node --version  # v18.0.0 以上
npm --version   # 9.0.0 以上
git --version
```

---

## 2. Supabaseのセットアップ

#### ステップ1: プロジェクト作成

1. [Supabase](https://supabase.com) にアクセス
2. 「New Project」をクリック
3. 以下を入力:
   - **Name**: music-mapping（任意）
   - **Database Password**: 強力なパスワードを生成
   - **Region**: 最寄りのリージョンを選択
4. 「Create new project」をクリック（数分かかります）

#### ステップ2: APIキーの取得

1. プロジェクトダッシュボードで「Settings」→「API」に移動
2. 以下をメモ:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGci...`

#### ステップ3: データベーススキーマの作成

1. ダッシュボードで「SQL Editor」に移動
2. 「New query」をクリック
3. プロジェクトの `supabase/schema.sql` の内容をコピー&ペースト
4. 「Run」をクリック

確認方法:
- 「Table Editor」で `maps` と `songs` テーブルが作成されていることを確認

---

## 3. AWS SageMaker/API Gatewayのセットアップ

#### ステップ1: Terraformを使用したインフラのデプロイ

1. `terraform/` ディレクトリに移動
2. Terraform設定ファイルを確認
3. `terraform.tfvars` に必要な変数を設定
4. 以下を実行:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

#### ステップ2: API Gatewayの情報を取得

Terraformのoutputから必要な情報を取得:

```bash
# API Gateway URL
terraform output -raw api_gateway_url

# API Gateway キー
terraform output -raw api_key_value
```

これらの値をメモしておきます（環境変数の設定で使用します）。

#### ステップ3: SageMakerエンドポイントの確認

1. AWSコンソールでSageMakerエンドポイントが起動していることを確認
2. エンドポイントが正常にデプロイされていることを確認

**注意**: SageMakerエンドポイントのデプロイには時間がかかる場合があります。エンドポイントが準備できるまで待つ必要があります。

---

## 4. ローカル開発環境のセットアップ

### ステップ1: リポジトリのクローン

```bash
git clone https://github.com/yourusername/music-mapping.git
cd music-mapping
```

### ステップ2: 依存関係のインストール

```bash
npm install
```

### ステップ3: 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成:

```bash
# テンプレートをコピー
cp env.template .env.local
```

`.env.local` を編集:

```env
# サーバーサイド環境変数 (VITE_プレフィックス不要)
# すべての環境変数はサーバーレス関数でのみ使用され、クライアント側には露出しません

# API Gateway設定
# Terraformのoutputから取得してください:
#   terraform output -raw api_gateway_url
#   terraform output -raw api_key_value
API_GATEWAY_URL=https://your-api-gateway-url.execute-api.ap-northeast-1.amazonaws.com/prod/inference
API_GATEWAY_KEY=your-api-gateway-key

# Supabase設定
# Supabaseダッシュボードから取得してください
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
```

### ステップ4: 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開く

⚠️ **注意**: この時点では、検索や曲の追加は動作しません（APIがないため）

---

## 5. Vercelへのデプロイ

### ステップ1: Vercelアカウント作成

1. [Vercel](https://vercel.com) にアクセス
2. GitHubアカウントでサインアップ

### ステップ2: プロジェクトのインポート

#### オプション A: Vercel Web UI

1. Vercelダッシュボードで「Add New...」→「Project」
2. GitHubリポジトリを選択
3. 「Import」をクリック

#### オプション B: Vercel CLI

```bash
# CLIをインストール
npm install -g vercel

# ログイン
vercel login

# デプロイ
vercel
```

### ステップ3: 環境変数の設定

Vercelダッシュボードで:

1. プロジェクトを選択
2. 「Settings」→「Environment Variables」
3. 以下を追加:

#### サーバーサイド環境変数 (VITE_プレフィックス不要)
すべての環境変数はサーバーレス関数でのみ使用され、クライアント側には露出しません。

| Name | Value | Environment |
|------|-------|-------------|
| `API_GATEWAY_URL` | `https://xxx.execute-api...` | Production, Preview, Development |
| `API_GATEWAY_KEY` | `xxxxx` | Production, Preview, Development |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` | Production, Preview, Development |

**重要**: 
- すべての環境変数はサーバーレス関数でのみ使用されます
- クライアント側には露出しないため、`VITE_`プレフィックスは付けません

### ステップ4: 再デプロイ

環境変数を追加した後:

1. 「Deployments」タブに移動
2. 最新のデプロイメントの「...」メニューをクリック
3. 「Redeploy」を選択

または:

```bash
vercel --prod
```

### ステップ5: 動作確認

1. デプロイされたURLにアクセス
2. 新しいマップを作成
3. 曲を検索して追加
4. 散布図で表示されることを確認

---

## 6. トラブルシューティング

### 問題: Supabaseに接続できない

**エラー**: `Supabase configuration is missing` または `Supabase proxy error`

**解決策**:
1. `.env.local` のURLとキーが正しいか確認
2. 環境変数名が `SUPABASE_URL` と `SUPABASE_ANON_KEY` であることを確認（`VITE_`プレフィックス不要）
3. 開発サーバーを再起動 (`npm run dev`)
4. Vercelの場合、環境変数が正しく設定されているか確認

### 問題: 曲検索が動作しない

**エラー**: `iTunes検索に失敗しました`

**解決策**:
1. インターネット接続を確認
2. iTunes Search APIは無料・認証不要なので、通常は問題なし
3. レート制限に達している可能性（まれ）
4. Vercelのデプロイメントログを確認

コマンド:
```bash
vercel logs
```

### 問題: API Gatewayエラー

**エラー**: `API Gateway configuration is missing` または `API Gateway request failed`

**解決策**:
1. `.env.local` の `API_GATEWAY_URL` と `API_GATEWAY_KEY` が正しく設定されているか確認
2. Terraformのoutputから値を再取得して確認
3. API Gatewayが正常にデプロイされているかAWSコンソールで確認
4. SageMakerエンドポイントが起動しているか確認
5. APIキーが有効か確認

コマンド:
```bash
# Terraformのoutputを確認
cd terraform
terraform output
```

### 問題: データベースエラー

**エラー**: `relation "maps" does not exist`

**解決策**:
1. Supabase SQL Editorで `schema.sql` を再実行
2. Table Editorでテーブルが作成されているか確認

### 問題: ビルドエラー

**エラー**: `Module not found` または型エラー

**解決策**:
```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install

# 型チェック
npm run type-check
```

### デバッグのヒント

#### ブラウザコンソールを確認

1. F12でデベロッパーツールを開く
2. Consoleタブでエラーメッセージを確認

#### Vercelログを確認

```bash
# 最新のログを確認
vercel logs

# 特定のデプロイメントのログ
vercel logs [deployment-url]
```

#### Supabaseログを確認

1. Supabaseダッシュボード
2. 「Logs」→「Postgres Logs」

---

## 🎉 完了！

これで完全にセットアップできました！

次のステップ:
- [ ] マップを作成してみる
- [ ] 好きな曲を追加してみる
- [ ] 友達とシェアする

質問や問題がある場合は、GitHubのIssueを作成してください。
