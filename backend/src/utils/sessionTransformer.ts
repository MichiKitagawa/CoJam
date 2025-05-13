import { Document } from 'mongoose';
import { ISession } from '../models/Session';
import { IUser } from '../models/User';
import { ISessionApplication } from '../models/SessionApplication';

interface SessionDetails {
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
  isArchiveEnabled: boolean;
  status: string;
  scheduledStartAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  recordingUrl?: string;
  joinToken?: string;
  participants?: Array<{
    id: string;
    name: string;
    profileImage?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  userAccess?: {
    isHost: boolean;
    isParticipant: boolean;
    canJoin: boolean;
    applicationStatus?: 'pending' | 'approved' | 'rejected' | 'canceled' | null;
    canApply?: boolean;
    userRole?: 'host' | 'performer' | 'viewer' | null;
  };
}

export function transformSessionToDetails(
  session: Document & ISession,
  userId?: string | null,
  applicationStatus?: 'pending' | 'approved' | 'rejected' | 'canceled' | null,
  canApply?: boolean
): SessionDetails {
  const sessionObj = session.toObject();
  
  const isAuthenticated = !!userId;
  const isHost = isAuthenticated && sessionObj.hostUserId?._id?.toString() === userId;
  const isParticipant = isAuthenticated && Array.isArray(sessionObj.participants) && sessionObj.participants.some((p: any) => p._id?.toString() === userId || p?.toString() === userId);
  const currentParticipantsCount = Array.isArray(sessionObj.participants) ? sessionObj.participants.length : 0;
  const canJoin = (sessionObj.status === 'live' && (isParticipant || !sessionObj.isPaid)) || isHost;
  
  let userRole: 'host' | 'performer' | 'viewer' | null = null;
  if (isHost) {
      userRole = 'host';
  } else if (isParticipant) {
      userRole = 'performer';
  } else if (isAuthenticated) {
      if (sessionObj.status === 'live') {
          userRole = 'viewer';
      }
  }
  
  const sessionDetails: SessionDetails = {
    id: sessionObj._id.toString(),
    title: sessionObj.title,
    description: sessionObj.description,
    hostUser: sessionObj.hostUserId && typeof sessionObj.hostUserId !== 'string' ? {
      id: sessionObj.hostUserId._id.toString(),
      name: sessionObj.hostUserId.name,
      profileImage: sessionObj.hostUserId.profileImage
    } : { id: sessionObj.hostUserId?.toString() || 'unknown', name: 'Unknown Host', profileImage: undefined },
    isPaid: sessionObj.isPaid,
    price: sessionObj.price,
    maxParticipants: sessionObj.maxParticipants,
    currentParticipants: currentParticipantsCount,
    isArchiveEnabled: sessionObj.isArchiveEnabled,
    status: sessionObj.status,
    scheduledStartAt: sessionObj.scheduledStartAt,
    startedAt: sessionObj.startedAt,
    endedAt: sessionObj.endedAt,
    recordingUrl: sessionObj.recordingUrl,
    createdAt: sessionObj.createdAt,
    updatedAt: sessionObj.updatedAt,
    userAccess: {
        isHost,
        isParticipant,
        canJoin,
        applicationStatus: applicationStatus || null,
        canApply: canApply !== undefined ? canApply : (isAuthenticated && !isHost && !isParticipant && !applicationStatus && sessionObj.status !== 'ended'),
        userRole
    }
  };

  if (isHost) {
    sessionDetails.joinToken = sessionObj.joinToken;
  }

  if (isHost && Array.isArray(sessionObj.participants)) {
    sessionDetails.participants = sessionObj.participants.map((participant: IUser | string | any) => {
      if (participant && typeof participant === 'object' && participant._id) {
        return {
          id: participant._id.toString(),
          name: participant.name,
          profileImage: participant.profileImage
        };
      } else if (typeof participant === 'string') {
        return { id: participant, name: 'Unknown', profileImage: undefined };
      }
      return null;
    }).filter((p: ({ id: string; name: string; profileImage?: string; } | null)): p is { id: string; name: string; profileImage?: string; } => p !== null) as SessionDetails['participants'];
  }

  return sessionDetails;
} 