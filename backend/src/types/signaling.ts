export interface SignalPayload {
  to: string; // 宛先ユーザーのsocket.id
  from: string; // 送信元ユーザーのsocket.id
  signal: any; // SDP オブジェクトまたは ICE Candidate オブジェクト
}

export interface JoinSessionPayload {
  sessionId: string;
  userId: string;
  // role: 'speaker' | 'listener'; // 必要に応じて役割も追加
}

export interface LeaveSessionPayload {
  sessionId: string;
  userId: string;
} 