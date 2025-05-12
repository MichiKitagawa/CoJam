import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Room, RoomApplication, User } from '../models';
import { UserActiveRoomRole, IUser } from '../models/User';
import { CreateRoomDto, GetRoomsQueryDto, JoinRoomDto, RoomStatus, SortOrder } from '../dto/room.dto';
import { AuthRequest } from '../middleware/auth.middleware';
import { validateRequest } from '../utils/validator';
import { transformRoomToDetails } from '../utils/roomTransformer';
import { isRoomFull, isRoomHost, isRoomParticipant } from '../utils/roomValidation';
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

class RoomController {
  // ルーム作成エンドポイント
  async createRoom(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: '認証が必要です' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'ユーザーが見つかりません' });
      }
      if (user.activeRoomId) {
        return res.status(409).json({ success: false, message: '既に他のルームに参加中です。新しいルームを作成できません。' });
      }
      
      const validationErrors = await validateRequest(CreateRoomDto, req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({ success: false, errors: validationErrors });
      }

      const roomData = req.body as CreateRoomDto;
      
      const room = new Room({
        ...roomData,
        maxParticipants: 4, 
        hostUserId: userId,
        participants: [userId], 
        status: 'scheduled',
        joinToken: uuidv4(), 
      });

      await room.save();

      user.activeRoomId = room._id;
      user.activeRoomRole = 'host';
      await user.save();

      return res.status(201).json({
        success: true,
        room: {
          id: room._id,
          title: room.title,
          description: room.description,
          isPaid: room.isPaid,
          price: room.price,
          maxParticipants: room.maxParticipants,
          isArchiveEnabled: room.isArchiveEnabled,
          status: room.status,
          scheduledStartAt: room.scheduledStartAt,
          joinToken: room.joinToken,
        }
      });
    } catch (error) {
      console.error('ルーム作成エラー:', error);
      return res.status(500).json({ success: false, message: 'ルームの作成に失敗しました' });
    }
  }

  // ルーム一覧取得エンドポイント
  async getRooms(req: Request, res: Response): Promise<void> {
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
      } = req.query as unknown as GetRoomsQueryDto;

      // フィルタ条件の構築
      const filter: any = {};
      
      if (status) {
        filter.status = status;
      } else {
        // デフォルトでは終了済み以外のルームを表示
        filter.status = { $ne: RoomStatus.ENDED };
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
      const [rooms, total] = await Promise.all([
        Room.find(filter)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(Number(limit))
          .populate('hostUserId', 'name profileImage')
          .lean(),
        Room.countDocuments(filter)
      ]);

      // lean() を使うと仮想ゲッター id が含まれないため、手動でマッピングする
      const mappedRooms = rooms.map(room => ({
        id: room._id.toString(), // _id を id に変換
        title: room.title,
        description: room.description,
        hostUser: room.hostUserId, // プロパティ名を hostUser に変更
        participants: room.participants,
        isPaid: room.isPaid,
        price: room.price,
        maxParticipants: room.maxParticipants,
        isArchiveEnabled: room.isArchiveEnabled,
        status: room.status,
        scheduledStartAt: room.scheduledStartAt,
        startedAt: room.startedAt,
        endedAt: room.endedAt,
        recordingUrl: room.recordingUrl,
        joinToken: room.joinToken,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      }));

      // レスポンスの構築
      const totalPages = Math.ceil(total / Number(limit));
      
      res.json({
        success: true,
        data: {
          rooms: mappedRooms, // マッピングしたルーム情報を返す
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages
          }
        }
      });
    } catch (error) {
      console.error('ルーム一覧取得エラー:', error);
      res.status(500).json({ 
        success: false, 
        message: 'ルーム一覧の取得に失敗しました' 
      });
    }
  }

  // 自分が参加中または作成したルーム一覧取得
  async getMyRooms(req: Request, res: Response): Promise<void> {
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
      const rooms = await Room.find(filter)
        .sort({ updatedAt: -1 })
        .populate('hostUserId', 'name profileImage')
        .lean();
      
      res.json({
        success: true,
        data: { rooms }
      });
    } catch (error) {
      console.error('マイルーム一覧取得エラー:', error);
      res.status(500).json({ 
        success: false, 
        message: 'マイルーム一覧の取得に失敗しました' 
      });
    }
  }

  // ルーム詳細取得エンドポイント
  async getRoomById(req: Request | AuthRequest, res: Response): Promise<void> {
    try {
      const roomId = req.params.id;
      const userId = (req as AuthRequest).user?.id;

      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        res.status(400).json({ success: false, message: '無効なルームIDです' });
        return;
      }
      const room = await Room.findById(roomId)
        .populate('hostUserId', 'name profileImage')
        .populate('participants', 'name profileImage');
      if (!room) {
        res.status(404).json({ success: false, message: 'ルームが見つかりません' });
        return;
      }

      const isAuthenticated = !!userId;
      const isHost = isAuthenticated && isRoomHost(room, userId!);
      const isParticipant = isAuthenticated && isRoomParticipant(room, userId!);
      let applicationStatus: 'pending' | 'approved' | 'rejected' | null = null;

      if (isAuthenticated && !isHost && !isParticipant) {
        const application = await RoomApplication.findOne({ roomId, userId });
        if (application) {
          applicationStatus = application.status;
        }
      }

      const roomDetails = transformRoomToDetails(room, isHost || isParticipant, true);
      const userAccess = isAuthenticated ? {
        isHost,
        isParticipant,
        canJoin: !isParticipant && room.status !== 'ended' && room.participants.length < room.maxParticipants && applicationStatus !== 'pending',
        applicationStatus: applicationStatus,
        canApply: !isHost && !isParticipant && room.status !== 'ended' && !applicationStatus, // まだ申請してない場合
      } : {
        isHost: false,
        isParticipant: false,
        canJoin: false,
        applicationStatus: null,
        canApply: room.status !== 'ended',
      };

      res.json({
        success: true,
        data: {
          room: roomDetails,
          userAccess
        }
      });
    } catch (error) {
      console.error('ルーム詳細取得エラー:', error);
      res.status(500).json({ success: false, message: 'ルーム詳細の取得に失敗しました' });
    }
  }

  // ルーム参加エンドポイント
  async joinRoom(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const { roomId, role } = req.body as JoinRoomDto;

      if (!userId) {
        return res.status(401).json({ success: false, message: '認証が必要です' });
      }
      if (!roomId || !role) {
        return res.status(400).json({ success: false, message: 'ルームIDと役割は必須です' });
      }
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({ success: false, message: '無効なルームIDです' });
      }
      if (!['viewer', 'performer'].includes(role)) {
        return res.status(400).json({ success: false, message: '無効な役割です' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'ユーザーが見つかりません' });
      }

      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ success: false, message: 'ルームが見つかりません' });
      }
      if (room.status === 'ended') {
        return res.status(400).json({ success: false, message: '終了したルームには参加できません' });
      }

      if (user.activeRoomId && user.activeRoomId.toString() !== roomId) {
        return res.status(409).json({ success: false, message: '既に他のアクティブなルームがあります。' });
      }
      if (user.activeRoomId && user.activeRoomId.toString() === roomId && user.activeRoomRole && user.activeRoomRole !== role) {
        return res.status(409).json({ success: false, message: `既にこのルームに${user.activeRoomRole}として参加しています。役割を変更できません。` });
      }
      if (user.activeRoomId && user.activeRoomId.toString() === roomId && user.activeRoomRole === role) {
        return res.status(200).json({ 
          success: true, 
          message: `${role === 'viewer' ? '視聴者' : '演者'}としてルームに参加済みです。`, 
          roomId: room._id,
          userId: user._id,
          role: user.activeRoomRole,
        });
      }

      if (role === 'performer') {
        if (room.participants.length >= room.maxParticipants && !room.participants.map(p=>p.toString()).includes(userId)) {
           return res.status(409).json({ success: false, message: 'ルームの演者数が上限に達しています。' });
        }
        
        const application = await RoomApplication.findOne({ userId, roomId, status: 'approved' });
        if (!application && room.hostUserId.toString() !== userId) { 
          return res.status(403).json({ success: false, message: '演者としての参加が承認されていません。' });
        }
      }
      
      if (!room.participants.map(p => p.toString()).includes(userId)) {
        room.participants.push(new mongoose.Types.ObjectId(userId));
      }
      await room.save();

      user.activeRoomId = room._id;
      user.activeRoomRole = role as UserActiveRoomRole;
      await user.save();
      
      const io = req.app.get('socketio') as SocketIOServer;
      io.to(roomId).emit('user_joined_room', { 
        roomId: room._id, 
        userId: user._id, 
        userName: user.name, 
        role: role,
        profileImage: user.profileImage
      });

      return res.status(200).json({ 
        success: true, 
        message: `${role === 'viewer' ? '視聴者' : '演者'}としてルームに参加しました。`, 
        roomId: room._id,
        userId: user._id,
        role: role,
      });
    } catch (error) {
      console.error('ルーム参加エラー:', error);
      return res.status(500).json({ success: false, message: 'ルームへの参加処理中にエラーが発生しました。' });
    }
  }

  // ルーム退出エンドポイント
  async leaveRoom(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: '認証が必要です' });
        return;
      }
      
      const roomId = req.params.id;
      
      // IDの検証
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        res.status(400).json({ success: false, message: '無効なルームIDです' });
        return;
      }
      
      // ルームの検索
      const room = await Room.findById(roomId);
      
      if (!room) {
        res.status(404).json({ 
          success: false, 
          message: 'ルームが見つかりませんでした' 
        });
        return;
      }
      
      // 参加しているかのチェック
      if (!isRoomParticipant(room, userId)) {
        res.status(400).json({ 
          success: false, 
          message: 'このルームに参加していません' 
        });
        return;
      }
      
      // ホストは退出できない（ルームを閉じる必要がある）
      if (room.hostUserId.toString() === userId) {
        res.status(400).json({ 
          success: false, 
          message: 'ホストはルームを退出できません。ルームを終了するには別のAPIを使用してください。' 
        });
        return;
      }
      
      // 参加者リストからユーザーを削除
      room.participants = room.participants.filter(
        (participantId) => participantId.toString() !== userId
      );
      
      await room.save();

      // ユーザーのアクティブなルーム情報をクリア
      const user = await User.findById(userId);
      if (user) {
        user.activeRoomId = null;
        user.activeRoomRole = null;
        await user.save();
      }
      
      // WebSocketイベント通知（将来的に実装）
      // TODO: WebSocketでルーム退出イベントを通知
      
      res.status(200).json({
        success: true,
        message: 'ルームから退出しました'
      });
    } catch (error) {
      console.error('ルーム退出エラー:', error);
      res.status(500).json({ 
        success: false, 
        message: 'ルーム退出処理中にエラーが発生しました' 
      });
    }
  }

  // ルーム終了エンドポイント (ホストのみ)
  async endRoom(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: '認証が必要です' });
        return;
      }
      
      const roomId = req.params.id;
      
      // IDの検証
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        res.status(400).json({ success: false, message: '無効なルームIDです' });
        return;
      }
      
      // ルームの検索
      const room = await Room.findById(roomId);
      
      if (!room) {
        res.status(404).json({ 
          success: false, 
          message: 'ルームが見つかりませんでした' 
        });
        return;
      }
      
      // ホストのみがルームを終了できる
      if (room.hostUserId.toString() !== userId) {
        res.status(403).json({ 
          success: false, 
          message: 'ルームを終了する権限がありません' 
        });
        return;
      }
      
      // 既に終了しているかのチェック
      if (room.status === 'ended') {
        res.status(400).json({ 
          success: false, 
          message: 'このルームは既に終了しています' 
        });
        return;
      }
      
      // ルームを終了状態に更新
      room.status = 'ended';
      room.endedAt = new Date();
      await room.save();

      // ルーム参加者全員のactiveRoomIdとactiveRoomRoleをクリア
      if (room.participants && room.participants.length > 0) {
        await User.updateMany(
          { _id: { $in: room.participants } }, // hostUserIdもparticipantsに含まれている前提
          { $set: { activeRoomId: null, activeRoomRole: null } }
        );
      }
      
      // WebSocketイベント通知（将来的に実装）
      const io = req.app.get('socketio') as SocketIOServer | undefined;
      if (io && typeof io.to === 'function') {
        const roomSocket = io.to(roomId);
        if (roomSocket && typeof roomSocket.emit === 'function') {
          roomSocket.emit('roomStatusUpdated', { status: 'ended', endedAt: room.endedAt });
        } else {
          console.warn(`Socket.IO roomSocket or emit method not found for room ${roomId} in endRoom`);
        }
      } else {
        console.warn(`Socket.IO instance or to method not found when trying to emit roomStatusUpdated for room ${roomId} in endRoom. io:`, io);
      }
      
      res.status(200).json({
        success: true,
        message: 'ルームを終了しました'
      });
    } catch (error) {
      console.error('ルーム終了エラー:', error);
      res.status(500).json({ 
        success: false, 
        message: 'ルーム終了処理中にエラーが発生しました' 
      });
    }
  }

  // ルーム開始エンドポイント (ホストのみ)
  async startRoom(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const roomId = req.params.roomId; // ルート定義に合わせて修正の可能性あり

      if (!userId) {
        res.status(401).json({ success: false, message: '認証が必要です' });
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        res.status(400).json({ success: false, message: '無効なルームIDです' });
        return;
      }

      const room = await Room.findById(roomId);
      if (!room) {
        res.status(404).json({ success: false, message: 'ルームが見つかりません' });
        return;
      }

      if (room.hostUserId.toString() !== userId) {
        res.status(403).json({ success: false, message: 'ルームを開始する権限がありません。ホストのみ操作可能です。' });
        return;
      }

      if (room.status === 'live') {
        res.status(200).json({ success: true, message: 'ルームは既にライブ状態です。', room });
        return;
      }
      if (room.status === 'ended') {
        res.status(400).json({ success: false, message: '終了したルームは開始できません。' });
        return;
      }

      room.status = 'live';
      room.startedAt = new Date();
      await room.save();

      const io = req.app.get('socketio') as SocketIOServer | undefined;
      if (io && typeof io.to === 'function') {
        const roomSocket = io.to(roomId);
        if (roomSocket && typeof roomSocket.emit === 'function') {
          roomSocket.emit('roomStatusUpdated', { status: 'live', startedAt: room.startedAt });
        } else {
          console.warn(`Socket.IO roomSocket or emit method not found for room ${roomId} in startRoom`);
        }
      } else {
        console.warn(`Socket.IO instance or to method not found when trying to emit roomStatusUpdated for room ${roomId} in startRoom. io:`, io);
      }

      res.status(200).json({ 
        success: true, 
        message: 'ルームを開始しました。',
        room: { // フロントエンドが必要とする情報を返す
          id: room._id,
          status: room.status,
          startedAt: room.startedAt,
        }
      });

    } catch (error) {
      console.error('ルーム開始エラー:', error);
      res.status(500).json({ success: false, message: 'ルームの開始処理中にエラーが発生しました。' });
    }
  }

  // 演者参加申請
  async applyToRoomAsPerformer(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const roomId = req.params.roomId;

      if (!userId) {
        return res.status(401).json({ success: false, message: '認証が必要です' });
      }
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({ success: false, message: '無効なルームIDです' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'ユーザーが見つかりません' });
      }
      if (user.activeRoomId && user.activeRoomId.toString() !== roomId) { 
        return res.status(409).json({ success: false, message: '既に他のアクティブなルームがあります。' });
      }
      if (user.activeRoomId && user.activeRoomId.toString() === roomId && user.activeRoomRole !== null) {
        return res.status(409).json({ success: false, message: `既にこのルームに${user.activeRoomRole}として参加しています。` });
      }

      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ success: false, message: 'ルームが見つかりません' });
      }
      if (room.status === 'ended') {
        return res.status(400).json({ success: false, message: '終了したルームには申請できません' });
      }

      if (room.participants.length >= room.maxParticipants) {
        return res.status(409).json({ success: false, message: 'ルームの演者数が上限に達しています。' });
      }

      const existingApplication = await RoomApplication.findOne({ userId, roomId });
      if (existingApplication) {
        if (existingApplication.status === 'pending') {
          return res.status(400).json({ success: false, message: '既に申請済みです。ホストの承認をお待ちください。' });
        }
        if (existingApplication.status === 'approved') {
          return res.status(400).json({ success: false, message: '既にこのルームへの参加が承認されています。' });
        }
      }
      
      if (room.participants.map(p => p.toString()).includes(userId)){
        return res.status(400).json({ success: false, message: '既にルームの参加者です。' });
      }

      const application = await RoomApplication.findOneAndUpdate(
        { userId, roomId },
        { userId, roomId, status: 'pending', requestedAt: new Date() },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      const io = req.app.get('socketio') as SocketIOServer;
      const hostSocketId = await findSocketIdByUserId(room.hostUserId.toString(), io);
      if (hostSocketId) {
        io.to(hostSocketId).emit('performer_application_received', {
          applicationId: application._id,
          roomId: room._id,
          userId: user._id,
          userName: user.name,
          requestedAt: application.requestedAt,
        });
      }

      return res.status(201).json({ 
        success: true, 
        message: '演者としての参加を申請しました。ホストの承認をお待ちください。',
        application
      });

    } catch (error) {
      console.error('演者参加申請エラー:', error);
      return res.status(500).json({ success: false, message: '演者としての参加申請中にエラーが発生しました。' });
    }
  }

  async getRoomApplications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const roomId = req.params.roomId;

      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        res.status(400).json({ success: false, message: '無効なルームIDです' });
        return;
      }

      const room = await Room.findById(roomId);
      if (!room) {
        res.status(404).json({ success: false, message: 'ルームが見つかりません' });
        return;
      }

      if (room.hostUserId.toString() !== userId) {
        res.status(403).json({ success: false, message: 'この操作を行う権限がありません。ホストのみ申請一覧を取得できます。' });
        return;
      }

      const applications = await RoomApplication.find({ roomId, status: 'pending' })
        .populate('userId', 'name profileImage email'); 

      res.status(200).json({ success: true, applications });

    } catch (error) {
      console.error('参加申請一覧取得エラー:', error);
      res.status(500).json({ success: false, message: '参加申請一覧の取得中にエラーが発生しました。' });
    }
  }

  async respondToRoomApplication(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hostId = req.user?.id;
      const { roomId, applicationId } = req.params;
      const { action } = req.body; // 'approve' or 'reject'

      if (!mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(applicationId)) {
        res.status(400).json({ success: false, message: '無効なIDです' });
        return;
      }
      if (!action || !['approve', 'reject'].includes(action)) {
        res.status(400).json({ success: false, message: '無効なアクションです。"approve" または "reject" を指定してください。' });
        return;
      }

      const room = await Room.findById(roomId);
      if (!room) {
        res.status(404).json({ success: false, message: 'ルームが見つかりません' });
        return;
      }

      if (room.hostUserId.toString() !== hostId) {
        res.status(403).json({ success: false, message: 'この操作を行う権限がありません。ホストのみ申請に応答できます。' });
        return;
      }

      const application = await RoomApplication.findById(applicationId).populate('userId'); // Populate userId to get user details
      if (!application || application.roomId.toString() !== roomId) {
        res.status(404).json({ success: false, message: '申請が見つかりません' });
        return;
      }

      if (application.status !== 'pending') {
        res.status(400).json({ success: false, message: `この申請は既に応答済みです (現在のステータス: ${application.status})` });
        return;
      }

      // 承認対象のユーザー情報を取得 (populateしたので application.userId は IUser オブジェクトのはず)
      const applicant = application.userId as any as IUser; // 型アサーション (本来は型ガードが望ましい)
      if (!applicant) {
        // 通常はpopulateしていればありえないが念のため
        application.status = 'rejected'; // ユーザーが見つからない場合は自動的に拒否
        await application.save();
        res.status(404).json({ success: false, message: '申請ユーザーが見つかりません。申請は拒否されました。' });
        return;
      }

      if (action === 'approve') {
        // 1. 承認対象ユーザーの参加状況確認
        if (applicant.activeRoomId && applicant.activeRoomId.toString() !== roomId) {
          application.status = 'rejected'; // 他のルームに参加中なので自動拒否
          await application.save();
          res.status(409).json({ success: false, message: '対象ユーザーは既に他のルームに参加中のため、承認できません。申請は拒否されました。' });
          return;
        }
        if (applicant.activeRoomId && applicant.activeRoomId.toString() === roomId && applicant.activeRoomRole) {
          application.status = 'rejected'; // このルームに既に役割を持って参加中なので自動拒否
          await application.save();
          res.status(409).json({ success: false, message: `対象ユーザーは既にこのルームに「${applicant.activeRoomRole}」として参加中のため、承認できません。申請は拒否されました。` });
          return;
        }

        // 2. 演者数上限確認
        if (room.participants.length >= room.maxParticipants && !room.participants.map(p => p.toString()).includes(applicant._id.toString())) {
          application.status = 'rejected'; // 上限なので自動拒否
          await application.save();
          res.status(409).json({ success: false, message: 'ルームの演者数が上限に達しているため、承認できません。申請は拒否されました。' });
          return;
        }
        
        // 承認処理
        application.status = 'approved';
        application.respondedAt = new Date();
        await application.save();
        
        // ルームの参加者リストに追加 (まだなら)
        const applicantMongooseId = new mongoose.Types.ObjectId(applicant._id);
        if (!room.participants.some(p => p.equals(applicantMongooseId))) { 
            room.participants.push(applicantMongooseId);
            await room.save(); 
        }

        // 承認されたユーザーのactiveRoom情報を更新
        applicant.activeRoomId = room._id;
        applicant.activeRoomRole = 'performer';
        await applicant.save();
        
        // TODO: WebSocket通知 (申請者、ルーム参加者)
        res.status(200).json({ success: true, message: '申請を承認しました。', application });
        return;

      } else { // action === 'reject'
        application.status = 'rejected';
        application.respondedAt = new Date();
        await application.save();
        // TODO: WebSocket通知 (申請者)
        res.status(200).json({ success: true, message: '申請を拒否しました。', application });
        return;
      }

    } catch (error) {
      console.error('参加申請応答エラー:', error);
      res.status(500).json({ success: false, message: '参加申請への応答中にエラーが発生しました。' });
      // このメソッドの戻り値型アノテーションも Promise<void> のため、整合性のために return を追加
      return;
    }
  }
}

export default new RoomController(); 