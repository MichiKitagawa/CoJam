import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Session, SessionApplication, User } from '../models';
import { IUser } from '../models/User';
import { CreateSessionDto, GetSessionsQueryDto, JoinSessionDto, SessionStatus, SortOrder } from '../dto/session.dto';
import { AuthRequest } from '../middleware/auth.middleware';
import { validateRequest } from '../utils/validator';
import { transformSessionToDetails } from '../utils/sessionTransformer';
import { isSessionFull, isSessionHost, isSessionParticipant } from '../utils/sessionValidation';
import { Server as SocketIOServer } from 'socket.io';

// ヘルパー関数 (実際のプロジェクトではutilsなどに配置)
async function findSocketIdByUserId(userId: string, io: SocketIOServer): Promise<string | null> {
  const sockets = await io.fetchSockets();
  for (const socket of sockets) {
    if (socket.data.userId === userId) { // socket.data.userId にユーザーIDが格納されている前提
      return socket.id;
    }
  }
  console.warn(`Socket ID not found for userId: ${userId}`);
  return null;
}

class SessionController {
  // ルーム作成エンドポイント
  async createSession(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: '認証が必要です' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'ユーザーが見つかりません' });
      }
      if (user.activeSessionId) {
        return res.status(409).json({ success: false, message: '既に他のセッションに参加中です。新しいセッションを作成できません。' });
      }
      
      const validationErrors = await validateRequest(CreateSessionDto, req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({ success: false, errors: validationErrors });
      }

      const sessionData = req.body as CreateSessionDto;
      
      const session = new Session({
        ...sessionData,
        maxParticipants: 4, 
        hostUserId: userId,
        participants: [userId], 
        status: 'scheduled',
        joinToken: uuidv4(), 
      });

      await session.save();

      user.activeSessionId = session._id;
      user.activeSessionRole = 'host';
      await user.save();

      return res.status(201).json({
        success: true,
        session: {
          id: session._id,
          title: session.title,
          description: session.description,
          isPaid: session.isPaid,
          price: session.price,
          maxParticipants: session.maxParticipants,
          isArchiveEnabled: session.isArchiveEnabled,
          status: session.status,
          scheduledStartAt: session.scheduledStartAt,
          joinToken: session.joinToken,
        }
      });
    } catch (error) {
      console.error('セッション作成エラー:', error);
      return res.status(500).json({ success: false, message: 'セッションの作成に失敗しました' });
    }
  }

  // ルーム一覧取得エンドポイント
  async getSessions(req: Request, res: Response): Promise<void> {
    try {
      // クエリパラメータの取得と整形
      const {
        status,
        hostUserId,
        search,
        sortOrder = SortOrder.DESC,
        sortBy = 'scheduledStartAt',
        page = 1,
        limit = 10
      } = req.query as unknown as GetSessionsQueryDto;

      // フィルタ条件の構築
      const filter: any = {};
      
      if (status) {
        filter.status = status;
      } else {
        // デフォルトでは終了済み以外のルームを表示
        filter.status = { $ne: SessionStatus.ENDED };
      }
      
      if (hostUserId && mongoose.Types.ObjectId.isValid(hostUserId)) {
        filter.hostUserId = new mongoose.Types.ObjectId(hostUserId);
      }
      
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // ページネーションの準備
      const skip = (Number(page) - 1) * Number(limit);
      const sortDirection = sortOrder === SortOrder.ASC ? 1 : -1;
      
      // ルーム一覧の取得とカウント
      const [sessions, total] = await Promise.all([
        Session.find(filter)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(Number(limit))
          .populate('hostUserId', 'name profileImage')
          .lean(),
        Session.countDocuments(filter)
      ]);

      // lean() を使うと仮想ゲッター id が含まれないため、手動でマッピングする
      const mappedSessions = sessions.map(session => ({
        id: session._id.toString(), // _id を id に変換
        title: session.title,
        description: session.description,
        hostUser: session.hostUserId, // プロパティ名を hostUser に変更
        participants: session.participants,
        isPaid: session.isPaid,
        price: session.price,
        maxParticipants: session.maxParticipants,
        isArchiveEnabled: session.isArchiveEnabled,
        status: session.status,
        scheduledStartAt: session.scheduledStartAt,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        recordingUrl: session.recordingUrl,
        joinToken: session.joinToken,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }));

      // レスポンスの構築
      const totalPages = Math.ceil(total / Number(limit));
      
      res.json({
        success: true,
        data: {
          sessions: mappedSessions, // マッピングしたルーム情報を返す
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages
          }
        }
      });
    } catch (error) {
      console.error('セッション一覧取得エラー:', error);
      res.status(500).json({ 
        success: false, 
        message: 'セッション一覧の取得に失敗しました' 
      });
    }
  }

  // 自分が参加中または作成したルーム一覧取得
  async getMySessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: '認証が必要です' });
        return;
      }
      
      // クエリパラメータの取得
      const { status } = req.query;
      
      // フィルタ条件の構築
      const filter: any = {
        $or: [
          { hostUserId: userId },
          { participants: userId }
        ]
      };
      
      if (status) {
        filter.status = status;
      }
      
      // ルーム一覧の取得
      const sessions = await Session.find(filter)
        .sort({ updatedAt: -1 })
        .populate('hostUserId', 'name profileImage')
        .lean();
      
      res.json({
        success: true,
        data: { sessions }
      });
    } catch (error) {
      console.error('マイセッション一覧取得エラー:', error);
      res.status(500).json({ 
        success: false, 
        message: 'マイセッション一覧の取得に失敗しました' 
      });
    }
  }

  // ルーム詳細取得エンドポイント
  async getSessionById(req: Request | AuthRequest, res: Response): Promise<void> {
    try {
      const sessionId = req.params.id;
      const userId = (req as AuthRequest).user?.id;

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        res.status(400).json({ success: false, message: '無効なセッションIDです' });
        return;
      }
      const session = await Session.findById(sessionId)
        .populate('hostUserId', 'name profileImage')
        .populate('participants', 'name profileImage');
      if (!session) {
        res.status(404).json({ success: false, message: 'セッションが見つかりません' });
        return;
      }

      const isAuthenticated = !!userId;
      const isHost = isAuthenticated && isSessionHost(session, userId!);
      const isParticipant = isAuthenticated && isSessionParticipant(session, userId!);
      let applicationStatus: 'pending' | 'approved' | 'rejected' | 'canceled' | null = null;

      if (isAuthenticated && !isHost && !isParticipant) {
        const application = await SessionApplication.findOne({ sessionId, userId });
        if (application) {
            applicationStatus = application.status;
        }
      }
      // ... 更に続く ...
      // getSessionById の残りの処理
      const canApply = isAuthenticated && !isHost && !isParticipant && !applicationStatus && session.status !== 'ended';

      res.json({
        success: true,
        data: transformSessionToDetails(session, userId, applicationStatus, canApply)
      });

    } catch (error) {
      console.error('セッション詳細取得エラー:', error);
      res.status(500).json({ 
        success: false, 
        message: 'セッション詳細の取得に失敗しました' 
      });
    }
  }

  // ルーム参加エンドポイント (現状、参加=演者申請になる)
  // ※ 仕様変更: `joinRoom` は汎用的な参加処理（視聴者参加含む）に変更？
  //             演者申請は `applyToSessionAsPerformer` に分離済み
  async joinSession(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const { sessionId } = req.body as JoinSessionDto; // DTO使う想定
      const io: SocketIOServer = req.app.get('socketio'); // socket.ioインスタンス取得

      if (!userId) {
        return res.status(401).json({ success: false, message: '認証が必要です' });
      }
      if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ success: false, message: '無効なセッションIDです' });
      }

      const session = await Session.findById(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, message: 'セッションが見つかりません' });
      }

      if (session.status === 'ended') {
        return res.status(403).json({ success: false, message: 'このセッションは既に終了しています' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'ユーザーが見つかりません' });
      }

      // 既に他のセッションに参加中の場合はエラー
      if (user.activeSessionId && user.activeSessionId.toString() !== sessionId) {
        return res.status(409).json({ success: false, message: '既に他のセッションに参加中です' });
      }
      
      // 既にこのセッションの参加者かホストの場合
      if (isSessionHost(session, userId) || isSessionParticipant(session, userId)) {
         // 参加済みなのでユーザーの状態を更新するだけ（役割に応じて）
         user.activeSessionId = session._id;
         user.activeSessionRole = isSessionHost(session, userId) ? 'host' : 'performer'; // ここは要検討 (Viewerの可能性)
         await user.save();
         return res.json({ 
             success: true, 
             message: '既にセッションに参加しています',
             userRole: user.activeSessionRole 
         });
      }

      // --- 参加処理 (Viewerとしての参加を想定) ---
      // TODO: Viewerとしての参加上限などが必要か検討
      // if (isSessionFull(session)) { // 演者数のチェックは apply 時に行う
      //   return res.status(409).json({ success: false, message: 'ルームが満員です\' });
      // }

      // 参加者リストに追加 (Viewerとしての参加なので participants には追加しない方針も？ DB設計による)
      // session.participants.push(userId as any);
      // await session.save();

      // ユーザーの状態を更新 (Viewer)
      user.activeSessionId = session._id;
      user.activeSessionRole = 'viewer'; // ★ Viewer として参加
      await user.save();
      
      // WebSocket で通知
      const userSocketId = await findSocketIdByUserId(userId, io);
      if (userSocketId) {
          io.to(sessionId).emit('user_joined_session', { // ★ イベント名変更
              sessionId: sessionId, // ★ roomId -> sessionId
              userId: userSocketId, // WebRTC 用のID
              userName: user.name, 
              role: user.activeSessionRole
          });
      } else {
          // ソケットが見つからない場合でもDBは更新された状態
          console.warn(`Socket not found for user ${userId} after joining session ${sessionId}`);
      }

      return res.json({ 
          success: true, 
          message: 'セッションに視聴者として参加しました', // ★ メッセージ変更
          userRole: user.activeSessionRole // ★ activeRoomRole -> activeSessionRole
      });

    } catch (error) {
      console.error('セッション参加エラー:', error);
      return res.status(500).json({ success: false, message: 'セッションへの参加に失敗しました' });
    }
  }

  // ルーム退出エンドポイント
  async leaveSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params.id;
      const userId = (req as AuthRequest).user?.id;
      const io: SocketIOServer = req.app.get('socketio');

      if (!userId) {
        res.status(401).json({ success: false, message: '認証が必要です' });
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        res.status(400).json({ success: false, message: '無効なセッションIDです' });
        return;
      }

      const session = await Session.findById(sessionId);
      const user = await User.findById(userId);

      if (!user || !session) {
        res.status(404).json({ success: false, message: 'ユーザーまたはセッションが見つかりません' });
        return;
      }
      
      // ユーザーがそのセッションにアクティブとして参加していたか確認
      if (user.activeSessionId?.toString() !== sessionId) { // ★ activeRoomId -> activeSessionId
          res.status(400).json({ success: false, message: 'このセッションに現在参加していません' });
          return;
      }
      
      const isHost = isSessionHost(session, userId);
      const wasParticipant = isSessionParticipant(session, userId);

      // ユーザーのアクティブ状態をクリア
      user.activeSessionId = null; // ★ activeRoomId -> activeSessionId
      user.activeSessionRole = null; // ★ activeRoomRole -> activeSessionRole
      await user.save();
      
      // WebSocketで通知
      const userSocketId = await findSocketIdByUserId(userId, io);
      if (userSocketId) {
          io.to(sessionId).emit('user_left_session', { userId: userSocketId, sessionId: sessionId }); // ★ イベント名変更, roomId -> sessionId
      } else {
          console.warn(`Socket not found for user ${userId} when leaving session ${sessionId}`);
      }

      // ホストの場合、セッションを終了させる
      if (isHost) {
        if (session.status !== 'ended') {
          session.status = 'ended';
          session.endedAt = new Date();
          await session.save();
          // 他の参加者の状態もクリアする
          await User.updateMany(
            { _id: { $in: session.participants } }, 
            { $set: { activeSessionId: null, activeSessionRole: null } } // ★ activeRoomId/Role -> activeSessionId/Role
          );
          io.to(sessionId).emit('session_status_updated', { status: 'ended', endedAt: session.endedAt }); // ★ イベント名変更
          res.json({ success: true, message: 'ホストが退出したため、セッションを終了しました' });
        } else {
          res.json({ success: true, message: 'セッションは既に終了しています' });
        }
      } else if (wasParticipant) {
        // 参加者の場合、参加者リストから削除
        session.participants = session.participants.filter(pId => pId.toString() !== userId);
        await session.save();
        res.json({ success: true, message: 'セッションから退出しました' });
      } else {
        // 参加者でもホストでもなかった場合 (Viewerなど)
        res.json({ success: true, message: 'セッションから退出しました (Viewer)' });
      }

    } catch (error) {
      console.error('セッション退出エラー:', error);
      res.status(500).json({ success: false, message: 'セッションからの退出に失敗しました' });
    }
  }

  // ルーム終了エンドポイント (ホスト用)
  async endSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params.id;
      const userId = (req as AuthRequest).user?.id;
      const io: SocketIOServer = req.app.get('socketio');

      if (!userId) {
        res.status(401).json({ success: false, message: '認証が必要です' });
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        res.status(400).json({ success: false, message: '無効なセッションIDです' });
        return;
      }

      const session = await Session.findById(sessionId);
      if (!session) {
        res.status(404).json({ success: false, message: 'セッションが見つかりません' });
        return;
      }

      // ホストかどうか確認
      if (!isSessionHost(session, userId)) {
        res.status(403).json({ success: false, message: 'セッションを終了する権限がありません' });
        return;
      }
      
      if (session.status === 'ended') {
          res.status(400).json({ success: false, message: 'セッションは既に終了しています' });
          return;
      }

      // セッション状態を更新
      session.status = 'ended';
      session.endedAt = new Date();
      await session.save();

      // 全参加者 (ホスト含む) の状態をクリア
      const allUserIdsInSession = [session.hostUserId, ...session.participants].map(id => id.toString());
      await User.updateMany(
        { _id: { $in: allUserIdsInSession } }, 
        { $set: { activeSessionId: null, activeSessionRole: null } }
      );
      
      // WebSocketで通知
      io.to(sessionId).emit('session_status_updated', { status: 'ended', endedAt: session.endedAt });

      res.json({ success: true, message: 'セッションを終了しました' });
    } catch (error) {
      console.error('セッション終了エラー:', error);
      res.status(500).json({ success: false, message: 'セッションの終了に失敗しました' });
    }
  }

  // ルーム開始エンドポイント (ホスト用)
  async startSession(req: Request, res: Response): Promise<Response | void> {
    try {
      const sessionId = req.params.sessionId;
      const userId = (req as AuthRequest).user?.id;
      const io: SocketIOServer = req.app.get('socketio');

      if (!userId) {
        return res.status(401).json({ success: false, message: '認証が必要です' });
      }
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ success: false, message: '無効なセッションIDです' });
      }

      const session = await Session.findById(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, message: 'セッションが見つかりません' });
      }

      // ホストかどうか確認
      if (!isSessionHost(session, userId)) {
        return res.status(403).json({ success: false, message: 'セッションを開始する権限がありません' });
      }

      // ★★★ ライブ状態チェックを先に移動 ★★★
      if (session.status === 'live') {
          return res.status(400).json({ success: false, message: 'セッションは既に開始されています' });
      }
      
      // ステータスが scheduled または ready でなければ開始できない
      if (session.status !== 'scheduled' && session.status !== 'ready') {
        return res.status(400).json({ success: false, message: `現在のステータス(${session.status})では開始できません` });
      }
      
      // セッション状態を更新
      session.status = 'live';
      session.startedAt = new Date();
      await session.save();
      
      // WebSocketで通知
      io.to(sessionId).emit('session_status_updated', { 
        status: 'live', 
        startedAt: session.startedAt 
      });

      res.json({ 
          success: true, 
          message: 'セッションを開始しました', 
          session: { // ★ session に合わせる
            id: session._id,
            status: session.status,
            startedAt: session.startedAt
          }
      });
    } catch (error) {
      console.error('セッション開始エラー:', error);
      res.status(500).json({ success: false, message: 'セッションの開始に失敗しました' });
    }
  }

  // 演者参加申請エンドポイント
  async applyToSessionAsPerformer(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const sessionId = req.params.sessionId; // ルートパラメータから取得
      const io: SocketIOServer = req.app.get('socketio');

      if (!userId) {
        return res.status(401).json({ success: false, message: '認証が必要です' });
      }
      if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ success: false, message: '無効なセッションIDです' });
      }

      const session = await Session.findById(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, message: 'セッションが見つかりません' });
      }

      // 既にホストまたは演者として参加済みの場合は申請不可
      if (isSessionHost(session, userId) || isSessionParticipant(session, userId)) {
        return res.status(409).json({ success: false, message: '既に演者またはホストとして参加しています' });
      }
      
      // セッションが終了している場合は申請不可
      if (session.status === 'ended') {
          return res.status(403).json({ success: false, message: '終了したセッションには参加申請できません' });
      }

      // 既に申請中または承認/拒否済みの場合は申請不可
      const existingApplication = await SessionApplication.findOne({ sessionId, userId });
      if (existingApplication) {
        let message = '既にこのセッションへの参加申請があります';
        if (existingApplication.status === 'approved') message = '既に演者として承認されています';
        else if (existingApplication.status === 'rejected') message = '参加申請は以前拒否されました';
        else if (existingApplication.status === 'canceled') message = '以前の参加申請はキャンセルされました。再申請可能です。'; // キャンセルなら再申請を許可
        
        if (existingApplication.status !== 'canceled') {
          return res.status(409).json({ success: false, message });
        }
      }
      
      // 満員の場合は申請不可 (演者上限)
      // maxParticipants はホストを含む演者数とする
      if (isSessionFull(session)) { // isSessionFullは session.participants.length >= session.maxParticipants をチェック想定
          return res.status(409).json({ success: false, message: '演者枠が満員のため申請できません' });
      }

      // 新しい参加申請を作成
      const application = new SessionApplication({
        sessionId: sessionId,
        userId: userId,
        status: 'pending',
      });
      await application.save();
      
      // ホストに通知
      const hostUser = await User.findById(session.hostUserId);
      if (hostUser) {
          const hostSocketId = await findSocketIdByUserId(hostUser._id.toString(), io);
          if (hostSocketId) {
              const populatedApplication = await SessionApplication.findById(application._id).populate('userId', 'name profileImage');
              io.to(hostSocketId).emit('session_performer_application_received', populatedApplication);
          }
      }
      
      return res.status(201).json({ 
          success: true, 
          message: '演者としての参加を申請しました。ホストの承認をお待ちください。', 
          application 
      });

    } catch (error) {
      console.error('演者参加申請エラー:', error);
      return res.status(500).json({ success: false, message: '演者参加申請に失敗しました' });
    }
  }

  // 参加申請一覧取得エンドポイント (ホスト用)
  async getSessionApplications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const sessionId = req.params.sessionId;

      if (!userId) {
        res.status(401).json({ success: false, message: '認証が必要です' });
        return;
      }
      if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
        res.status(400).json({ success: false, message: '無効なセッションIDです' });
        return;
      }

      const session = await Session.findById(sessionId);
      if (!session) {
        res.status(404).json({ success: false, message: 'セッションが見つかりません' });
        return;
      }
      
      // ホストかどうか確認
      if (!isSessionHost(session, userId)) {
        res.status(403).json({ success: false, message: '参加申請を取得する権限がありません' });
        return;
      }

      // 申請一覧を取得 (pending のみ表示するなど、仕様に応じて変更)
      const applications = await SessionApplication.find({ sessionId, status: 'pending' })
        .populate('userId', '_id name profileImage email'); 

      res.json({ success: true, applications });

    } catch (error) {
      console.error('参加申請一覧取得エラー:', error);
      res.status(500).json({ success: false, message: '参加申請一覧の取得に失敗しました' });
    }
  }

  // 参加申請への応答エンドポイント (ホスト用)
  async respondToSessionApplication(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const { sessionId, applicationId } = req.params;
      const { action } = req.body; // 'approve' or 'reject'
      const io: SocketIOServer = req.app.get('socketio');

      if (!userId) {
        res.status(401).json({ success: false, message: '認証が必要です' });
        return;
      }
      if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId) || !applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
        res.status(400).json({ success: false, message: '無効なIDです' });
        return;
      }
      if (action !== 'approve' && action !== 'reject') {
        res.status(400).json({ success: false, message: '無効なアクションです' });
        return;
      }

      const session = await Session.findById(sessionId);
      if (!session) {
        res.status(404).json({ success: false, message: 'セッションが見つかりません' });
        return;
      }

      // ホストかどうか確認
      if (!isSessionHost(session, userId)) {
        res.status(403).json({ success: false, message: '申請に応答する権限がありません' });
        return;
      }

      const application = await SessionApplication.findById(applicationId).populate('userId');
      if (!application || application.sessionId.toString() !== sessionId) {
        res.status(404).json({ success: false, message: '申請が見つかりません' });
        return;
      }

      if (application.status !== 'pending') {
        res.status(400).json({ success: false, message: `この申請は既に${application.status}です` });
        return;
      }
      
      const applicantUser = application.userId as any; // populated
      if (!applicantUser) {
          res.status(404).json({ success: false, message: '申請者が見つかりません'});
          return;
      }

      // --- 承認処理 ---
      if (action === 'approve') {
        // 満員チェック
        if (isSessionFull(session)) {
           return res.status(409).json({ success: false, message: '演者枠が満員のため承認できません' });
        }
        
        // ユーザーが他のセッションに参加中でないかチェック
        if (applicantUser.activeSessionId) {
            return res.status(409).json({ success: false, message: `ユーザー(${applicantUser.name})は既に他のセッションに参加中です` });
        }

        // 申請ステータス更新
        application.status = 'approved';
        application.respondedAt = new Date();
        await application.save();

        // ルームの参加者リストに追加
        if (!session.participants.includes(applicantUser._id)) {
          session.participants.push(applicantUser._id);
          await session.save();
        }
        
        // 申請者のユーザー状態を更新
        applicantUser.activeSessionId = session._id;
        applicantUser.activeSessionRole = 'performer';
        await applicantUser.save();

        // 申請者と他の参加者に通知
        const applicantSocketId = await findSocketIdByUserId(applicantUser._id.toString(), io);
        if (applicantSocketId) {
          io.to(applicantSocketId).emit('application_responded', { 
              applicationId: application._id, 
              sessionId: session._id,
              status: 'approved' 
          });
          // 承認されたユーザーをWebRTCに参加させる (user-joinedを送信)
          io.to(sessionId).emit('session_participant_approved', {
              sessionId: sessionId,
              userId: applicantSocketId,
              userName: applicantUser.name,
              role: 'performer'
          });
          console.log(`Approved application ${applicationId} for user ${applicantUser._id}. User joined session ${sessionId} as performer.`);
        } else {
            console.warn(`Socket not found for approved applicant ${applicantUser._id}`);
        }

        res.json({ success: true, application });

      } 
      // --- 拒否処理 ---
      else {
        application.status = 'rejected';
        application.respondedAt = new Date();
        await application.save();

        // 申請者に通知
        const applicantSocketId = await findSocketIdByUserId(applicantUser._id.toString(), io);
        if (applicantSocketId) {
          io.to(applicantSocketId).emit('application_responded', { 
              applicationId: application._id, 
              sessionId: session._id,
              status: 'rejected' 
          });
        }

        res.json({ success: true, application });
      }
    } catch (error) {
      console.error('参加申請応答エラー:', error);
      res.status(500).json({ success: false, message: '参加申請への応答に失敗しました' });
    }
  }
}

export default new SessionController(); 