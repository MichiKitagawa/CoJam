import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Room } from '../models';
import { CreateRoomDto, GetRoomsQueryDto, JoinRoomDto, RoomStatus, SortOrder } from '../dto/room.dto';
import { AuthRequest } from '../middleware/auth.middleware';
import { validateRequest } from '../utils/validator';
import { transformRoomToDetails } from '../utils/roomTransformer';
import { isRoomFull, isRoomHost, isRoomParticipant } from '../utils/roomValidation';

class RoomController {
  // ルーム作成エンドポイント
  async createRoom(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: '認証が必要です' });
        return;
      }
      
      // リクエストボディのバリデーション
      const validationErrors = await validateRequest(CreateRoomDto, req.body);
      if (validationErrors.length > 0) {
        res.status(400).json({ success: false, errors: validationErrors });
        return;
      }

      const roomData = req.body as CreateRoomDto;
      
      // ルームの作成
      const room = new Room({
        ...roomData,
        hostUserId: userId,
        participants: [userId], // ホストを参加者に追加
        status: 'scheduled',
        joinToken: uuidv4(), // joinTokenを生成して設定
      });

      // ルームの保存
      await room.save();

      res.status(201).json({
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
      res.status(500).json({ success: false, message: 'ルームの作成に失敗しました' });
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

      // レスポンスの構築
      const totalPages = Math.ceil(total / Number(limit));
      
      res.json({
        success: true,
        data: {
          rooms,
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
      
      // IDの検証
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        res.status(400).json({ success: false, message: '無効なルームIDです' });
        return;
      }
      
      // ルームの取得（ホストと参加者情報を合わせて取得）
      const room = await Room.findById(roomId)
        .populate('hostUserId', 'name profileImage')
        .populate('participants', 'name profileImage');
      
      if (!room) {
        res.status(404).json({ success: false, message: 'ルームが見つかりません' });
        return;
      }
      
      // ユーザーの認証状態とルームへのアクセス権を確認
      const user = (req as AuthRequest).user;
      const isAuthenticated = !!user;
      const isHost = isAuthenticated && isRoomHost(room, user.id);
      const isParticipant = isAuthenticated && isRoomParticipant(room, user.id);
      
      // トークンとメンバー詳細は参加者またはホストのみ表示
      const includeToken = isHost || isParticipant;
      const includeParticipants = true; // 基本情報として参加者リストは常に表示
      
      // レスポンスの構築
      const roomDetails = transformRoomToDetails(room, includeToken, includeParticipants);
      
      // 追加の権限情報
      const userAccess = isAuthenticated ? {
        isHost,
        isParticipant,
        canJoin: !isParticipant && room.status !== 'ended' && room.participants.length < room.maxParticipants
      } : {
        isHost: false,
        isParticipant: false,
        canJoin: false
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
  async joinRoom(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: '認証が必要です' });
        return;
      }
      
      // リクエストボディのバリデーション
      const validationErrors = await validateRequest(JoinRoomDto, req.body);
      if (validationErrors.length > 0) {
        res.status(400).json({ success: false, errors: validationErrors });
        return;
      }
      
      const { roomId, joinToken } = req.body as JoinRoomDto;
      
      // roomIdかjoinTokenのどちらかが必要
      if (!roomId && !joinToken) {
        res.status(400).json({ 
          success: false, 
          message: 'ルームIDまたは参加トークンが必要です' 
        });
        return;
      }
      
      // ルーム検索条件の設定
      const query: any = {};
      if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
        query._id = roomId;
      } else if (joinToken) {
        query.joinToken = joinToken;
      }
      
      // ルームの検索
      const room = await Room.findOne(query);
      
      if (!room) {
        res.status(404).json({ 
          success: false, 
          message: 'ルームが見つかりませんでした' 
        });
        return;
      }
      
      // ルームステータスのチェック
      if (room.status === 'ended') {
        res.status(400).json({ 
          success: false, 
          message: 'このルームは既に終了しています' 
        });
        return;
      }
      
      // 既に参加しているかのチェック
      if (isRoomParticipant(room, userId)) {
        res.status(400).json({ 
          success: false, 
          message: '既にこのルームに参加しています' 
        });
        return;
      }
      
      // ルーム定員のチェック
      if (isRoomFull(room)) {
        res.status(400).json({ 
          success: false, 
          message: 'このルームは満員です' 
        });
        return;
      }
      
      // 有料ルームの場合の支払い確認（将来的に実装）
      if (room.isPaid) {
        // TODO: 支払い確認ロジックを実装
        // 現段階では単純化のため省略
      }
      
      // ルームに参加者を追加
      room.participants.push(new mongoose.Types.ObjectId(userId));
      await room.save();
      
      // WebSocketイベント通知（将来的に実装）
      // TODO: WebSocketでルーム参加イベントを通知
      
      res.status(200).json({
        success: true,
        message: 'ルームに参加しました',
        data: {
          roomId: room._id,
          title: room.title,
          joinToken: room.joinToken
        }
      });
    } catch (error) {
      console.error('ルーム参加エラー:', error);
      res.status(500).json({ 
        success: false, 
        message: 'ルーム参加処理中にエラーが発生しました' 
      });
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
      
      // WebSocketイベント通知（将来的に実装）
      // TODO: WebSocketでルーム終了イベントを通知
      
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
}

export default new RoomController(); 