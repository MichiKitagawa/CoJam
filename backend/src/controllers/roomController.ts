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
      const userRoleFromAuth = (req as AuthRequest).user?.activeRoomRole;

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
        userRole: isHost ? 'host' : userRoleFromAuth,
        canJoin: !isParticipant && room.status !== 'ended' && room.participants.length < room.maxParticipants && applicationStatus !== 'pending',
        applicationStatus: applicationStatus,
        canApply: !isHost && !isParticipant && room.status !== 'ended' && !applicationStatus,
      } : {
        isHost: false,
        isParticipant: false,
        userRole: null,
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

      const room = await Room.findById(roomId).populate('hostUserId', 'name'); // ホスト情報を取得
      if (!room) {
        return res.status(404).json({ success: false, message: 'ルームが見つかりません' });
      }
      if (room.status === 'ended') {
        return res.status(400).json({ success: false, message: '終了したルームには参加できません' });
      }

      // 1ユーザー1ルーム1ロール制約チェック
      if (user.activeRoomId) {
        if (user.activeRoomId.toString() !== roomId) {
          // 他のルームに参加中
          const activeRoom = await Room.findById(user.activeRoomId).select('title');
          const activeRoomTitle = activeRoom ? activeRoom.title : '不明なルーム';
          return res.status(409).json({ 
            success: false, 
            message: `既に他のルーム「${activeRoomTitle}」に「${user.activeRoomRole || '不明な役割'}」として参加中です。まず現在のルームから退出してください。`,
            errorCode: 'ALREADY_IN_ANOTHER_ROOM'
          });
        } else {
          // 同じルームに何らかのロールで参加中
          if (user.activeRoomRole === role) {
            return res.status(200).json({ 
              success: true, 
              message: `既にこのルームに「${role}」として参加済みです。`, 
              roomId: room._id,
              userId: user._id,
              role: user.activeRoomRole,
              errorCode: 'ALREADY_IN_SAME_ROOM_SAME_ROLE'
            });
          } else {
            return res.status(409).json({ 
              success: false, 
              message: `既にこのルームに「${user.activeRoomRole || '不明な役割'}」として参加中です。1つのルームには1つの役割でしか参加できません。`,
              errorCode: 'ALREADY_IN_SAME_ROOM_DIFFERENT_ROLE'
            });
          }
        }
      }

      // ホストが自分のルームに演者以外のロールで参加しようとした場合 (通常フロントで制御されるが念のため)
      if (room.hostUserId._id.toString() === userId && role !== 'performer') { // ホストは実質performer
          // ホストが作成したルームの場合、自動的に 'host' ロールが付与されるため、
          // ここで viewer で join しようとするケースは通常発生しない想定。
          // もしホストがviewerとして参加しようとしたら、それは不正な操作か、
          // あるいはルーム作成時にactiveRoomRoleがhostに設定されていないバグ。
          // ここでは、ホストは自分のルームにはviewerとしては参加できない、という制約を明確にする。
        return res.status(403).json({ success: false, message: 'ホストは自分のルームに視聴者として参加できません。', errorCode: 'HOST_CANNOT_JOIN_AS_VIEWER' });
      }


      if (role === 'performer') {
        // 演者としての参加条件チェック (満員、承認済みかホスト自身か)
        if (room.hostUserId._id.toString() !== userId) { // ホスト自身でない場合のみ申請/承認チェック
            if (room.participants.length >= room.maxParticipants && !room.participants.map(p=>p.toString()).includes(userId)) {
                 return res.status(409).json({ success: false, message: 'ルームの演者数が上限に達しています。', errorCode: 'ROOM_FULL_FOR_PERFORMERS' });
            }
            const application = await RoomApplication.findOne({ userId, roomId, status: 'approved' });
            if (!application) { 
              return res.status(403).json({ success: false, message: '演者としての参加が承認されていません。', errorCode: 'PERFORMER_APPLICATION_NOT_APPROVED' });
            }
        }
      }
      
      if (!room.participants.map(p => p.toString()).includes(userId)) {
        room.participants.push(new mongoose.Types.ObjectId(userId));
      }
      // room.currentParticipants は WebSocket イベントや集計で更新される想定のため、ここでは直接操作しない
      await room.save();

      user.activeRoomId = room._id;
      user.activeRoomRole = (room.hostUserId._id.toString() === userId) ? 'host' : role as UserActiveRoomRole; // ホストの場合は'host'ロール
      await user.save();
      
      const io = req.app.get('socketio') as SocketIOServer;
      io.to(roomId).emit('user_joined_room', { 
        roomId: room._id.toString(), 
        userId: user._id.toString(), 
        userName: user.name, 
        role: user.activeRoomRole, // 正しいロールを送信
        profileImage: user.profileImage
      });

      return res.status(200).json({ 
        success: true, 
        message: `「${user.activeRoomRole}」としてルーム「${room.title}」に参加しました。`, 
        roomId: room._id.toString(),
        userId: user._id.toString(),
        role: user.activeRoomRole,
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
      if (room.status === 'scheduled') {
        res.status(400).json({ success: false, message: 'まだ開始予定時刻になっていないため、ルームを開始できません。' });
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
      
      const room = await Room.findById(roomId).populate('hostUserId', 'name');
      if (!room) {
        return res.status(404).json({ success: false, message: 'ルームが見つかりません' });
      }

      // 1ユーザー1ルーム1ロール制約: 既に何らかのルームに参加中、または申請中ルームのホストである場合は申請不可
      if (user.activeRoomId) {
        const activeRoom = await Room.findById(user.activeRoomId).select('title');
        const activeRoomTitle = activeRoom ? activeRoom.title : '不明なルーム';
        if (user.activeRoomId.toString() === roomId) {
            // 現在のルームに既に参加している
             return res.status(409).json({ 
                success: false, 
                message: `あなたは既にこのルーム「${room.title}」に「${user.activeRoomRole || '不明な役割'}」として参加しています。演者として参加を希望する場合は、現在の役割での参加を解消後、再度お試しください。`, // より丁寧なメッセージ
                errorCode: 'ALREADY_IN_SAME_ROOM_APPLYING_AS_PERFORMER' 
            });
        } else {
            // 他のルームに参加中
            return res.status(409).json({ 
                success: false, 
                message: `あなたは既に他のルーム「${activeRoomTitle}」に「${user.activeRoomRole || '不明な役割'}」として参加中です。新しいルームに演者として申請するには、まず現在のルームから退出してください。`,
                errorCode: 'ALREADY_IN_ANOTHER_ROOM_APPLYING_AS_PERFORMER'  
            });
        }
      }
      // 自分がホストのルームに演者として申請する、というシナリオは通常ありえない（ホストは最初から演者権限を持つ）
      // ただし、何らかの理由でホストの activeRoomRole が 'host' になっていない場合に、この申請が来てしまう可能性を考慮。
      if (room.hostUserId._id.toString() === userId) {
        return res.status(400).json({ success: false, message: 'あなたはこのルームのホストです。ホストは自動的に演者権限を持ちます。', errorCode: 'HOST_CANNOT_APPLY_TO_OWN_ROOM' });
      }


      if (room.status === 'ended') {
        return res.status(400).json({ success: false, message: '終了したルームには申請できません', errorCode: 'CANNOT_APPLY_TO_ENDED_ROOM' });
      }
      if (room.status === 'live') { // ライブ中は参加申請を受け付けない
        return res.status(400).json({ success: false, message: 'ライブ中のルームには現在申請できません', errorCode: 'CANNOT_APPLY_TO_LIVE_ROOM' });
      }
      // scheduled と ready 状態のルームは申請を受け付ける


      if (room.participants.length >= room.maxParticipants) {
         // ホスト自身は満員でも入れるので、このチェックはホスト以外の場合。
         // ただし、申請段階ではまだ participants には入っていない。
         // 承認時に再度チェックされるべきだが、申請時にも事前チェックとして有用。
         // ここでの participants は承認済み演者+ホスト。
         const actualPerformersCount = room.participants.filter(pId => pId.toString() !== room.hostUserId._id.toString()).length;
         if (actualPerformersCount >= (room.maxParticipants -1) ) { // ホストを除いた演者枠が埋まっている場合
            return res.status(409).json({ success: false, message: 'ルームの演者枠が上限に達しています。', errorCode: 'ROOM_FULL_FOR_PERFORMERS_APPLICATION' });
         }
      }

      const existingApplication = await RoomApplication.findOne({ userId, roomId });
      if (existingApplication) {
        if (existingApplication.status === 'pending') {
          return res.status(400).json({ success: false, message: '既に演者としての参加を申請済みです。ホストの承認をお待ちください。', errorCode: 'APPLICATION_ALREADY_PENDING' });
        }
        if (existingApplication.status === 'approved') {
          // このケースは上記の activeRoomId チェックで捕捉されるはずだが念のため
          return res.status(400).json({ success: false, message: '既にこのルームへの演者参加が承認されています。', errorCode: 'APPLICATION_ALREADY_APPROVED' });
        }
        // 'rejected' の場合は再申請を許可 (upsert: true で対応)
      }
      
      // ルームモデルのparticipantsには、ホストと承認済みの演者が含まれる。
      // 申請ユーザーが既に（何らかの理由で）participantsに含まれている場合（例：以前viewerだったなど）、
      // activeRoomRoleが設定されていないとおかしいため、基本的には上記のactiveRoomIdチェックで捕捉される。
      // ここでは、万が一のケースとして、直接participantsに含まれているがactiveRoomRoleがない矛盾状態をチェック。
      if (room.participants.map(p => p.toString()).includes(userId)){
        // この状態は通常、ユーザーのactiveRoom情報とDBのルーム参加者情報が不整合。
        // activeRoomIdのチェックで捕捉されるべき。もしここに到達したら警告。
        console.warn(`User ${userId} is in room ${roomId} participants list but has no activeRoomRole or different activeRoomId.`);
        return res.status(409).json({ success: false, message: '既にルームの参加者リストに存在しますが、役割情報が不正です。システム管理者に連絡してください。', errorCode: 'PARTICIPANT_STATE_INCONSISTENT' });
      }

      const application = await RoomApplication.findOneAndUpdate(
        { userId, roomId }, // 'rejected'状態の申請もこれで上書きして'pending'にする
        { userId, roomId, status: 'pending', requestedAt: new Date(), messageFromApplicant: null },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).populate('userId', 'name profileImage'); // Populate user details for the response

      const io = req.app.get('socketio') as SocketIOServer;
      // ホストがオンラインであれば、そのホストに直接通知
      const hostSocketId = await findSocketIdByUserId(room.hostUserId._id.toString(), io);
      if (hostSocketId) {
        io.to(hostSocketId).emit('performer_application_received', {
          _id: application._id, // application全体を送る方が良いかもしれない
          roomId: application.roomId,
          userId: { // 申請者の基本情報を渡す
            _id: (application.userId as any)._id,
            name: (application.userId as any).name,
            profileImage: (application.userId as any).profileImage,
          },
          status: application.status,
          requestedAt: application.requestedAt,
          messageFromApplicant: null
        });
      } else {
         // ホストがオフラインの場合の代替通知手段（例：DBに通知を保存）も考慮できる
         console.log(`Host ${room.hostUserId._id.toString()} is not online. Application for room ${roomId} by user ${userId} cannot be sent via direct socket.`);
      }
      

      return res.status(201).json({ 
        success: true, 
        message: '演者としての参加を申請しました。ホストの承認をお待ちください。',
        application // フロントエンドで申請状態を更新するためにapplication情報を返す
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