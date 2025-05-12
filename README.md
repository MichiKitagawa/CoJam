# CoJam プロジェクト

即興コラボ音楽ライブプラットフォーム

## プロジェクト概要

CoJamは、演者同士がほぼリアルタイム（P2P）でセッションし、リスナーには高品質Mix配信を行う音楽プラットフォームです。ライブ配信・アーカイブ・課金機能を備え、エンゲージメントと収益化を同時に実現します。

## 主な機能

- P2P WebRTCによる低レイテンシー音声通信
- リアルタイムミキシングと配信
- 有料ルーム・投げ銭機能
- セッションアーカイブ
- 演者/視聴者選択と演者参加時のホスト承認フロー

## 開発ドキュメント

開発に必要な各種ドキュメントは以下のフォルダに整理されています：

### アーキテクチャ設計

- [システム設計図](docs/architecture/system-design.md) - 全体アーキテクチャと構成図

### 機能実装ガイド

- [WebRTC実装ガイドライン](docs/features/webrtc-implementation.md) - WebRTC実装の詳細

### API仕様

- [API リファレンス](docs/api/reference.md) - バックエンドAPIの仕様

### 環境構築

- [開発環境セットアップガイド](docs/setup/development-guide.md) - 開発環境構築手順

### プロジェクト管理

- [プロジェクト計画書](docs/planning/project-plan.md) - 開発スケジュールと計画
- [テスト戦略](docs/testing/test-strategy.md) - テスト計画と方針

## プロジェクト構成

```
cojam/
├── frontend/           # Next.jsフロントエンド
├── backend/            # Node.jsバックエンド
├── infrastructure/     # AWSインフラコード
├── docs/               # プロジェクトドキュメント
└── scripts/            # 開発用スクリプト
```

## 開発ステップ

1. リポジトリをクローン
2. 開発環境をセットアップ（[ガイド](docs/setup/development-guide.md)参照）
3. タスクボードのチケットに従って開発
4. プルリクエスト作成・レビュー
5. マージ後、CI/CDパイプラインで自動デプロイ

## ブランチ戦略

- `main`: 本番リリース用ブランチ
- `develop`: 開発統合ブランチ
- `feature/*`: 機能開発ブランチ
- `bugfix/*`: バグ修正ブランチ
- `release/*`: リリース準備ブランチ

## 連絡先

プロジェクトに関するお問い合わせは以下まで：

- 開発チーム: dev@example.com
- プロジェクト管理: pm@example.com 