import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// HTTPクライアントのインスタンス作成
const api = axios.create({
  baseURL: `${API_URL}/api/rooms`,
  headers: {
    'Content-Type': 'application/json'
  }
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

// ルーム型定義
export interface Room {
  id: string;
  title: string;
  description?: string;
  hostUser: {
    id: string;
    name: string;
    profileImage?: string;
  };
  isPaid: boolean;
  price?: number;
  maxParticipants: number;
  currentParticipants: number;
  status: 'scheduled' | 'live' | 'ended';
  scheduledStartAt?: string;
  startedAt?: string;
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

// ルーム一覧取得
export const getRooms = async (params?: RoomQueryParams): Promise<RoomsResponse> => {
  const response = await api.get<RoomsResponse>('/', { params });
  return response.data;
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
  userAccess?: {
    isHost: boolean;
    isParticipant: boolean;
    canJoin: boolean;
  };
}

// ルーム詳細取得
export const getRoomById = async (roomId: string): Promise<{ success: boolean; data?: { room: RoomDetail; userAccess?: any }; message?: string }> => {
  try {
    const response = await api.get<{ success: boolean; data: { room: RoomDetail; userAccess?: any } }>(`/${roomId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    return { success: false, message: 'ルーム情報の取得に失敗しました' };
  }
};

// ルーム参加
export const joinRoom = async (params: { roomId?: string; joinToken?: string }): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const response = await api.post<{ success: boolean; data?: any; message?: string }>('/join', params);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    return { success: false, message: 'ルーム参加に失敗しました' };
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
    if (error.response?.data) {
      return error.response.data;
    }
    return { success: false, message: 'ルーム終了に失敗しました' };
  }
};

// エクスポート
export default {
  getRooms,
  getMyRooms,
  createRoom,
  getRoomById,
  joinRoom,
  leaveRoom,
  endRoom
}; 