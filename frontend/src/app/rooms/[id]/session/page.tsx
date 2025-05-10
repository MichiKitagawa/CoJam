'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext'; 
import { useWebRTC } from '@/contexts/WebRTCContext'; 
import AudioPlayer from '@/components/features/webrtc/AudioPlayer'; 
import ParticipantList from '@/components/features/webrtc/ParticipantList'; 
// import { getRoomById, RoomDetail } from '@/services/roomService'; // 必要に応じてルーム情報を取得

interface SessionPageProps {
  params: {
    id: string; // roomId
  }
}

const SessionPage: React.FC<SessionPageProps> = ({ params }) => {
  const roomId = params.id;
  const router = useRouter();
  const { state: authState } = useAuth();
  const {
    localStream,
    remoteStreams,
    myPeerId,
    initializeMedia,
    stopMedia,
    joinRoom: joinWebRTCRoom,
    leaveRoom: leaveWebRTCRoom,
    isMediaLoading,
    mediaError
  } = useWebRTC();

  const [isSessionJoined, setIsSessionJoined] = useState(false);

  const stableLeaveWebRTCRoom = useCallback(leaveWebRTCRoom, [leaveWebRTCRoom]);
  const stableInitializeMedia = useCallback(initializeMedia, [initializeMedia]);
  const stableStopMedia = useCallback(stopMedia, [stopMedia]);

  useEffect(() => {
    if (!authState.isAuthenticated || !authState.user) {
      router.push(`/login?redirect=/rooms/${roomId}/session`);
      return;
    }
    stableInitializeMedia().catch(console.error);

    // クリーンアップ関数
    return () => {
      stableStopMedia();
      if (isSessionJoined && authState.user) {
        stableLeaveWebRTCRoom(roomId, authState.user.id);
      }
    };
  // isSessionJoined を依存配列に追加し、動的にクリーンアップ内容が変わるようにする
  // authState.user.id も同様だが、通常セッション中にユーザーIDが変わることはないと想定
  }, [authState.isAuthenticated, authState.user, stableInitializeMedia, stableStopMedia, roomId, router, stableLeaveWebRTCRoom, isSessionJoined]);


  const handleJoinWebRTCSession = async () => {
    if (!localStream || !myPeerId || !authState.user) {
      alert('メディアの準備ができていないか、ユーザー情報がありません。');
      return;
    }
    try {
      joinWebRTCRoom(roomId, authState.user.id);
      setIsSessionJoined(true);
      console.log(`WebRTC session joined for room: ${roomId}, user: ${authState.user.id} (socket: ${myPeerId})`);
    } catch (error) {
      console.error('Failed to join WebRTC session:', error);
      alert('セッションへの参加に失敗しました。');
    }
  };

  const handleLeaveSession = () => {
    if (authState.user) {
      stableLeaveWebRTCRoom(roomId, authState.user.id);
    }
    setIsSessionJoined(false);
    // stableStopMedia(); // useEffectのクリーンアップで呼ばれるので、ここでは不要な場合も
    router.push(`/rooms/${roomId}`);
  };
  
  if (mediaError) {
    return (
      <div className="container mx-auto p-4 text-red-500">
        <p>メディアアクセスエラー: {mediaError.message}</p>
        <button onClick={() => router.push(`/rooms/${roomId}`)} className="mt-2 px-4 py-2 bg-gray-500 text-white rounded">ルーム詳細に戻る</button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">セッションルーム: {roomId}</h1>
      
      {!isSessionJoined && (
        <button
          onClick={handleJoinWebRTCSession}
          disabled={isMediaLoading || !localStream}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400 mb-4"
        >
          {isMediaLoading ? 'マイク準備中...' : (localStream ? 'セッションに参加する' : 'マイクへのアクセスを許可してください')}
        </button>
      )}

      {isSessionJoined && (
        <div>
          <button
            onClick={handleLeaveSession}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mb-6"
          >
            セッションを退出
          </button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <h2 className="text-xl font-semibold mb-3">参加者の音声</h2>
              {localStream && (
                <div className="mb-4 p-3 bg-gray-800 rounded">
                  <h3 className="text-lg text-gray-300 mb-1">あなたの音声 (マイク)</h3>
                  <AudioPlayer stream={localStream} isLocalStream={true} peerId={myPeerId || 'local'} />
                </div>
              )}
              {Object.keys(remoteStreams).length > 0 ? (
                Object.entries(remoteStreams).map(([peerId, stream]) => (
                  <div key={peerId} className="mb-4 p-3 bg-gray-700 rounded">
                    <h3 className="text-lg text-gray-400 mb-1">参加者: {peerId}</h3>
                    <AudioPlayer stream={stream} peerId={peerId} />
                  </div>
                ))
              ) : (
                <p className="text-gray-400">まだ他の参加者はいません。</p>
              )}
            </div>

            <div>
              <ParticipantList />
            </div>
          </div>
        </div>
      )}

      {!localStream && !isMediaLoading && !mediaError && (
         <div className="mt-4 p-4 border border-yellow-500 text-yellow-300 rounded">
           <p>マイクへのアクセスが許可されていません。ブラウザの設定を確認し、マイクへのアクセスを許可してください。</p>
           <button onClick={() => stableInitializeMedia().catch(console.error)} className="mt-2 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded">
             再度マイクへのアクセスを試す
           </button>
         </div>
      )}
    </div>
  );
};

export default SessionPage; 