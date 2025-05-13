import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// ★ Base URL を /api/sessions に変更
const api = axios.create({
  baseURL: `${API_URL}/api/sessions`, // Updated baseURL
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // タイムアウトを設定
});

// リクエストインターセプター（トークン付与）
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// レスポンスインターセプターの追加（エラーハンドリング）
api.interceptors.response.use(
  (response) => {
    console.log('API応答成功:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('API呼び出しエラー:', error);
    if (error.code === 'ECONNABORTED') {
      console.error('タイムアウトエラー: サーバーに接続できません');
    } else if (!error.response) {
      console.error('ネットワークエラー: サーバーに接続できません');
    } else {
      console.error(`APIエラー: ${error.response.status} - ${error.response.statusText}`);
    }
    return Promise.reject(error);
  }
);

// クエリパラメータの型定義 (Room -> Session)
export interface SessionQueryParams {
  status?: 'scheduled' | 'live' | 'ended';
  hostUserId?: string;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  sortBy?: string;
  page?: number;
  limit?: number;
}

// 基本的なセッション型定義 (Room -> Session)
export interface Session {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  hostUser: {
    id: string;
    name: string;
    profileImage?: string;
  };
  maxParticipants: number;
  currentParticipants: number;
  isPaid: boolean;
  price?: number;
  scheduledStartAt?: string;
  startedAt?: string;
  status: 'scheduled' | 'ready' | 'live' | 'ended';
  createdAt: string;
}

// レスポンス型定義 (Room -> Session)
export interface SessionsResponse {
  success: boolean;
  data: {
    sessions: Session[]; // ★ sessions
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

// ダミーデータ（バックエンドが利用不可の場合のフォールバック）
const dummySessions: Session[] = [
  {
    id: 'dummy-1',
    title: 'テストセッション1',
    description: 'バックエンド接続不可のため、ダミーデータを表示しています',
    hostUser: {
      id: 'host-1',
      name: 'テストユーザー'
    },
    isPaid: false,
    maxParticipants: 5,
    currentParticipants: 1,
    status: 'scheduled',
    scheduledStartAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'dummy-2',
    title: 'テストセッション2',
    description: 'バックエンド接続不可のため、ダミーデータを表示しています',
    hostUser: {
      id: 'host-2',
      name: 'テストユーザー2'
    },
    isPaid: true,
    price: 1000,
    maxParticipants: 4,
    currentParticipants: 2,
    status: 'live',
    startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

// セッション一覧取得 (getRooms -> getSessions)
export const getSessions = async (params?: SessionQueryParams): Promise<SessionsResponse> => {
  try {
    console.log('APIリクエスト送信:', `${API_URL}/api/sessions`, params); // Updated endpoint log
    const response = await api.get<SessionsResponse>('/', { params });
    return response.data;
  } catch (error) {
    console.warn('セッション一覧の取得に失敗したため、ダミーデータを返します');
    return {
      success: true,
      data: {
        sessions: dummySessions, // ★ sessions
        pagination: {
          total: dummySessions.length,
          page: params?.page || 1,
          limit: params?.limit || 8,
          totalPages: 1
        }
      }
    };
  }
};

// 自分のセッション一覧取得 (getMyRooms -> getMySessions)
export const getMySessions = async (params?: { status?: string }): Promise<{ success: boolean; data: { sessions: Session[] } }> => {
  // Assuming the backend route is /api/sessions/my-sessions
  const response = await api.get<{ success: boolean; data: { sessions: Session[] } }>('/my-sessions', { params }); // Updated endpoint
  return response.data;
};

// セッション作成パラメータの型定義 (CreateRoomParams -> CreateSessionParams)
export interface CreateSessionParams {
  title: string;
  description?: string;
  isPaid: boolean;
  price?: number;
  maxParticipants: number;
  isArchiveEnabled: boolean;
  scheduledStartAt?: string;
}

// セッション作成 (createRoom -> createSession)
export const createSession = async (params: CreateSessionParams): Promise<{ success: boolean; session?: Session; message?: string }> => {
  try {
    // POST to /api/sessions
    const response = await api.post<{ success: boolean; session: Session }>('/', params); // Endpoint is correct with updated baseURL
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    return { success: false, message: 'セッションの作成に失敗しました' };
  }
};

// セッション詳細型定義 (RoomDetail -> SessionDetail)
export interface SessionDetail extends Session {
  description?: string;
  joinToken?: string;
  participants?: Array<{
    id: string;
    name: string;
    profileImage?: string;
  }>;
  endedAt?: string;
  recordingUrl?: string;
  isArchiveEnabled?: boolean;
  userAccess?: {
    isHost: boolean;
    isParticipant: boolean;
    canJoin: boolean;
    applicationStatus?: 'pending' | 'approved' | 'rejected' | null;
    canApply?: boolean;
    userRole?: 'host' | 'performer' | 'viewer' | null;
  };
}

// SessionApplicationの型 (RoomApplication -> SessionApplication)
export interface SessionApplication {
  _id: string;
  sessionId: string; // ★ roomId -> sessionId
  userId: { 
    _id: string;
    name: string;
    profileImage?: string;
    email?: string; 
  };
  status: 'pending' | 'approved' | 'rejected' | 'canceled'; // canceled を追加
  requestedAt: string;
  respondedAt?: string;
}

// セッション詳細取得 (getRoomById -> getSessionById)
export const getSessionById = async (sessionId: string): Promise<{ success: boolean; data?: { session: SessionDetail; userAccess?: SessionDetail['userAccess'] }; message?: string }> => {
  try {
    // GET /api/sessions/:id
    const response = await api.get<{ success: boolean; data: { session: SessionDetail; userAccess?: SessionDetail['userAccess'] } }>(`/${sessionId}`); // Endpoint is correct with updated baseURL
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    return { success: false, message: 'セッション情報の取得に失敗しました' };
  }
};

// 演者参加申請 (applyForPerformer -> applyForSessionPerformer)
export const applyForSessionPerformer = async (sessionId: string, signal?: AbortSignal): Promise<{ success: boolean; application?: SessionApplication; message?: string }> => {
  try {
    // POST /api/sessions/:id/apply
    const response = await api.post<{ success: boolean; application: SessionApplication; message?: string }>(`/${sessionId}/apply`, {}, { signal }); // Updated endpoint relative to baseURL
    return response.data;
  } catch (error: any) {
    if (axios.isCancel(error)) {
      console.log('Request canceled:', error.message);
      return { success: false, message: 'Request canceled' };
    }
    return error.response?.data || { success: false, message: '演者参加申請に失敗しました' };
  }
};

// 参加申請一覧取得 (ホスト用) (getPerformerApplications -> getSessionApplications)
export const getSessionApplications = async (sessionId: string): Promise<{ success: boolean; applications?: SessionApplication[]; message?: string }> => {
  try {
    // GET /api/sessions/:id/applications
    const response = await api.get<{ success: boolean; applications: SessionApplication[] }>(`/${sessionId}/applications`); // Updated endpoint relative to baseURL
    return response.data;
  } catch (error: any) {
    return error.response?.data || { success: false, message: '参加申請一覧の取得に失敗しました' };
  }
};

// 参加申請への応答 (ホスト用) (respondToApplication -> respondToSessionApplication)
export const respondToSessionApplication = async (
  sessionId: string,
  applicationId: string,
  action: 'approve' | 'reject'
): Promise<{ success: boolean; application?: SessionApplication; message?: string }> => {
  try {
    // PUT /api/sessions/:id/applications/:applicationId (Assuming PUT method)
    const response = await api.put<{ success: boolean; application: SessionApplication; message?: string }>(`/${sessionId}/applications/${applicationId}`, { action }); // Updated endpoint and assumed method/payload
    return response.data;
  } catch (error: any) {
    return error.response?.data || { success: false, message: '申請への応答に失敗しました' };
  }
};

// セッション参加 (joinRoom -> joinSession) - APIエンドポイントは未定
// export const joinSession = async (params: { 
//   sessionId?: string; 
//   joinToken?: string; 
//   role?: 'viewer' | 'performer'; 
// }): Promise<{ success: boolean; data?: any; message?: string; userRole?: 'host' | 'performer' | 'viewer' }> => {
//   try {
//     // TODO: 参加用APIエンドポイントを決定・実装後に修正
//     const response = await api.post(`/join`, params); // 仮のエンドポイント
//     return response.data;
//   } catch (error: any) {
//     return error.response?.data || { success: false, message: 'セッションへの参加に失敗しました' };
//   }
// };

// セッション退出 (leaveRoom -> leaveSession) - APIエンドポイントは未定
// export const leaveSession = async (sessionId: string): Promise<{ success: boolean; message?: string }> => {
//   try {
//     // TODO: 退出用APIエンドポイントを決定・実装後に修正
//     const response = await api.post(`/${sessionId}/leave`); // 仮のエンドポイント
//     return response.data;
//   } catch (error: any) {
//     return error.response?.data || { success: false, message: 'セッションからの退出に失敗しました' };
//   }
// };

// セッション終了 (endRoom -> endSession)
export const endSession = async (sessionId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    // POST /api/sessions/:id/end (Assuming POST method)
    const response = await api.post<{ success: boolean; message?: string }>(`/${sessionId}/end`); // Updated endpoint and assumed method
    return response.data;
  } catch (error: any) {
    return error.response?.data || { success: false, message: 'セッションの終了に失敗しました' };
  }
};

// セッション開始 (startRoom -> startSession)
export const startSession = async (sessionId: string): Promise<{ success: boolean; message?: string; session?: { id: string; status: string; startedAt: string } }> => {
  try {
    // POST /api/sessions/:id/start (Assuming POST method)
    const response = await api.post<{ success: boolean; message?: string; session?: { id: string; status: string; startedAt: string } }>(`/${sessionId}/start`); // Updated endpoint and assumed method
    return response.data;
  } catch (error: any) {
    return error.response?.data || { success: false, message: 'セッションの開始に失敗しました' };
  }
}; 