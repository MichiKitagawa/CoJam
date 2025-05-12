'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getRoomById,
  RoomDetail,
  joinRoom,
  leaveRoom,
  endRoom,
  applyForPerformer,
  getPerformerApplications,
  respondToApplication,
  RoomApplication,
  startRoom,
} from '../../../services/roomService';
import { formatDate } from '../../../utils/dateFormatter';
import RoomStatusBadge from '../../../components/rooms/RoomStatusBadge';
import UserAvatar from '../../../components/common/UserAvatar';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import io, { Socket } from 'socket.io-client';

// WebSocketから送られてくるルームステータス変更データの型を仮定
interface RoomStatusUpdateData {
  status?: RoomDetail['status'];
  currentParticipants?: number;
  startedAt?: string;
  endedAt?: string;
}


const RoomDetailPage: React.FC = () => {
  const routeParams = useParams(); 
  const roomId = routeParams.id as string; 
  const { state: authState } = useAuth(); 
  const router = useRouter();
  
  const [roomDetail, setRoomDetail] = useState<RoomDetail | null>(null);
  const [userAccess, setUserAccess] = useState<RoomDetail['userAccess'] | null>(null);
  const [activeRoomInfo, setActiveRoomInfo] = useState<RoomDetail | null>(null); // 参加中の別ルーム情報
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isLeaving, setIsLeaving] = useState<boolean>(false);
  const [isEnding, setIsEnding] = useState<boolean>(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false);
  const [showEndConfirm, setShowEndConfirm] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [applications, setApplications] = useState<RoomApplication[]>([]);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isResponding, setIsResponding] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchRoomData = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getRoomById(roomId);
      if (response.success && response.data) {
        setRoomDetail(response.data.room);
        setUserAccess(response.data.userAccess || null); 
        console.log('Fetched Room Detail:', response.data.room);
        console.log('Fetched User Access for non-host:', response.data.userAccess);
        if (response.data.userAccess?.isHost) {
          fetchApplications();
        }
      } else {
        setError(response.message || 'ルーム情報の取得に失敗しました');
      }
    } catch (err) {
      console.error('ルーム詳細取得エラー:', err);
      setError('ルーム詳細の取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const fetchApplications = async () => {
    if (!roomId) return;
    try {
      const res = await getPerformerApplications(roomId);
      if (res.success && res.applications) {
        setApplications(res.applications);
      } else {
        console.warn('参加申請一覧の取得に失敗:', res.message);
      }
    } catch (err) {
      console.error('参加申請一覧取得エラー:', err);
    }
  };

  useEffect(() => {
    // 自分が他のルームに参加中なら、そのルーム情報を取得
    if (authState.user?.activeRoomId && authState.user.activeRoomId !== roomId) {
      getRoomById(authState.user.activeRoomId).then(res => {
        if (res.success && res.data) {
          setActiveRoomInfo(res.data.room);
        } else {
          // 取得に失敗した場合でも、参加中である事実は変わらないのでnullのままにするか、
          // あるいはエラーメッセージ用のstateを用意しても良い
          setActiveRoomInfo(null); 
          if (authState.user) { // ユーザーがnullでないことを確認
            console.warn(`Failed to fetch active room info for ${authState.user.activeRoomId}: ${res.message}`);
          } else {
            console.warn(`Failed to fetch active room info as user is null: ${res.message}`);
          }
        }
      });
    } else {
      setActiveRoomInfo(null); // 現在のルームページであるか、どのルームにも参加していない場合はクリア
    }
  }, [authState.user?.activeRoomId, roomId]);

  useEffect(() => {
    fetchRoomData();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const currentAbortController = abortControllerRef.current;

    const token = localStorage.getItem('token');
    if (!roomId || !token || !authState.user?.id) return;

    const newSocket: Socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080', {
      path: `/socket.io`, 
      query: { token }, 
      auth: { userId: authState.user.id, roomId } 
    });
    setSocket(newSocket);
    
    console.log(`Attempting to connect WebSocket with roomId: ${roomId} and userId: ${authState.user.id}`);

    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id);
      // サーバーにルーム参加を通知 (socket.data.userId を使う場合、サーバー側でsocket.join(socket.handshake.auth.roomId)など)
      // newSocket.emit('join_room_ws', { roomId, userId: authUser.id }); 
    });
    newSocket.on('disconnect', (reason) => console.log('WebSocket disconnected:', reason));
    newSocket.on('connect_error', (err) => console.error('WebSocket connection error:', err));

    newSocket.on('performer_application_received', (newApplication: RoomApplication) => {
      console.log('Performer application received:', newApplication);
      if (userAccess?.isHost && newApplication.roomId === roomId) { // roomIdもチェック
        setApplications(prev => [...prev.filter(app => app._id !== newApplication._id), newApplication]);
      }
    });

    newSocket.on('application_responded', (response: { applicationId: string; roomId: string; status: 'approved' | 'rejected'; message?: string }) => {
      console.log('Application response received:', response);
      if (response.roomId === roomId) {
        const respondedApp = applications.find(app => app._id === response.applicationId);
        if (respondedApp && respondedApp.userId._id === authState.user?.id) {
           fetchRoomData(); 
           alert(`参加申請が${response.status === 'approved' ? '承認' : '拒否'}されました。${response.message || ''}`);
           if (response.status === 'approved') {
             // 自動遷移はせず、ユーザーにセッション参加ボタンを押させる
           }
        }
        // ホスト側でも申請リストから消すなどの処理
        if (userAccess?.isHost) {
            fetchApplications();
        }
      }
    });
    
    newSocket.on('room_participant_approved', (data: { roomId: string; userId: string; userName?: string }) => {
        console.log('Performer approved event:', data);
        if (data.roomId === roomId) {
            fetchRoomData();
        }
    });

    newSocket.on('user_joined_room', (data: { roomId: string; userId: string; userName?:string; role: string; }) => {
        console.log('User joined room event:', data);
        if(data.roomId === roomId && data.userId !== authState.user?.id) {
            fetchRoomData();
        }
    });
    
    newSocket.on('roomStatusUpdated', (updatedRoomData: RoomStatusUpdateData) => {
      console.log('Room status updated:', updatedRoomData);
      setRoomDetail(prev => prev ? { ...prev, ...updatedRoomData } : null);
    });

    return () => {
      console.log('Disconnecting WebSocket and aborting API calls');
      if (socket) {
        socket.disconnect();
      }
      setSocket(null);
      currentAbortController.abort();
    };
  }, [roomId, authState.user, fetchRoomData, userAccess?.isHost]);

  const handleApplyAsPerformer = async () => {
    if (!authState.isAuthenticated || !roomDetail) {
      router.push(`/login?redirect=/rooms/${roomId}`);
      return;
    }

    if (userAccess?.applicationStatus === 'pending') {
      setActionError('既に演者としての参加を申請済みです。ホストの承認をお待ちください。');
      return;
    }
    if (userAccess?.userRole === 'performer' || userAccess?.applicationStatus === 'approved') {
      setActionError('既に演者として参加しているか、参加が承認されています。');
      return;
    }
    if (userAccess && userAccess.canApply === false) { 
      setActionError('現在、演者として申請できません。（例：ルームが満員、または募集終了など）');
      return;
    }

    setIsApplying(true);
    setActionError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const response = await applyForPerformer(roomId, signal);
      if (response.success && response.application) {
        alert('演者としての参加を申請しました。');
        setUserAccess(prev => ({
          isHost: prev?.isHost || false,
          isParticipant: prev?.isParticipant || false,
          canJoin: prev?.canJoin || false,
          applicationStatus: 'pending',
          canApply: false, 
          userRole: prev?.userRole || null,
        }));
        if (response.application) {
            setApplications(prevApps => [...prevApps.filter(app => app._id !== response.application?._id), response.application!]);
        }
      } else if (response.message !== 'Request canceled') {
        setActionError(response.message || '申請に失敗しました。');
      }
    } catch (err: any) {
      if (err.name !== 'CanceledError') {
        setActionError(err.message || '申請中にエラーが発生しました。');
      }
    } finally {
      setIsApplying(false);
    }
  };

  const handleJoinAsViewer = async () => {
    if (!authState.isAuthenticated || !roomDetail) {
      router.push(`/login?redirect=/rooms/${roomId}`);
      return;
    }
    setIsJoining(true);
    setActionError(null);
    try {
      const response = await joinRoom({ roomId, role: 'viewer' });
      if (response.success) {
        router.push(`/rooms/${roomId}/session?role=viewer`);
      } else {
        setActionError(response.message || '視聴参加に失敗しました。');
        alert(response.message || '視聴参加に失敗しました。');
      }
    } catch (err: any) {
      setActionError(err.message || '視聴参加中にエラーが発生しました。');
      alert(err.message || '視聴参加中にエラーが発生しました。');
    } finally {
      setIsJoining(false);
    }
  };
  
  const handleJoinAsApprovedPerformer = async () => {
    if (!authState.isAuthenticated || !roomDetail) {
        router.push(`/login?redirect=/rooms/${roomId}`);
        return;
    }
    setIsJoining(true);
    setActionError(null);
    try {
        const response = await joinRoom({ roomId, role: 'performer' });
        if (response.success) {
            router.push(`/rooms/${roomId}/session?role=performer`);
        } else {
            setActionError(response.message || '演者としての参加に失敗しました。');
            alert(response.message || '演者としての参加に失敗しました。');
        }
    } catch (err:any) {
        setActionError(err.message || '演者参加処理中にエラー。');
        alert(err.message || '演者参加処理中にエラー。');
    } finally {
        setIsJoining(false);
    }
  };

  const handleRespondToApplication = async (applicationId: string, action: 'approve' | 'reject') => {
    if (!roomDetail || !authState.user?.id || !userAccess?.isHost) return;
    setIsResponding(applicationId); 
    setActionError(null);
    try {
      const response = await respondToApplication(roomId, applicationId, action);
      if (response.success && response.application) {
        alert(`申請を${action === 'approve' ? '承認' : '拒否'}しました。`);
        fetchRoomData(); 
      } else {
        setActionError(response.message || '応答に失敗しました。');
      }
    } catch (err: any) {
      setActionError(err.message || '応答中にエラーが発生しました。');
    } finally {
      setIsResponding(null);
    }
  };
  
  const handleJoinSession = async () => {
    if (!roomDetail) {
      alert('ルーム情報が読み込めていません。');
      return;
    }

    const isHost = userAccess?.isHost || false;
    const currentRole = isHost ? 'host' : userAccess?.userRole;

    if (!currentRole) {
      alert('ユーザーの役割が不明です。');
      return;
    }

    // ホストがまだライブでないルームに入ろうとしている場合、ルームを開始する
    if (isHost && roomDetail.status === 'ready') {
      try {
        setActionError(null);
        const response = await startRoom(roomId);
        if (response.success && response.room) {
          // roomDetail と userAccess を更新してUIを即時反映することも検討
          setRoomDetail(prev => prev ? { 
            ...prev, 
            status: response.room!.status as 'live',
            startedAt: response.room!.startedAt 
          } : null);
          // 成功したらセッションページへ
          router.push(`/rooms/${roomId}/session?role=host`);
        } else {
          setActionError(response.message || 'ルームの開始に失敗しました。');
          alert(response.message || 'ルームの開始に失敗しました。');
        }
      } catch (err: any) {
        setActionError(err.message || 'ルーム開始処理中にエラーが発生しました。');
        alert(err.message || 'ルーム開始処理中にエラーが発生しました。');
      }
    } else if (roomDetail.status === 'live') {
      // ルームが既にライブの場合、またはホストでないユーザーがライブ中のルームに参加する場合
      router.push(`/rooms/${roomId}/session?role=${currentRole}`);
    } else if (roomDetail.status === 'scheduled') {
      alert('このルームはまだ予定状態です。開始予定時刻になるまでお待ちください。');
    } else {
      alert('ルームがライブ状態ではありません。');
    }
  };

  const handleLeaveRoom = async () => {
    // 実装 (既存のものをベースに)
  };
  const handleEndRoom = async () => {
    if (!roomDetail || !userAccess?.isHost) {
      alert('ルームを終了する権限がありません。');
      return;
    }
    setIsEnding(true);
    setActionError(null);
    try {
      const response = await endRoom(roomId);
      if (response.success) {
        alert('ルームを終了しました。');
        // roomDetail ステートを更新
        setRoomDetail(prev => prev ? { 
          ...prev, 
          status: 'ended', 
          endedAt: new Date().toISOString() // APIレスポンスにendedAtがあればそれを使うのがより正確
        } : null);
        setUserAccess(prev => prev ? { ...prev, canJoin: false, canApply: false } : null); // 必要に応じてuserAccessも更新
        router.push('/rooms'); // ルーム一覧ページへ遷移
      } else {
        setActionError(response.message || 'ルームの終了に失敗しました。');
        alert(response.message || 'ルームの終了に失敗しました。');
      }
    } catch (err: any) {
      setActionError(err.message || 'ルーム終了処理中にエラーが発生しました。');
      alert(err.message || 'ルーム終了処理中にエラーが発生しました。');
    } finally {
      setIsEnding(false);
      setShowEndConfirm(false); // 確認ダイアログを閉じる
    }
  };

  if (loading && !roomDetail) { 
    return <div className="flex justify-center items-center h-64"><p>ロード中...</p></div>;
  }
  if (error) {
    return <div className="container mx-auto p-4"><p className="text-red-500">{error}</p></div>;
  }
  if (!roomDetail) {
    return <div className="container mx-auto p-4"><p>ルームが見つかりません。</p></div>;
  }

  const { title, description, hostUser, status, scheduledStartAt, startedAt, participants } = roomDetail;
  const isLive = status === 'live';
  const isReady = status === 'ready';
  const isEnded = status === 'ended';
  const isScheduled = status === 'scheduled';
  
  const canInteract = authState.isAuthenticated && !isEnded;
  const isCurrentUserHost = userAccess?.isHost || false;
  const currentUserApplicationStatus = userAccess?.applicationStatus;
  const isCurrentUserApprovedPerformer = userAccess?.userRole === 'performer' && userAccess?.isParticipant === true;

  // ユーザーが他のルームに参加しているかどうかのフラグ
  const isInAnotherRoom = !!(authState.user?.activeRoomId && authState.user.activeRoomId !== roomId);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <div className="mb-4">
        <RoomStatusBadge status={status} />
        {hostUser && <span className="ml-2 text-gray-600">ホスト: {hostUser.name}</span>}
        {/* (他の情報) */}
      </div>
      <p className="text-gray-700 mb-6">{description}</p>

      {actionError && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{actionError}</p>}

      {/* 他のルームに参加中の場合の表示 */} 
      {isInAnotherRoom && activeRoomInfo && (
        <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md shadow-md">
          <h3 className="font-bold text-lg mb-2">参加中のルームがあります</h3>
          <p>
            あなたは現在、ルーム「<span className="font-semibold">{activeRoomInfo.title}</span>」に
            「<span className="font-semibold">{authState.user?.activeRoomRole || '不明な役割'}</span>」として参加中です。
          </p>
          <p className="mt-1">
            このルーム「<span className="font-semibold">{title}</span>」に新たに参加・申請するには、まず現在のルームから退出するか、セッションを終了してください。
          </p>
          <a 
            href={`/rooms/${activeRoomInfo.id}`}
            className="inline-block mt-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded transition duration-150 ease-in-out"
          >
            参加中のルーム「{activeRoomInfo.title}」へ移動
          </a>
        </div>
      )}

      {/* 現在のルームに対する操作ボタン (他のルームに参加中でない場合) */}
      {!isInAnotherRoom && canInteract && (
        <div className="mb-6 space-y-3">
          {/* ユーザーがホストでも承認済み演者でもない場合 */}
          {!isCurrentUserHost && !isCurrentUserApprovedPerformer && userAccess && (
            <>
              {/* Case 1: 演者申請がペンディング中の場合 */}
              {userAccess.applicationStatus === 'pending' && (
                <p className="text-blue-600 bg-blue-100 p-3 rounded-md">演者としての参加を申請済みです。ホストの承認をお待ちください。</p>
              )}

              {/* Case 2: 演者申請がリジェクトされた場合 */}
              {userAccess.applicationStatus === 'rejected' && (
                <p className="text-orange-600 bg-orange-100 p-3 rounded-md">
                  演者としての参加申請が拒否されました。
                  {/* 再申請ボタン (canApplyがtrueの場合) */}
                  {userAccess.canApply && 
                    <button
                      onClick={handleApplyAsPerformer}
                      disabled={isApplying || isEnded}
                      className="ml-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                    >
                      {isApplying ? '申請中...' : '再度演者として参加申請する'}
                    </button>
                  }
                </p>
              )}

              {/* Case 3: まだ演者申請をしていない、またはリジェクト後で再申請可能な場合 */}
              {(!userAccess.applicationStatus || userAccess.applicationStatus === 'rejected') && userAccess.canApply && (
                <button
                  onClick={handleApplyAsPerformer}
                  disabled={isApplying || isEnded}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded w-full md:w-auto disabled:opacity-50"
                >
                  {isApplying ? '申請中...' : '演者として参加を申請する'}
                </button>
              )}

              {/* Case 4: ユーザーがまだ視聴者として参加していない場合 */}
              {userAccess.userRole !== 'viewer' && userAccess.userRole !== 'performer' && (
                <button
                  onClick={handleJoinAsViewer}
                  disabled={isJoining || isEnded}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded w-full md:w-auto disabled:opacity-50"
                >
                  {isJoining ? '参加処理中...' : '視聴者として参加する'}
                </button>
              )}

              {/* Case 5: 既に視聴者として参加済みの場合の表示 */}
              {userAccess.userRole === 'viewer' && (
                <>
                  {!isLive && (
                    <p className="text-gray-500">視聴者として参加済みです。ルームが開始されるのをお待ちください。</p>
                  )}
                  {isLive && (
                    <button
                      onClick={handleJoinSession}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded w-full md:w-auto"
                    >
                      セッションを視聴する
                    </button>
                  )}
                </>
              )}
            </>
          )}
          
          {/* 承認済み演者の場合の「承認済み演者としてセッションに参加」ボタン */}
          {isCurrentUserApprovedPerformer && !isCurrentUserHost && (
             <button
                onClick={handleJoinAsApprovedPerformer}
                disabled={isJoining || !isLive}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded w-full md:w-auto disabled:opacity-50"
              >
                {isJoining ? '参加処理中...' : '承認済み演者としてセッションに参加'}
              </button>
          )}
          
          {/* ホストまたは承認済み演者または視聴者で、ルームがライブの場合の汎用参加ボタン */}
          {userAccess && 
           (isCurrentUserHost || isCurrentUserApprovedPerformer || (userAccess.userRole === 'viewer' && authState.user?.activeRoomId === roomId)) && 
           isLive && (
            <button
              onClick={handleJoinSession}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded w-full md:w-auto"
            >
              {isCurrentUserHost ? 'セッションを開始/参加する (ホスト)' : (isCurrentUserApprovedPerformer ? 'セッションに参加する (演者)' : 'セッションを視聴する')}
            </button>
          )}

          {/* ホストが準備完了状態のルームでセッションを開始するボタン */}
          {userAccess && isCurrentUserHost && isReady && (
            <button
              onClick={handleJoinSession}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded w-full md:w-auto"
            >
              セッションを開始する (ホスト)
            </button>
          )}

           {!isLive && !isReady && 
            userAccess && 
            (isCurrentUserHost || isCurrentUserApprovedPerformer || (userAccess.userRole === 'viewer' && authState.user?.activeRoomId === roomId)) && (
            <p className="text-gray-500">ルームは現在ライブ状態ではありません。</p>
           )}
        </div>
      )}

      {/* ホストで、かつ他のルームに参加中でない場合の申請一覧 */}
      {!isInAnotherRoom && isCurrentUserHost && (
        <div className="mt-8 p-4 border rounded-md shadow-sm">
          <h2 className="text-xl font-semibold mb-3">参加申請一覧 ({applications.filter(app => app.status === 'pending').length}件 保留中)</h2>
          {applications.filter(app => app.status === 'pending').length > 0 ? (
            <ul className="space-y-3">
              {applications.filter(app => app.status === 'pending').map(app => (
                <li key={app._id} className="p-3 bg-gray-50 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div className="mb-2 sm:mb-0 flex items-center">
                    <UserAvatar user={{ id: app.userId._id, name: app.userId.name, profileImage: app.userId.profileImage }} size={32} />
                    <span className="font-medium ml-2">{app.userId.name || '不明なユーザー'}</span>
                    <span className="text-sm text-gray-600 ml-2">({formatDate(app.requestedAt)})</span>
                  </div>
                  <div className="space-x-0 sm:space-x-2 space-y-2 sm:space-y-0 flex flex-col sm:flex-row w-full sm:w-auto">
                    <button
                      onClick={() => handleRespondToApplication(app._id, 'approve')}
                      disabled={isResponding === app._id}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50 w-full sm:w-auto"
                    >
                      {isResponding === app._id && actionError !== `approve-${app._id}` ? '処理中' : '承認'}
                    </button>
                    <button
                      onClick={() => handleRespondToApplication(app._id, 'reject')}
                      disabled={isResponding === app._id}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50 w-full sm:w-auto"
                    >
                      {isResponding === app._id && actionError !== `reject-${app._id}` ? '処理中' : '拒否'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">保留中の参加申請はありません。</p>
          )}
        </div>
      )}
      
      {/* 参加者リスト */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-3">現在の参加者 ({participants?.length || 0}名 / 最大{roomDetail.maxParticipants}名)</h2>
        {participants && participants.length > 0 ? (
          <ul className="space-y-2">
            {participants.map(p => (
              <li key={p.id} className="flex items-center p-2 bg-gray-100 rounded">
                <UserAvatar user={{ id: p.id, name: p.name, profileImage: p.profileImage }} size={32} />
                <span className="ml-2">{p.name} {p.id === roomDetail.hostUser?.id ? '(ホスト)' : ''}</span>
                 {/* ここで演者か視聴者かを表示できると良いが、現在のparticipantsにはその情報がない */}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">まだ参加者はいません。</p>
        )}
      </div>

      {/* 他のUI要素 (ConfirmDialogなど) */}
      {showLeaveConfirm && <ConfirmDialog
        title="ルーム退出"
        message="本当にこのルームから退出しますか？"
        onConfirm={handleLeaveRoom}
        onCancel={() => setShowLeaveConfirm(false)}
        confirmText="退出する"
        cancelText="キャンセル"
      />}
      {isCurrentUserHost && showEndConfirm && (
        <ConfirmDialog
          title="ルーム終了"
          message="本当にこのルームを終了しますか？終了すると元に戻せません。"
          onConfirm={handleEndRoom}
          onCancel={() => setShowEndConfirm(false)}
          confirmText="終了する"
          cancelText="キャンセル"
        />
      )}
       {/* ホスト向けの操作ボタン (ルーム終了など) - 他のルームに参加中でない場合のみ */}
       {!isInAnotherRoom && isCurrentUserHost && !isEnded && (
        <div className="mt-8 pt-4 border-t">
          <button 
            onClick={() => setShowEndConfirm(true)} 
            disabled={isEnding}
            className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {isEnding ? '終了処理中...' : 'ルームを終了する'}
          </button>
        </div>
      )}

    </div>
  );
};

export default RoomDetailPage; 