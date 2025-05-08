# 開発環境セットアップガイド

## 前提条件

- Node.js v18以上
- Docker Desktop
- AWS CLI（設定済み）
- Git

## リポジトリクローン

```bash
git clone https://github.com/your-org/cojam.git
cd cojam
```

## プロジェクト構成

```
cojam/
├── frontend/           # Next.jsフロントエンド
├── backend/            # Node.jsバックエンド
├── infrastructure/     # AWSインフラコード
├── docs/               # プロジェクトドキュメント
└── scripts/            # 開発用スクリプト
```

## フロントエンド開発環境

```bash
cd frontend
npm install
cp .env.example .env.local  # 環境変数設定
npm run dev
```

ブラウザで http://localhost:3000 にアクセスして確認

## バックエンド開発環境

```bash
cd backend
npm install
cp .env.example .env  # 環境変数設定
npm run dev
```

APIサーバーが http://localhost:8080 で起動

## ローカルDBセットアップ

```bash
docker-compose up -d
```

これにより以下のサービスが起動:
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## 統合開発環境

すべてのサービスを一括で起動:

```bash
npm run dev:all
```

## テスト実行

```bash
# ユニットテスト
npm run test

# E2Eテスト
npm run test:e2e
```

## CI/CD環境

- GitHub Actionsによる自動テスト・デプロイ
- PRごとにテスト環境自動デプロイ
- mainブランチ更新時にステージング環境へデプロイ

## 環境変数設定

各環境（dev/staging/production）ごとの環境変数設定は`.env.{environment}`ファイルに定義されています。
ローカル開発時は`.env.local`を使用します。

## トラブルシューティング

- **WebRTC接続問題**: ローカル開発ではSTUNサーバーが必要です
- **DB接続エラー**: Dockerコンテナが正常に起動しているか確認してください
- **APIアクセスエラー**: CORSの設定が適切か確認してください 