'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { getRoomById, RoomDetail, joinRoom, leaveRoom, endRoom } from '../../../services/roomService';
import { formatDate } from '../../../utils/dateFormatter';
import RoomStatusBadge from '../../../components/rooms/RoomStatusBadge';
import UserAvatar from '../../../components/common/UserAvatar';
import JoinTokenDialog from '../../../components/rooms/JoinTokenDialog';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

interface PageProps {
  params: {
    id: string;
  }
}

const RoomDetailPage: React.FC<PageProps> = ({ params }) => {
  const roomId = params.id;
  const { state } = useAuth();
  const router = useRouter();
  
  // ステート定義
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showJoinToken, setShowJoinToken] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isLeaving, setIsLeaving] = useState<boolean>(false);
  const [isEnding, setIsEnding] = useState<boolean>(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false);
  const [showEndConfirm, setShowEndConfirm] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  
  // ルーム詳細の取得
  useEffect(() => {
    const fetchRoomDetail = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await getRoomById(roomId);
        
        if (response.success && response.data) {
          setRoom({
            ...response.data.room,
            userAccess: response.data.userAccess
          });
        } else {
          setError(response.message || 'ルーム情報の取得に失敗しました');
        }
      } catch (err) {
        console.error('ルーム詳細取得エラー:', err);
        setError('ルーム詳細の取得中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoomDetail();
  }, [roomId]);
  
  // ルームに参加する
  const handleJoinRoom = async () => {
    if (!state.isAuthenticated) {
      router.push(`/login?redirect=/rooms/${roomId}`);
      return;
    }
    
    setIsJoining(true);
    setActionError(null);
    
    try {
      const response = await joinRoom({ roomId });
      
      if (response.success) {
        // 詳細を再取得して表示を更新
        const roomResponse = await getRoomById(roomId);
        if (roomResponse.success && roomResponse.data) {
          setRoom({
            ...roomResponse.data.room,
            userAccess: roomResponse.data.userAccess
          });
        }
      } else {
        setActionError(response.message || 'ルーム参加に失敗しました');
      }
    } catch (err) {
      console.error('ルーム参加エラー:', err);
      setActionError('ルーム参加中にエラーが発生しました');
    } finally {
      setIsJoining(false);
    }
  };
  
  // ルームから退出する
  const handleLeaveRoom = async () => {
    setIsLeaving(true);
    setActionError(null);
    setShowLeaveConfirm(false);
    
    try {
      const response = await leaveRoom(roomId);
      
      if (response.success) {
        // 詳細を再取得して表示を更新
        const roomResponse = await getRoomById(roomId);
        if (roomResponse.success && roomResponse.data) {
          setRoom({
            ...roomResponse.data.room,
            userAccess: roomResponse.data.userAccess
          });
        }
      } else {
        setActionError(response.message || 'ルーム退出に失敗しました');
      }
    } catch (err) {
      console.error('ルーム退出エラー:', err);
      setActionError('ルーム退出中にエラーが発生しました');
    } finally {
      setIsLeaving(false);
    }
  };
  
  // ルームを終了する（ホスト専用）
  const handleEndRoom = async () => {
    setIsEnding(true);
    setActionError(null);
    setShowEndConfirm(false);
    
    try {
      const response = await endRoom(roomId);
      
      if (response.success) {
        // 詳細を再取得して表示を更新
        const roomResponse = await getRoomById(roomId);
        if (roomResponse.success && roomResponse.data) {
          setRoom({
            ...roomResponse.data.room,
            userAccess: roomResponse.data.userAccess
          });
        }
      } else {
        setActionError(response.message || 'ルーム終了に失敗しました');
      }
    } catch (err) {
      console.error('ルーム終了エラー:', err);
      setActionError('ルーム終了中にエラーが発生しました');
    } finally {
      setIsEnding(false);
    }
  };
  
  // セッションに参加する（WebRTCルームに接続）
  const handleJoinSession = () => {
    router.push(`/rooms/${roomId}/session`);
  };
  
  // ローディング表示
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">ロード中...</p>
      </div>
    );
  }
  
  // エラー表示
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          <p>{error}</p>
          <button
            onClick={() => router.push('/rooms')}
            className="mt-4 bg-white text-red-700 border border-red-300 px-4 py-2 rounded-md hover:bg-red-50"
          >
            ルーム一覧に戻る
          </button>
        </div>
      </div>
    );
  }
  
  // ルームが見つからない場合
  if (!room) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-100 p-8 rounded-md text-center">
          <p className="text-gray-500">ルームが見つかりませんでした</p>
          <button
            onClick={() => router.push('/rooms')}
            className="mt-4 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50"
          >
            ルーム一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ルームヘッダー */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <h1 className="text-3xl font-bold">{room.title}</h1>
          <RoomStatusBadge status={room.status} />
        </div>
        <p className="text-gray-600 mt-2">{room.description}</p>
      </div>
      
      {/* アクションエラー表示 */}
      {actionError && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">
          <p>{actionError}</p>
        </div>
      )}
      
      {/* ルーム情報と参加者 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ルーム情報カード */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">ルーム情報</h2>
            
            <div className="space-y-4">
              {/* ホスト情報 */}
              <div className="flex items-center space-x-4">
                <span className="text-gray-600 w-32">ホスト:</span>
                <div className="flex items-center">
                  <UserAvatar 
                    user={room.hostUser} 
                    size={40} 
                  />
                  <span className="ml-2">{room.hostUser.name}</span>
                </div>
              </div>
              
              {/* ステータス */}
              <div className="flex items-center space-x-4">
                <span className="text-gray-600 w-32">ステータス:</span>
                <RoomStatusBadge status={room.status} />
              </div>
              
              {/* スケジュール情報 */}
              {room.scheduledStartAt && (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600 w-32">開始予定:</span>
                  <span>{formatDate(room.scheduledStartAt, true)}</span>
                </div>
              )}
              
              {room.startedAt && (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600 w-32">開始時間:</span>
                  <span>{formatDate(room.startedAt, true)}</span>
                </div>
              )}
              
              {room.endedAt && (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600 w-32">終了時間:</span>
                  <span>{formatDate(room.endedAt, true)}</span>
                </div>
              )}
              
              {/* 参加者情報 */}
              <div className="flex items-center space-x-4">
                <span className="text-gray-600 w-32">参加者数:</span>
                <span>{room.currentParticipants}/{room.maxParticipants}</span>
              </div>
              
              {/* 料金情報 */}
              {room.isPaid && room.price && (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600 w-32">料金:</span>
                  <span className="text-green-600 font-medium">¥{room.price.toLocaleString()}</span>
                </div>
              )}
              
              {/* アーカイブ設定 */}
              <div className="flex items-center space-x-4">
                <span className="text-gray-600 w-32">アーカイブ:</span>
                <span>{room.isArchiveEnabled ? '有効' : '無効'}</span>
              </div>
              
              {/* 録画URL（終了済みの場合） */}
              {room.status === 'ended' && room.recordingUrl && (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600 w-32">録画:</span>
                  <a 
                    href={room.recordingUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    録画を視聴する
                  </a>
                </div>
              )}
              
              {/* 招待リンク（ホストの場合） */}
              {room.userAccess?.isHost && room.joinToken && (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600 w-32">招待:</span>
                  <button
                    onClick={() => setShowJoinToken(true)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    招待リンクを表示
                  </button>
                </div>
              )}
            </div>
            
            {/* アクションボタン */}
            <div className="mt-8 flex flex-wrap gap-4">
              {/* 参加ボタン */}
              {room.userAccess?.canJoin && (
                <button
                  onClick={handleJoinRoom}
                  disabled={isJoining}
                  className={`px-4 py-2 rounded-md text-white font-medium ${
                    isJoining
                      ? 'bg-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isJoining ? '参加処理中...' : 'ルームに参加'}
                </button>
              )}
              
              {/* セッション参加ボタン（参加者の場合） */}
              {room.userAccess?.isParticipant && room.status === 'live' && (
                <button
                  onClick={handleJoinSession}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  セッションに参加
                </button>
              )}
              
              {/* 退出ボタン（参加者がホストではない場合） */}
              {room.userAccess?.isParticipant && !room.userAccess?.isHost && (
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  disabled={isLeaving}
                  className={`px-4 py-2 rounded-md font-medium ${
                    isLeaving
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-white text-red-600 border border-red-300 hover:bg-red-50'
                  }`}
                >
                  {isLeaving ? '退出処理中...' : 'ルームを退出'}
                </button>
              )}
              
              {/* ライブ開始ボタン（ホストの場合、scheduled状態） */}
              {room.userAccess?.isHost && room.status === 'scheduled' && (
                <button
                  onClick={handleJoinSession}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  ライブを開始
                </button>
              )}
              
              {/* セッションに戻るボタン（ホストの場合、live状態） */}
              {room.userAccess?.isHost && room.status === 'live' && (
                <button
                  onClick={handleJoinSession}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  セッションに戻る
                </button>
              )}
              
              {/* ルーム終了ボタン（ホストの場合、ended以外） */}
              {room.userAccess?.isHost && room.status !== 'ended' && (
                <button
                  onClick={() => setShowEndConfirm(true)}
                  disabled={isEnding}
                  className={`px-4 py-2 rounded-md font-medium ${
                    isEnding
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-white text-red-600 border border-red-300 hover:bg-red-50'
                  }`}
                >
                  {isEnding ? '終了処理中...' : 'ルームを終了'}
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* 参加者リスト */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">参加者 ({room.currentParticipants})</h2>
            
            {room.participants && room.participants.length > 0 ? (
              <ul className="space-y-4">
                {room.participants.map(participant => (
                  <li key={participant.id} className="flex items-center space-x-3">
                    <UserAvatar 
                      user={participant} 
                      size={40} 
                    />
                    <div>
                      <p className="font-medium">{participant.name}</p>
                      {room.hostUser.id === participant.id && (
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                          ホスト
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">参加者はまだいません</p>
            )}
          </div>
        </div>
      </div>
      
      {/* 招待トークンダイアログ */}
      {showJoinToken && room.joinToken && (
        <JoinTokenDialog
          roomId={room.id}
          joinToken={room.joinToken}
          onClose={() => setShowJoinToken(false)}
        />
      )}
      
      {/* 退出確認ダイアログ */}
      {showLeaveConfirm && (
        <ConfirmDialog
          title="ルーム退出の確認"
          message="このルームから退出しますか？"
          confirmText="退出する"
          cancelText="キャンセル"
          onConfirm={handleLeaveRoom}
          onCancel={() => setShowLeaveConfirm(false)}
        />
      )}
      
      {/* 終了確認ダイアログ */}
      {showEndConfirm && (
        <ConfirmDialog
          title="ルーム終了の確認"
          message="このルームを終了しますか？全ての参加者がセッションから切断されます。"
          confirmText="終了する"
          cancelText="キャンセル"
          onConfirm={handleEndRoom}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}
    </div>
  );
};

export default RoomDetailPage; 