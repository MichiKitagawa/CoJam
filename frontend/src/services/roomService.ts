import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// HTTPクライアントのインスタンス作成
const api = axios.create({
  baseURL: `${API_URL}/api/rooms`,
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

// クエリパラメータの型定義
export interface RoomQueryParams {
  status?: 'scheduled' | 'live' | 'ended';
  hostUserId?: string;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  sortBy?: string;
  page?: number;
  limit?: number;
}

// 基本的なルーム型定義
export interface Room {
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

// レスポンス型定義
export interface RoomsResponse {
  success: boolean;
  data: {
    rooms: Room[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

// ダミーデータ（バックエンドが利用不可の場合のフォールバック）
const dummyRooms: Room[] = [
  {
    id: 'dummy-1',
    title: 'テストルーム1',
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
    title: 'テストルーム2',
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

// ルーム一覧取得
export const getRooms = async (params?: RoomQueryParams): Promise<RoomsResponse> => {
  try {
    console.log('APIリクエスト送信:', `${API_URL}/api/rooms`, params);
    const response = await api.get<RoomsResponse>('/', { params });
    return response.data;
  } catch (error) {
    console.warn('ルーム一覧の取得に失敗したため、ダミーデータを返します');
    // ダミーデータを返す（開発中の対応）
    return {
      success: true,
      data: {
        rooms: dummyRooms,
        pagination: {
          total: dummyRooms.length,
          page: params?.page || 1,
          limit: params?.limit || 8,
          totalPages: 1
        }
      }
    };
  }
};

// 自分のルーム一覧取得
export const getMyRooms = async (params?: { status?: string }): Promise<{ success: boolean; data: { rooms: Room[] } }> => {
  const response = await api.get<{ success: boolean; data: { rooms: Room[] } }>('/my-rooms', { params });
  return response.data;
};

// ルーム作成パラメータの型定義
export interface CreateRoomParams {
  title: string;
  description?: string;
  isPaid: boolean;
  price?: number;
  maxParticipants: number;
  isArchiveEnabled: boolean;
  scheduledStartAt?: string;
}

// ルーム作成
export const createRoom = async (params: CreateRoomParams): Promise<{ success: boolean; room?: Room; message?: string }> => {
  try {
    const response = await api.post<{ success: boolean; room: Room }>('/', params);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    return { success: false, message: 'ルームの作成に失敗しました' };
  }
};

// ルーム詳細型定義
export interface RoomDetail extends Room {
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

// RoomApplicationの型 (バックエンドのIRoomApplicationに対応)
export interface RoomApplication {
  _id: string;
  roomId: string;
  userId: { 
    _id: string;
    name: string;
    profileImage?: string;
    email?: string; 
  };
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  respondedAt?: string;
}

// ルーム詳細取得 (既存のものをベースに userAccess の型を更新)
export const getRoomById = async (roomId: string): Promise<{ success: boolean; data?: { room: RoomDetail; userAccess?: RoomDetail['userAccess'] }; message?: string }> => {
  try {
    const response = await api.get<{ success: boolean; data: { room: RoomDetail; userAccess?: RoomDetail['userAccess'] } }>(`/${roomId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    return { success: false, message: 'ルーム情報の取得に失敗しました' };
  }
};

// 演者参加申請
export const applyForPerformer = async (roomId: string, signal?: AbortSignal): Promise<{ success: boolean; application?: RoomApplication; message?: string }> => {
  try {
    const response = await api.post<{ success: boolean; application: RoomApplication; message?: string }>(`/${roomId}/apply`, {}, { signal });
    return response.data;
  } catch (error: any) {
    if (axios.isCancel(error)) {
      console.log('Request canceled:', error.message);
      return { success: false, message: 'Request canceled' };
    }
    return error.response?.data || { success: false, message: '演者参加申請に失敗しました' };
  }
};

// 参加申請一覧取得 (ホスト用)
export const getPerformerApplications = async (roomId: string): Promise<{ success: boolean; applications?: RoomApplication[]; message?: string }> => {
  try {
    const response = await api.get<{ success: boolean; applications: RoomApplication[] }>(`/${roomId}/applications`);
    return response.data;
  } catch (error: any) {
    return error.response?.data || { success: false, message: '参加申請一覧の取得に失敗しました' };
  }
};

// 参加申請への応答 (ホスト用)
export const respondToApplication = async (
  roomId: string,
  applicationId: string,
  action: 'approve' | 'reject'
): Promise<{ success: boolean; application?: RoomApplication; message?: string }> => {
  try {
    const response = await api.post<{ success: boolean; application: RoomApplication }>( // message も返ってくる可能性があるので型に追加
      `/${roomId}/applications/${applicationId}/respond`,
      { action }
    );
    return response.data;
  } catch (error: any) {
    return error.response?.data || { success: false, message: '参加申請への応答に失敗しました' };
  }
};

// 既存の joinRoom を修正 (role パラメータを追加)
export const joinRoom = async (params: { 
  roomId?: string; // roomIdをオプションにする
  joinToken?: string; 
  role?: 'viewer' | 'performer'; 
}): Promise<{ success: boolean; data?: any; message?: string; userRole?: 'host' | 'performer' | 'viewer' }> => {
  try {
    // 必要なパラメータが揃っていることを確認
    if (!params.roomId && !params.joinToken) {
      return { success: false, message: 'ルームIDまたは参加トークンが必要です' };
    }
    
    const response = await api.post<{ success: boolean; data: any; userRole?: 'host' | 'performer' | 'viewer' }>('/join', params);
    return response.data;
  } catch (error: any) {
    return error.response?.data || { success: false, message: 'ルームへの参加に失敗しました' };
  }
};

// ルーム退出
export const leaveRoom = async (roomId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await api.post<{ success: boolean; message?: string }>(`/${roomId}/leave`);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    return { success: false, message: 'ルーム退出に失敗しました' };
  }
};

// ルーム終了（ホスト専用）
export const endRoom = async (roomId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await api.post<{ success: boolean; message?: string }>(`/${roomId}/end`);
    return response.data;
  } catch (error: any) {
    return error.response?.data || { success: false, message: 'ルームの終了に失敗しました' };
  }
};

// ルーム開始 (ホスト用)
export const startRoom = async (roomId: string): Promise<{ success: boolean; message?: string; room?: { id: string; status: string; startedAt: string } }> => {
  try {
    const response = await api.post<{ success: boolean; message?: string; room: { id: string; status: string; startedAt: string } }>(`/${roomId}/start`);
    return response.data;
  } catch (error: any) {
    return error.response?.data || { success: false, message: 'ルームの開始に失敗しました' };
  }
};

// エクスポート
export default {
  getRooms,
  getMyRooms,
  createRoom,
  getRoomById,
  applyForPerformer,
  getPerformerApplications,
  respondToApplication,
  joinRoom,
  leaveRoom,
  endRoom,
  startRoom
}; 