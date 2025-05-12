# API リファレンス

## 共通データモデル

### User オブジェクト
ユーザー情報を表す基本的なオブジェクトです。認証情報やプロフィール情報を含みます。
今回の更新で、ユーザーが現在アクティブに参加しているルームの情報も保持するようになりました。

- `id` (string): ユーザーID
- `name` (string): ユーザー名
- `email` (string): メールアドレス
- `profileImage` (string, optional): プロフィール画像のURL
- `activeRoomId` (string, nullable): 現在参加中のルームID。どのルームにも参加していない場合は `null`。
- `activeRoomRole` (string, nullable): 現在参加中のルームでの役割。`'host'`, `'performer'`, `'viewer'` のいずれか。どのルームにも参加していない場合は `null`。
- `createdAt` (string): 作成日時

## 認証API

### POST /api/auth/register
新規ユーザー登録

**リクエスト**
```json
{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "password": "securepassword"
}
```

**レスポンス**
```json
{
  "id": "usr_123456",
  "name": "山田太郎",
  "email": "yamada@example.com",
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
    "name": "山田太郎"
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
新規ルーム作成

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

**備考:**
- ルーム作成者は、自動的にそのルームのホスト兼演者 (役割: `host`) となります。
- 作成に成功すると、作成したユーザーの `activeRoomId` がこのルームのIDで更新され、`activeRoomRole` が `'host'` に設定されます。

**レスポンス (成功時 201 Created)**
```json
{
  "id": "room_123456",
  "title": "ジャズセッションナイト",
  "hostUserId": "usr_123456",
  "joinToken": "secret_join_token",
  "maxParticipants": 4,
  "createdAt": "2023-06-01T18:30:00Z"
}
```

**レスポンス (エラー時)**
- `401 Unauthorized`: 認証されていません。
- `400 Bad Request`: リクエスト形式が不正です (バリデーションエラー)。
- `409 Conflict`: ユーザーは既に他のアクティブなルームに参加しています。

### POST /api/rooms/{roomId}/apply
演者としての参加を申請します。

**認証**: 必要

**リクエストボディ**: なし (または将来的に { message: "参加希望です" } など)

**レスポンス (成功時 201 Created)**
```json
{
  "success": true,
  "message": "演者としての参加を申請しました。",
  "application": {
    "_id": "app_123",
    "roomId": "room_abc",
    "userId": "user_xyz",
    "status": "pending",
    "requestedAt": "2023-10-27T10:00:00Z"
  }
}
```

**レスポンス (エラー時)**
- `401 Unauthorized`: 認証されていません。
- `400 Bad Request`: 無効なルームID、または既に申請済み/承認済みの場合など。
- `404 Not Found`: ルームが見つかりません。
- `409 Conflict`:
    - 申請ユーザーが既に他のアクティブなルームに参加しています。
    - 申請ユーザーが現在のルームに既に何らかの役割で参加しています。
    - ルームの演者数が上限 (4人) に達しています。

### GET /api/rooms/{roomId}/applications
特定のルームへの参加申請一覧を取得します。(ホスト専用)

**認証**: 必要 (ルームホストであること)

**レスポンス (成功時 200 OK)**
```json
{
  "success": true,
  "applications": [
    {
      "_id": "app_123",
      "roomId": "room_abc",
      "userId": {
        "_id": "user_xyz",
        "name": "申請者名",
        "profileImage": "url_to_image"
      },
      "status": "pending",
      "requestedAt": "2023-10-27T10:00:00Z"
    }
  ]
}
```

### POST /api/rooms/{roomId}/applications/{applicationId}/respond
参加申請に対して承認または拒否します。(ホスト専用)

**認証**: 必要 (ルームホストであること)

**リクエストボディ**
```json
{
  "action": "approve"
}
```
または
```json
{
  "action": "reject"
}
```

**レスポンス (成功時 200 OK)**
```json
{
  "success": true,
  "message": "申請を承認しました。",
  "application": {
    "_id": "app_123",
    "roomId": "room_abc",
    "userId": "user_xyz",
    "status": "approved",
    "requestedAt": "2023-10-27T10:00:00Z",
    "respondedAt": "2023-10-27T10:05:00Z"
  }
}
```

**備考 (承認時):**
- 承認に成功すると、承認されたユーザーの `activeRoomId` がこのルームのIDで更新され、`activeRoomRole` が `'performer'` に設定されます。

**レスポンス (エラー時)**
- `401 Unauthorized`: 認証されていません。
- `403 Forbidden`: ホストではありません。
- `400 Bad Request`: 無効なID、無効なアクション、または既に応答済みの申請の場合など。
- `404 Not Found`: ルームまたは申請が見つかりません。
- `409 Conflict` (承認アクションの場合のみ):
    - 対象ユーザーが既に他のアクティブなルームに参加しています (申請は自動的に拒否されます)。
    - 対象ユーザーが現在のルームに既に何らかの役割で参加しています (申請は自動的に拒否されます)。
    - ルームの演者数が上限 (4人) に達しています (申請は自動的に拒否されます)。

### POST /api/rooms/{roomId}/join
ルームに参加します。演者として参加する場合は、事前に承認されている必要があります。

**認証**: 必要

**URLパラメータ**
- `roomId` (string, required): 参加するルームのID

**リクエストボディ**
```json
{
  "role": "viewer" // または "performer"
}
```

**備考:**
- 参加に成功すると、参加したユーザーの `activeRoomId` がこのルームのIDで更新され、`activeRoomRole` が指定された `role` に設定されます。

**レスポンス (成功時 200 OK)**
```json
{
  "success": true,
  "message": "視聴者としてルームに参加しました。", // メッセージは役割によって変わる
  "roomId": "room_abc",
  "userId": "user_123",
  "role": "viewer" // 参加した役割
}
```

**レスポンス (エラー時)**
- `401 Unauthorized`: 認証されていません。
- `400 Bad Request`: 無効なルームID、無効な役割、または既に同じ役割で参加済みの場合など。
- `403 Forbidden` (演者として参加しようとした場合): 参加が承認されていません。
- `404 Not Found`: ルームまたはユーザーが見つかりません。
- `409 Conflict`:
    - ユーザーが既に他のアクティブなルームに参加しています。
    - ユーザーが現在のルームに既に別の役割で参加しています。
    - (演者として参加しようとした場合) ルームの演者数が上限に達しています。

### POST /api/rooms/{roomId}/leave
ルームから退出します。

**認証**: 必要

**URLパラメータ**
- `roomId` (string, required): 退出するルームのID

**リクエストボディ**: なし

**備考:**
- 退出に成功すると、退出したユーザーの `activeRoomId` と `activeRoomRole` が `null` に設定されます。
- ホストは通常の退出はできません。ルームを終了する必要があります。

**レスポンス (成功時 200 OK)**
```json
{
  "success": true,
  "message": "ルームから退出しました"
}
```

**レスポンス (エラー時)**
- `401 Unauthorized`: 認証されていません。
- `400 Bad Request`: 無効なルームID、またはホストが退出を試みた場合など。
- `404 Not Found`: ルームが見つかりません。

### POST /api/rooms/{roomId}/end
ルームを終了します。(ホスト専用)

**認証**: 必要 (ルームホストであること)

**URLパラメータ**
- `roomId` (string, required): 終了するルームのID

**リクエストボディ**: なし

**備考:**
- ルームの終了に成功すると、そのルームに参加していた全てのユーザー (ホストを含む) の `activeRoomId` と `activeRoomRole` が `null` に設定されます。
- ルームのステータスが `ended` に更新されます。

**レスポンス (成功時 200 OK)**
```json
{
  "success": true,
  "message": "ルームを終了しました"
}
```

**レスポンス (エラー時)**
- `401 Unauthorized`: 認証されていません。
- `403 Forbidden`: ホストではありません。
- `400 Bad Request`: 無効なルームID、または既に終了済みのルームの場合など。
- `404 Not Found`: ルームが見つかりません。

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

### performer_application_received (サーバー → ホストクライアント)
新しい演者参加申請があったことをホストに通知します。

**データ**
```json
{
  "applicationId": "app_123",
  "roomId": "room_abc",
  "userId": "user_xyz",
  "userName": "申請者名",
  "userProfileImage": "url_to_image",
  "requestedAt": "2023-10-27T10:00:00Z"
}
```

### application_responded (サーバー → 申請者クライアント)
自身の参加申請に対するホストの応答を申請者に通知します。

**データ**
```json
{
  "applicationId": "app_123",
  "roomId": "room_abc",
  "status": "approved",
  "message": "演者としての参加が承認されました。"
}
```

### room_participant_approved (サーバー → ルーム参加者全員)
ホストが演者の参加を承認したことをルーム内の全参加者に通知します。

**データ**
```json
{
  "roomId": "room_abc",
  "userId": "user_xyz",
  "userName": "承認されたユーザー名"
}
```

### user_joined_room (サーバー → ルーム参加者全員) (変更)
新しいユーザーがルームに参加したことを通知します。

**データ**
```json
{
  "roomId": "room_abc",
  "userId": "user_xyz",
  "userName": "参加ユーザー名",
  "userProfileImage": "url_to_image",
  "role": "viewer",
  "joinedAt": "2023-10-27T11:00:00Z"
}
``` 