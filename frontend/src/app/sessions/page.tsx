'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { getRooms, RoomQueryParams, Room } from '../../services/roomService'; // 旧パス
import { getSessions, SessionQueryParams, Session } from '../../services/sessionService'; // ★ 新パス・新識別子
import { useAuth } from '../../contexts/AuthContext';
// import RoomCard from '../../components/rooms/RoomCard'; // 旧パス
import SessionCard from '../../components/sessions/SessionCard'; // ★ 新パス・新コンポーネント
// import RoomFilters from '../../components/rooms/RoomFilters'; // 旧パス
import SessionFilters from '../../components/sessions/SessionFilters'; // ★ 新パス・新コンポーネント
import Pagination from '../../components/common/Pagination';
import { PlusIcon, ExclamationCircleIcon, MinusCircleIcon } from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout'; // ★ MainLayoutをインポート

const SessionsPage: React.FC = () => { // ★ RoomsPage -> SessionsPage
  const { state } = useAuth();
  const router = useRouter();
  
  // 状態の定義
  const [sessions, setSessions] = useState<Session[]>([]); // ★ rooms -> sessions, Room -> Session
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SessionQueryParams>({ // ★ RoomQueryParams -> SessionQueryParams
    status: undefined,
    search: '',
    page: 1,
    limit: 8
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 8,
    totalPages: 0
  });

  // フィルターが変更された時のハンドラー
  const handleFilterChange = (newFilters: Partial<SessionQueryParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  // ページが変更された時のハンドラー
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  // セッション作成ページへの遷移 (handleCreateRoom -> handleCreateSession)
  const handleCreateSession = () => {
    if (!state.isAuthenticated) {
      router.push('/login?redirect=/sessions/create'); // ★ /rooms/create -> /sessions/create
      return;
    }
    
    router.push('/sessions/create'); // ★ /rooms/create -> /sessions/create
  };

  // セッション詳細ページへの遷移 (handleRoomClick -> handleSessionClick)
  const handleSessionClick = (sessionId: string) => {
    router.push(`/sessions/${sessionId}`); // ★ /rooms/ -> /sessions/
  };

  // セッション一覧の取得 (getRooms -> getSessions)
  useEffect(() => {
    const fetchSessions = async () => { // ★ fetchRooms -> fetchSessions
      setLoading(true);
      setError(null);
      
      try {
        const response = await getSessions(filters); // ★ getRooms -> getSessions
        
        if (response.success) {
          setSessions(response.data.sessions); // ★ rooms -> sessions
          setPagination(response.data.pagination);
        } else {
          setError('セッション一覧の取得に失敗しました'); // ★ ルーム -> セッション
        }
      } catch (err: any) {
        console.error('セッション一覧取得エラー:', err); // ★ ルーム -> セッション
        let errorMessage = 'セッション一覧の取得中にエラーが発生しました'; // ★ ルーム -> セッション
        
        if (err.code === 'ECONNABORTED') {
          errorMessage = 'APIサーバーへの接続がタイムアウトしました。バックエンドサーバーが起動しているか確認してください。';
        } else if (!err.response) {
          errorMessage = 'APIサーバーに接続できません。バックエンドサーバーが起動しているか確認してください。';
        } else if (err.response) {
          errorMessage += `: ${err.response.status} - ${err.response.statusText}`;
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessions();
  }, [filters]);

  return (
    <MainLayout> {/* ★ MainLayoutでラップ */}
      <div className="min-h-screen next-section">
        <div className="next-container">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-10 pb-6 sm:pb-8 border-b border-gray-200">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-800">
                セッション一覧 {/* ★ セッションルーム -> セッション一覧 */}
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                お気に入りのミュージシャンと一緒にセッションを楽しみましょう
              </p>
            </div>
            
            {state.isAuthenticated && (
              <button
                onClick={handleCreateSession} // ★ handleCreateRoom -> handleCreateSession
                className="next-button button-primary mt-6 sm:mt-0 shrink-0 text-base"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                新規セッション作成 {/* ★ 新規ルーム作成 -> 新規セッション作成 */}
              </button>
            )}
          </div>
          
          <SessionFilters // ★ RoomFilters -> SessionFilters
            filters={filters} 
            onFilterChange={handleFilterChange} 
          />
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center">
                <svg className="animate-spin h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-4 text-sm text-gray-500">セッション情報を取得中...</p> {/* ★ ルーム -> セッション */}
              </div>
            </div>
          ) : error ? (
            <div className="next-card p-6 sm:p-8 my-8 text-center border-red-300 bg-red-50">
              <div className="flex flex-col items-center">
                <ExclamationCircleIcon className="h-12 w-12 text-red-400 mb-3" />
                <h3 className="text-lg font-semibold text-red-700 mb-1">エラーが発生しました</h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          ) : sessions.length === 0 ? ( // ★ rooms -> sessions
            <div className="next-card p-8 sm:p-12 my-8 text-center">
              <MinusCircleIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="mt-3 text-xl font-semibold text-gray-700">セッションが見つかりませんでした</h3> {/* ★ ルーム -> セッション */}
              <p className="mt-2 text-base text-gray-500">検索条件を変更するか、新しいセッションを作成してみましょう</p> {/* ★ ルーム -> セッション */}
              {state.isAuthenticated && (
                <button
                  onClick={handleCreateSession} // ★ handleCreateRoom -> handleCreateSession
                  className="next-button button-secondary mt-8 text-base"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  新規セッション作成 {/* ★ 新規ルーム作成 -> 新規セッション作成 */}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sessions.map((session) => ( // ★ rooms -> sessions, room -> session
                <SessionCard // ★ RoomCard -> SessionCard
                  key={session.id} 
                  session={session} // ★ room -> session
                  onClick={() => handleSessionClick(session.id)} // ★ handleRoomClick -> handleSessionClick
                />
              ))}
            </div>
          )}
          
          {!loading && sessions.length > 0 && ( // ★ rooms -> sessions
            <div className="mt-8">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </MainLayout> // ★ MainLayoutでラップ
  );
};

export default SessionsPage; // ★ RoomsPage -> SessionsPage 