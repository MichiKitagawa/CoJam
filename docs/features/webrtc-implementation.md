# WebRTC実装ガイドライン

## WebRTC概要

本プロジェクトではWebRTCを使用して以下を実現します：

1. **演者間の低遅延P2P通信**
2. **SFUを介したメディアルーティング**
3. **サーバー側でのミキシングと配信**

## アーキテクチャ構成

```
[演者A] ←→ 
           ↘
[演者B] ←→ [SFUサーバー] → [ミキシングサーバー] → [CDN] → [視聴者]
           ↗
[演者C] ←→
```

## 実装ライブラリ選定

以下のライブラリの使用を推奨します：

1. **基本WebRTC実装**
   - **simple-peer** (クライアント側P2P)
   - **mediasoup** (SFUサーバー)

2. **シグナリング**
   - **Socket.IO**

3. **メディア処理**
   - **WebAudioAPI** (フロントエンド音声処理)
   - **FFmpeg** (サーバー側ミキシング)

## 主要実装ポイント

### 1. メディア取得とデバイス制御

```javascript
// メディアデバイスアクセス
async function getAudioStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });
    return stream;
  } catch (err) {
    console.error('メディアアクセスエラー:', err);
    throw err;
  }
}
```

### 2. シグナリングサーバー接続

```javascript
// クライアント側シグナリング
const socket = io('https://api.example.com/signaling');

socket.on('connect', () => {
  console.log('シグナリングサーバーに接続しました');
});

// ルーム参加
socket.emit('join-room', { roomId, userId, role });

// シグナリングメッセージ受信
socket.on('signal', async (data) => {
  // SDP、ICE candidateなどの処理
});
```

### 3. P2P接続確立

```javascript
// P2P接続（simple-peer使用例）
const peer = new SimplePeer({
  initiator: isHost,
  stream: localStream,
  trickle: true
});

peer.on('signal', (signalData) => {
  // シグナリングデータを相手に送信
  socket.emit('signal', { to: remotePeerId, signal: signalData });
});

peer.on('stream', (remoteStream) => {
  // リモートストリームの取得・表示
});

// 相手からのシグナルデータ受信時
socket.on('signal', (data) => {
  if (data.from === remotePeerId) {
    peer.signal(data.signal);
  }
});
```

### 4. SFUサーバー実装（mediasoup）

```javascript
// Server-side mediasoup設定
const worker = await mediasoup.createWorker({
  logLevel: 'warn',
  rtcMinPort: 10000,
  rtcMaxPort: 10100
});

const router = await worker.createRouter({
  mediaCodecs: [
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2
    }
  ]
});

// クライアント接続時の処理
async function handleConnection(socket, roomId, userId) {
  // トランスポート作成
  const transport = await router.createWebRtcTransport({
    listenIps: [{ ip: '0.0.0.0', announcedIp: serverPublicIp }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true
  });
  
  // トランスポート情報をクライアントに送信
  socket.emit('transport-options', {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters
  });
}
```

### 5. ミキシングと配信

```javascript
// 簡易的なサーバーサイドミキシング例
function mixAudioStreams(streams) {
  const mixer = new AudioMixer();
  
  streams.forEach((stream, index) => {
    mixer.addInput({
      track: stream.getAudioTracks()[0],
      volume: 1.0 // デフォルトボリューム
    });
  });
  
  return mixer.getMixedOutput();
}

// ミックス済みストリームをHLSフォーマットで配信
async function startHlsStreaming(mixedStream, roomId) {
  const outputPath = `/var/streaming/room-${roomId}`;
  
  const ffmpeg = new FFmpeg({
    input: mixedStream,
    outputOptions: [
      '-c:a aac',
      '-b:a 128k',
      '-ac 2',
      '-f hls',
      '-hls_time 2',
      '-hls_list_size 10',
      '-hls_flags delete_segments'
    ],
    output: `${outputPath}/playlist.m3u8`
  });
  
  await ffmpeg.start();
  
  return `https://cdn.example.com/live/room-${roomId}/playlist.m3u8`;
}
```

## 接続フェイルオーバー戦略

1. **ICE設定の最適化**
   - STUN/TURNサーバーの複数設定
   - TCP/TLSフォールバック

2. **接続回復ロジック**
   - 再接続自動試行（バックオフ戦略）
   - 一時的音声キャッシュ

3. **ネットワーク変更検出**
   - `navigator.connection`変更監視
   - 再ネゴシエーション実行

## パフォーマンス最適化

1. **音声処理**
   - エコーキャンセレーション
   - ノイズサプレッション
   - レベル自動調整

2. **ネットワーク対応**
   - 帯域幅調整
   - パケットロス対策
   - バッファ管理

3. **リソース管理**
   - バックグラウンド処理最適化
   - メモリ使用量監視
   - CPU使用率制限

## アーカイブとレコーディング

1. **サーバーサイド録画**
   - FFmpegによるキャプチャ
   - S3への直接アップロード

2. **メタデータ同期**
   - タイムスタンプ同期
   - イベント（コメント等）の記録

3. **処理パイプライン**
   - 音質改善後処理
   - エンコード最適化
   - CDN配信準備 