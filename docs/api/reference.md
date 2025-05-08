# API リファレンス

## 認証API

### POST /api/auth/register
新規ユーザー登録

**リクエスト**
```json
{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "password": "securepassword",
  "role": "performer" // performer または audience
}
```

**レスポンス**
```json
{
  "id": "usr_123456",
  "name": "山田太郎",
  "email": "yamada@example.com",
  "role": "performer",
  "createdAt": "2023-06-01T12:00:00Z"
}
```

### POST /api/auth/login
ログイン認証

**リクエスト**
```json
{
  "email": "yamada@example.com",
  "password": "securepassword"
}
```

**レスポンス**
```json
{
  "user": {
    "id": "usr_123456",
    "name": "山田太郎",
    "role": "performer"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2023-06-02T12:00:00Z"
}
```

## ルームAPI

### GET /api/rooms
ライブ中のルーム一覧取得

**クエリパラメータ**
- `status`: "live" (デフォルト) | "upcoming" | "archived"
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページの件数（デフォルト: 20）

**レスポンス**
```json
{
  "rooms": [
    {
      "id": "room_123456",
      "title": "ジャズセッションナイト",
      "hostUserId": "usr_123456",
      "hostName": "山田太郎",
      "isPaid": true,
      "price": 500,
      "participantCount": 3,
      "audienceCount": 42,
      "startedAt": "2023-06-01T19:00:00Z",
      "thumbnailUrl": "https://example.com/thumbnails/room_123456.jpg"
    },
    // ...
  ],
  "pagination": {
    "total": 152,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

### POST /api/rooms
新規ルーム作成（演者のみ）

**リクエスト**
```json
{
  "title": "ジャズセッションナイト",
  "description": "即興ジャズセッションを楽しみましょう",
  "isPaid": true,
  "price": 500,
  "maxParticipants": 4,
  "isArchiveEnabled": true,
  "scheduledStartAt": "2023-06-01T19:00:00Z"
}
```

**レスポンス**
```json
{
  "id": "room_123456",
  "title": "ジャズセッションナイト",
  "hostUserId": "usr_123456",
  "joinToken": "secret_join_token",
  "createdAt": "2023-06-01T18:30:00Z"
}
```

### POST /api/rooms/{roomId}/join
ルーム参加（演者または視聴者）

**リクエスト**
```json
{
  "role": "performer", // performer または audience
  "joinToken": "secret_join_token" // 演者の場合のみ必要
}
```

**レスポンス**
```json
{
  "rtcToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "channelName": "room_123456",
  "userId": "usr_123456",
  "role": "performer",
  "serverTime": "2023-06-01T19:01:23Z"
}
```

## 決済API

### POST /api/payments/tickets
チケット購入

**リクエスト**
```json
{
  "roomId": "room_123456",
  "paymentMethodId": "pm_card_visa" // Stripeの支払い方法ID
}
```

**レスポンス**
```json
{
  "ticketId": "ticket_123456",
  "roomId": "room_123456",
  "amount": 500,
  "status": "completed",
  "purchasedAt": "2023-06-01T18:55:00Z"
}
```

### POST /api/payments/gifts
投げ銭（ギフト）送信

**リクエスト**
```json
{
  "roomId": "room_123456",
  "amount": 1000,
  "message": "素晴らしい演奏をありがとう！",
  "paymentMethodId": "pm_card_visa"
}
```

**レスポンス**
```json
{
  "giftId": "gift_123456",
  "roomId": "room_123456",
  "fromUserId": "usr_789012",
  "amount": 1000,
  "status": "completed",
  "createdAt": "2023-06-01T19:30:45Z"
}
```

## WebSocketイベント

ルームの状態変化、コメント、拍手などはWebSocket経由でリアルタイム通知されます。

### 接続
```
ws://api.example.com/rooms/{roomId}/live?token=YOUR_AUTH_TOKEN
```

### イベント一覧

```json
// 新規参加者通知
{
  "type": "user_joined",
  "data": {
    "userId": "usr_789012",
    "name": "鈴木花子",
    "role": "audience",
    "joinedAt": "2023-06-01T19:15:23Z"
  }
}

// コメント
{
  "type": "comment",
  "data": {
    "id": "comment_123456",
    "userId": "usr_789012",
    "userName": "鈴木花子",
    "text": "素晴らしい演奏です！",
    "createdAt": "2023-06-01T19:16:45Z"
  }
}

// 拍手リアクション
{
  "type": "reaction",
  "data": {
    "userId": "usr_789012",
    "reactionType": "clap",
    "count": 5,
    "createdAt": "2023-06-01T19:17:30Z"
  }
}

// ギフト通知
{
  "type": "gift",
  "data": {
    "giftId": "gift_123456",
    "userId": "usr_789012",
    "userName": "鈴木花子",
    "amount": 1000,
    "message": "素晴らしい演奏をありがとう！",
    "createdAt": "2023-06-01T19:30:45Z"
  }
}

// ルーム状態変更
{
  "type": "room_status_change",
  "data": {
    "status": "ended",
    "endedAt": "2023-06-01T21:00:00Z",
    "archiveUrl": "https://example.com/archives/room_123456"
  }
}
``` 