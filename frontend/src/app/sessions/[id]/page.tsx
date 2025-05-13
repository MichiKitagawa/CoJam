'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import {
  // getRoomById,
  // RoomDetail,
  // joinRoom,
  // leaveRoom,
  // endRoom,
  // applyForPerformer,
  // getPerformerApplications,
  // respondToApplication,
  // RoomApplication,
  // startRoom,
  getSessionById, // ★ getRoomById -> getSessionById
  SessionDetail, // ★ RoomDetail -> SessionDetail
  // joinSession, // joinRoom はコメントアウトされていたため、session版もコメントアウト
  // leaveSession, // leaveRoom はコメントアウトされていたため、session版もコメントアウト
  endSession, // ★ endRoom -> endSession
  applyForSessionPerformer, // ★ applyForPerformer -> applyForSessionPerformer
  getSessionApplications, // ★ getPerformerApplications -> getSessionApplications
  respondToSessionApplication, // ★ respondToApplication -> respondToSessionApplication
  SessionApplication, // ★ RoomApplication -> SessionApplication
  startSession, // ★ startRoom -> startSession
} from '../../../services/sessionService'; // ★ roomService -> sessionService
import { formatDate } from '../../../utils/dateFormatter';
// import RoomStatusBadge from '../../../components/rooms/RoomStatusBadge'; // 旧パス
import SessionStatusBadge from '../../../components/sessions/SessionStatusBadge'; // ★ 新パス・新コンポーネント
import UserAvatar from '../../../components/common/UserAvatar';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import io, { Socket } from 'socket.io-client';
import SessionJoinInfoDialog from '../../../components/sessions/SessionJoinInfoDialog'; // ★ 招待用ダイアログ
import { toast } from 'react-hot-toast';

// WebSocketから送られてくるセッションステータス変更データの型
interface SessionStatusUpdateData {
  status?: SessionDetail['status'];
  currentParticipants?: number;
  startedAt?: string;
  endedAt?: string;
}

const SessionDetailPage: React.FC = () => { // ★ RoomDetailPage -> SessionDetailPage
  const routeParams = useParams(); 
  const sessionId = routeParams.id as string; // ★ roomId -> sessionId
  const { state: authState } = useAuth(); 
  const router = useRouter();
  
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null); // ★ roomDetail -> sessionDetail
  const [userAccess, setUserAccess] = useState<SessionDetail['userAccess'] | null>(null);
  const [activeSessionInfo, setActiveSessionInfo] = useState<SessionDetail | null>(null); // ★ activeRoomInfo -> activeSessionInfo
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // ★ isJoining, isLeaving, isEnding の意味合いが変わる可能性あり (セッション配信への参加/退出か、セッション自体か)
  const [isJoining, setIsJoining] = useState<boolean>(false); // セッション(配信)参加中
  const [isLeaving, setIsLeaving] = useState<boolean>(false); // セッション(配信)退出中
  const [isEnding, setIsEnding] = useState<boolean>(false); // セッション終了処理中
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false); // セッション退出確認
  const [showEndConfirm, setShowEndConfirm] = useState<boolean>(false); // セッション終了確認
  const [actionError, setActionError] = useState<string | null>(null);

  const [applications, setApplications] = useState<SessionApplication[]>([]); // ★ RoomApplication -> SessionApplication
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isResponding, setIsResponding] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState<boolean>(false); // ★ 招待ダイアログ表示状態
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSessionData = useCallback(async () => { // ★ fetchRoomData -> fetchSessionData
    if (!sessionId) return; // ★ roomId -> sessionId
    setLoading(true);
    setError(null);
    try {
      const response = await getSessionById(sessionId); // ★ getRoomById -> getSessionById
      if (response.success && response.data) {
        setSessionDetail(response.data.session); // ★ room -> session
        setUserAccess(response.data.userAccess || null); 
        console.log('Fetched Session Detail:', response.data.session); // ★ Room -> Session
        console.log('Fetched User Access for non-host:', response.data.userAccess);
        if (response.data.userAccess?.isHost) {
          fetchApplications();
        }
      } else {
        setError(response.message || 'セッション情報の取得に失敗しました'); // ★ ルーム -> セッション
      }
    } catch (err) {
      console.error('セッション詳細取得エラー:', err); // ★ ルーム -> セッション
      setError('セッション詳細の取得中にエラーが発生しました'); // ★ ルーム -> セッション
    } finally {
      setLoading(false);
    }
  }, [sessionId]); // ★ roomId -> sessionId

  const fetchApplications = async () => {
    if (!sessionId) return; // ★ roomId -> sessionId
    try {
      const res = await getSessionApplications(sessionId); // ★ getPerformerApplications -> getSessionApplications
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
    // 自分が他のセッションに参加中なら、そのセッション情報を取得
    if (authState.user?.activeRoomId && authState.user.activeRoomId !== sessionId) { // ★ roomId -> sessionId (DB側の activeRoomId はまだ未修正かも)
      getSessionById(authState.user.activeRoomId).then(res => { // ★ getRoomById -> getSessionById
        if (res.success && res.data) {
          setActiveSessionInfo(res.data.session); // ★ activeRoomInfo -> activeSessionInfo, room -> session
        } else {
          setActiveSessionInfo(null); 
          if (authState.user) {
            console.warn(`Failed to fetch active session info for ${authState.user.activeRoomId}: ${res.message}`);
          } else {
            console.warn(`Failed to fetch active session info as user is null: ${res.message}`);
          }
        }
      });
    } else {
      setActiveSessionInfo(null); // 現在のセッションページであるか、どのセッションにも参加していない場合はクリア
    }
  }, [authState.user?.activeRoomId, sessionId]); // ★ roomId -> sessionId

  useEffect(() => {
    fetchSessionData(); // ★ fetchRoomData -> fetchSessionData
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const currentAbortController = abortControllerRef.current;

    const token = localStorage.getItem('token');
    if (!sessionId || !token || !authState.user?.id) return; // ★ roomId -> sessionId

    const newSocket: Socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080', {
      path: `/socket.io`, 
      query: { token }, 
      auth: { userId: authState.user.id, roomId: sessionId } // ★ auth の roomId に sessionId を設定 (サーバー側が roomId を期待している前提)
    });
    setSocket(newSocket);
    
    console.log(`Attempting to connect WebSocket with sessionId: ${sessionId} and userId: ${authState.user.id}`); // ★ roomId -> sessionId

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsSocketConnected(true);
      // 接続時にセッションに参加する
      newSocket.emit('join-session', { sessionId: sessionId, userId: authState.user?.id });
    });
    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsSocketConnected(false);
      // 必要であれば再接続処理など
    });
    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      // 必要であればエラーハンドリング
    });

    // 参加申請の結果を受信
    newSocket.on('application_responded', (response: { applicationId: string; sessionId: string; status: 'approved' | 'rejected' | 'canceled'; message?: string }) => { // ★ roomId -> sessionId
      console.log('Application responded:', response);
      // 自分の申請への応答の場合
      if (response.sessionId === sessionId) { 
        fetchSessionData(); // セッションデータを再取得してUIを更新
        if(response.status === 'approved') {
          toast.success("参加申請が承認されました。演者としてセッションに参加します。");
          // 必要であれば自動でWebRTC参加などの処理
        } else if (response.status === 'rejected') {
          toast.error("参加申請が拒否されました");
        } else if (response.status === 'canceled') {
          toast.error("参加申請がキャンセルされました");
        }
      }
    });
    
    // ホストが受け取る演者申請の通知 (必要な場合)
    newSocket.on('session_performer_application_received', (application: any) => { // ★ イベント名変更
        console.log('New performer application received:', application);
        // UIに通知を表示するなどの処理
         toast(`新しい演者参加申請があります: ユーザー ${application.userId?.name || '不明'} が参加を希望しています。`);
         // 申請リストを更新するために再フェッチ
         if (userAccess?.isHost) { // ホストのみ申請リストを再取得
            fetchApplications();
         }
    });
    
    // ホストが演者を承認した際の通知 (WebRTC開始のトリガー)
    newSocket.on('session_participant_approved', ({ sessionId, userId, userName, role }: { sessionId: string, userId: string, userName: string, role: string }) => { // ★ イベント名変更, roomId -> sessionId
        console.log('Participant approved:', { sessionId, userId, userName, role });
        // WebRTCContext側で user_joined_session をトリガーにするため、ここでは特別な処理は不要かも
        // 必要であればUI更新など
        if (sessionId === sessionId) {
             toast(`${userName} が演者として参加しました。`);
        }
    });

    // セッションステータスの更新
    newSocket.on('session_status_updated', (updatedSessionData: SessionStatusUpdateData) => { // ★ イベント名変更
      console.log('Session status updated:', updatedSessionData);
      setSessionDetail(prev => prev ? { ...prev, ...updatedSessionData } : null); // ★ roomDetail -> sessionDetail
    });

    return () => {
      console.log('Disconnecting WebSocket and aborting API calls');
      if (newSocket) { // ★ socket -> newSocket でチェック
        newSocket.disconnect();
      }
      setSocket(null);
      currentAbortController.abort();
    };
  }, [sessionId, authState.user, fetchSessionData, userAccess?.isHost, applications, router]); // ★ roomId -> sessionId, 依存配列に applications, router を追加

  // ★★★ 認証状態のローディングチェックを追加 ★★★
  if (authState.authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>認証情報を確認中...</p>
      </div>
    );
  }

  // セッション参加 (役割に応じて)
  const handleJoinSession = async () => {
    if (!sessionDetail || !authState.user) return;

    const role = userAccess?.isHost ? 'host' 
               : userAccess?.applicationStatus === 'approved' ? 'performer'
               : 'viewer';

    setActionError(null);
    setIsJoining(true);

    if (role === 'host' && sessionDetail.status === 'ready') {
      // ホストが準備完了セッションに参加 → セッション開始 (今すぐ配信と同じ扱いにするか、別のボタンにするか要検討)
      try {
        const response = await startSession(sessionId); // ★ startRoom -> startSession
        if (response.success && response.session) {
          // 成功したらセッションページへ遷移 (WebRTC接続などはそちらで)
          router.push(`/sessions/${sessionId}/session?role=host`);
        } else {
          setActionError(response.message || 'セッションの開始に失敗しました。');
          alert(response.message || 'セッションの開始に失敗しました。');
        } 
      } catch (err) {
        console.error('Error starting session:', err);
        setActionError('セッションの開始中にエラーが発生しました。');
        alert('セッションの開始中にエラーが発生しました。');
      } finally {
         setIsJoining(false);
      }
    } else if (role === 'host' && sessionDetail.status === 'scheduled') {
      // ホストが予定セッションに参加 → 準備完了にするか、そのまま待機画面か？
      // 現状では特にAPIコールはせず、セッションページへの遷移のみとする
      // (もし開始時間になったら自動で開始するなら、そのロジックはサーバー側)
       router.push(`/sessions/${sessionId}/session?role=host`);
       setIsJoining(false); // APIコールがないのですぐ完了
    } else if (sessionDetail.status === 'live') {
       // ライブ中のセッションには役割に応じて遷移
       router.push(`/sessions/${sessionId}/session?role=${role}`);
       setIsJoining(false); // APIコールがないのですぐ完了
    } else if (sessionDetail.status === 'ended') {
        alert('このセッションは既に終了しています。');
        setIsJoining(false);
    } else {
        // その他のステータス (scheduledでhost以外など) - viewerとして参加させるか？
        alert('まだセッションに参加できません。');
        setIsJoining(false);
    }
  };

  // 演者参加申請
  const handleApplyForPerformer = async () => {
    if (!sessionId || !authState.user || userAccess?.isHost || userAccess?.isParticipant || userAccess?.applicationStatus === 'pending') {
      return;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // 前回の申請をキャンセル
    }
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    
    setIsApplying(true);
    setActionError(null);
    
    try {
      const response = await applyForSessionPerformer(sessionId, signal); // ★ applyForPerformer -> applyForSessionPerformer
      if (response.success && response.application) {
        setUserAccess(prev => prev ? { ...prev, applicationStatus: 'pending', canApply: false } : null);
        alert('演者として参加申請しました。ホストの承認をお待ちください。');
      } else {
        setActionError(response.message || '参加申請に失敗しました。');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Application request aborted');
      } else {
        console.error('演者参加申請エラー:', error);
        setActionError('参加申請中にエラーが発生しました。');
      }
    } finally {
      setIsApplying(false);
      abortControllerRef.current = null; // 完了したらクリア
    }
  };

  // 申請への応答 (ホスト用)
  const handleRespondToApplication = async (applicationId: string, action: 'approve' | 'reject') => {
    if (!sessionId) return;
    setIsResponding(applicationId);
    setActionError(null);
    try {
      const response = await respondToSessionApplication(sessionId, applicationId, action); // ★ respondToApplication -> respondToSessionApplication
      if (response.success) {
        fetchApplications(); // 申請リストを更新
        // 必要なら、承認/拒否されたユーザーに通知がWebSocket経由で飛ぶ（サーバー実装による）
      } else {
        setActionError(response.message || '申請への応答に失敗しました。');
      }
    } catch (error) {
      console.error('申請応答エラー:', error);
      setActionError('申請への応答中にエラーが発生しました。');
    } finally {
      setIsResponding(null);
    }
  };

  // セッション退出処理 (これは配信からの退出であり、セッション自体は終了しない)
  const handleLeaveSession = async () => {
    // このページには退出ボタンはない想定。セッション参加ページからの遷移をハンドルする。
    // 必要なら、このページに残る理由がない場合に一覧へリダイレクトするなどの処理を追加。
    setShowLeaveConfirm(false);
    router.push('/sessions'); // 一覧へ戻る
  };

  // セッション終了処理 (ホスト用)
  const handleEndSession = async () => {
    if (!sessionId) return;
    setIsEnding(true);
    setActionError(null);
    try {
      const response = await endSession(sessionId); // ★ endRoom -> endSession
      if (response.success) {
        alert('セッションを終了しました。');
        fetchSessionData(); // 状態を更新
      } else {
        setActionError(response.message || 'セッションの終了に失敗しました。');
      }
    } catch (error) {
      console.error('セッション終了エラー:', error);
      setActionError('セッション終了中にエラーが発生しました。');
    } finally {
      setIsEnding(false);
      setShowEndConfirm(false);
    }
  };

  // 招待ダイアログを開く
  const handleOpenInviteDialog = () => {
    if (sessionDetail?.joinToken) {
      setShowInviteDialog(true);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>セッション情報を読み込み中...</p> {/* ★ ルーム -> セッション */}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-red-500">
        <p>エラー: {error}</p>
        <button onClick={() => router.push('/sessions')} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">セッション一覧に戻る</button> {/* ★ ルーム -> セッション */}
      </div>
    );
  }

  if (!sessionDetail) {
    return (
      <div className="container mx-auto p-4 text-gray-500">
        <p>セッションが見つかりません。</p> {/* ★ ルーム -> セッション */}
        <button onClick={() => router.push('/sessions')} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">セッション一覧に戻る</button> {/* ★ ルーム -> セッション */}
      </div>
    );
  }

  // レンダリングロジック
  const isHost = userAccess?.isHost || false;
  const isParticipant = userAccess?.isParticipant || false; // 現在参加中かどうか (activeRoomIdに基づく)
  const canJoin = userAccess?.canJoin || false; // 参加資格があるか
  const applicationStatus = userAccess?.applicationStatus;
  const canApply = userAccess?.canApply || false;
  const userRole = userAccess?.userRole; // viewer, performer, host など

  // 参加ボタンの表示ロジックを詳細化
  const renderJoinButton = () => {
    // 既に他のセッションに参加中の場合
    if (activeSessionInfo) {
      return (
        <div className="my-4 p-4 bg-yellow-100 border border-yellow-300 rounded">
          <p className="text-yellow-800">
            現在、別のセッション「{activeSessionInfo.title}」に{userAccess?.userRole === 'host' ? 'ホスト' : userAccess?.userRole === 'performer' ? '演者' : 'リスナー'}として参加中です。
          </p>
          <button 
            onClick={() => router.push(`/sessions/${activeSessionInfo.id}/session`)} 
            className="mt-2 next-button button-secondary text-sm"
          >
            参加中のセッションに戻る
          </button>
        </div>
      );
    }

    // このセッションが終了している場合
    if (sessionDetail.status === 'ended') {
      return <p className="text-gray-500 mt-4">このセッションは終了しました。</p>;
    }

    // まだ開始されていないセッションで、参加資格がない場合 (ホスト以外)
    if (sessionDetail.status === 'scheduled' && !isHost) {
        return <p className="text-gray-500 mt-4">開始時刻までお待ちください。</p>;
    }

    // 参加可能な場合 (ライブ中、または自分がホストで scheduled/ready)
    if (sessionDetail.status === 'live' || isHost) {
        return (
          <button
            onClick={handleJoinSession}
            disabled={isJoining}
            className="next-button button-primary w-full text-lg py-3 mt-6 disabled:opacity-70"
          >
            {isJoining ? '参加処理中...' : 
              isHost ? (sessionDetail.status === 'ready' || sessionDetail.status === 'scheduled' ? 'セッションを開始する' : 'セッションに参加する') 
              : 'セッションに参加する'}
          </button>
        );
    }

    // 参加申請ボタンの表示 (参加資格がなく、申請可能で、まだ申請していない場合)
    if (canApply && !applicationStatus) {
      return (
        <button
          onClick={handleApplyForPerformer}
          disabled={isApplying}
          className="next-button button-secondary w-full text-lg py-3 mt-6 disabled:opacity-70"
        >
          {isApplying ? '申請中...' : '演者として参加申請'}
        </button>
      );
    }

    // 申請中の場合
    if (applicationStatus === 'pending') {
      return (
        <div className="my-4 p-4 bg-blue-100 border border-blue-300 rounded">
          <p className="text-blue-800">演者としての参加申請は現在承認待ちです。</p>
          {/* TODO: 申請取り消しボタン */} 
        </div>
      );
    }
    
    // 申請が拒否された場合
    if (applicationStatus === 'rejected') {
       return <p className="text-red-500 mt-4">参加申請は承認されませんでした。</p>;
    }

    // 参加資格がない場合 (その他のケース)
    return <p className="text-gray-500 mt-4">現在このセッションには参加できません。</p>;
  };

  // ホスト用コントロールボタン
  const renderHostControls = () => {
    if (!isHost) return null;

    return (
      <div className="mt-6 pt-6 border-t border-gray-700 space-y-3">
        <h3 className="text-lg font-semibold text-gray-300 mb-3">ホストコントロール</h3>
        {/* 招待ボタン */} 
        {sessionDetail.joinToken && (
           <button 
              onClick={handleOpenInviteDialog}
              className="next-button button-secondary w-full"
           >
              参加者を招待
           </button>
        )}
        {/* セッション終了ボタン */} 
        {sessionDetail.status !== 'ended' && (
          <button
            onClick={() => setShowEndConfirm(true)}
            disabled={isEnding}
            className="next-button button-danger w-full disabled:opacity-70"
          >
            {isEnding ? '終了処理中...' : 'セッションを終了する'}
          </button>
        )}
      </div>
    );
  };
  
  // 参加申請リスト (ホスト用)
  const renderApplicationsList = () => {
    if (!isHost || applications.length === 0) return null;

    return (
      <div className="mt-6 pt-6 border-t border-gray-700">
        <h3 className="text-lg font-semibold text-gray-300 mb-4">演者参加申請</h3>
        <ul className="space-y-3">
          {applications.map((app) => (
            <li key={app._id} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center">
                <UserAvatar user={{ id: app.userId._id, name: app.userId.name, profileImage: app.userId.profileImage }} size={32} className="mr-3" />
                <span className="text-gray-300 font-medium">{app.userId.name}</span>
                <span className="text-gray-500 text-xs ml-2">({app.status})</span>
              </div>
              {app.status === 'pending' && (
                <div className="space-x-2">
                  <button
                    onClick={() => handleRespondToApplication(app._id, 'approve')}
                    disabled={isResponding === app._id}
                    className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
                  >
                    承認
                  </button>
                  <button
                    onClick={() => handleRespondToApplication(app._id, 'reject')}
                    disabled={isResponding === app._id}
                    className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
                  >
                    拒否
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-zinc-200">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto">
          {/* セッションヘッダー */} 
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">{sessionDetail.title}</h1>
              <SessionStatusBadge status={sessionDetail.status} scheduledStartAt={sessionDetail.scheduledStartAt} size="md" />
            </div>
            <div className="flex items-center text-sm text-gray-400 mb-4">
              <UserAvatar user={sessionDetail.hostUser} size={24} className="mr-2" />
              <span>ホスト: {sessionDetail.hostUser.name}</span>
              <span className="mx-2">|</span>
              <span>最大参加者: {sessionDetail.maxParticipants}人</span>
              {sessionDetail.isPaid && sessionDetail.price && (
                <>
                  <span className="mx-2">|</span>
                  <span className="font-semibold text-emerald-400">{sessionDetail.price.toLocaleString()}円</span>
                </>
              )}
            </div>
            {sessionDetail.scheduledStartAt && sessionDetail.status === 'scheduled' && (
              <p className="text-sm text-sky-400 mb-4">開始予定: {formatDate(sessionDetail.scheduledStartAt, true)}</p>
            )}
            {sessionDetail.description && (
              <p className="text-gray-300 leading-relaxed mt-4">{sessionDetail.description}</p>
            )}
          </div>

          {/* アクションエリア */} 
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 shadow-lg">
            {actionError && <p className="text-red-400 mb-4">エラー: {actionError}</p>}
            
            {renderJoinButton()}
            
            {renderHostControls()}

            {renderApplicationsList()}
          </div>

          {/* 参加者リストなど (未実装) */} 
          {/* <div className="mt-8">*/} 
          {/*  <h2 className="text-xl font-semibold text-gray-300 mb-4">現在の参加者</h2>*/} 
          {/*  ...*/} 
          {/* </div>*/} 

        </div>
      </div>

      {/* 確認ダイアログ */} 
      {showLeaveConfirm && (
        <ConfirmDialog
          title="セッション退出確認"
          message="本当にこのセッションから退出しますか？配信からは退出しますが、セッション自体は継続します。"
          onConfirm={handleLeaveSession}
          onCancel={() => setShowLeaveConfirm(false)}
          confirmText="退出する"
          cancelText="キャンセル"
        />
      )}
      {showEndConfirm && (
        <ConfirmDialog
          title="セッション終了確認"
          message="本当にこのセッションを終了しますか？この操作は元に戻せません。"
          onConfirm={handleEndSession}
          onCancel={() => setShowEndConfirm(false)}
          confirmText="終了する"
          cancelText="キャンセル"
        />
      )}
      {/* 招待ダイアログ */} 
      {showInviteDialog && sessionDetail.joinToken && (
        <SessionJoinInfoDialog
          sessionId={sessionId}
          joinToken={sessionDetail.joinToken}
          onClose={() => setShowInviteDialog(false)}
        />
      )}
    </div>
  );
};

export default SessionDetailPage; 