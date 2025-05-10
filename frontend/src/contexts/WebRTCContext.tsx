import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import SimplePeer, { Instance as PeerInstance, SignalData } from 'simple-peer';
import useMediaStream from '../hooks/useMediaStream';

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:8080';

interface WebRTCContextType {
  socket: Socket | null;
  localStream: MediaStream | null;
  remoteStreams: { [peerId: string]: MediaStream };
  peers: { [peerId: string]: PeerInstance };
  myPeerId: string | null;
  isMediaLoading: boolean;
  mediaError: Error | null;
  initializeMedia: () => Promise<void>;
  stopMedia: () => void;
  joinRoom: (roomId: string, userId: string) => void;
  leaveRoom: (roomId: string, userId: string) => void;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const WebRTCProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { stream: localStream, getMediaStream, stopMediaStream, isLoading: isMediaLoading, error: mediaError } = useMediaStream();
  const [remoteStreams, setRemoteStreams] = useState<{ [peerId: string]: MediaStream }>({});
  const [peers, setPeers] = useState<{ [peerId: string]: PeerInstance }>({});
  const [myPeerId, setMyPeerId] = useState<string | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);
    // newSocket.id might not be immediately available, it's set on connection
    // Store it once connected.
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setMyPeerId(newSocket.id);
    });

    return () => {
      newSocket.close();
      setSocket(null);
    };
  }, []);

  const initializeMedia = useCallback(async () => {
    await getMediaStream();
  }, [getMediaStream]);

  const stopMedia = useCallback(() => {
    stopMediaStream();
    Object.values(peers).forEach(peer => peer.destroy());
    setPeers({});
    setRemoteStreams({});
  }, [stopMediaStream, peers]);

  const joinRoom = useCallback((roomId: string, userId: string) => {
    if (socket && localStream && myPeerId) { // Ensure myPeerId is set before joining
      socket.emit('join-room', { roomId, userId }); // userId here is more of a display name from app context
      console.log(`Attempting to join room: ${roomId} as user: ${userId} (socketId: ${myPeerId})`);
    } else {
      console.warn('Socket, localStream, or myPeerId not ready for joinRoom');
    }
  }, [socket, localStream, myPeerId]);

  const leaveRoom = useCallback((roomId: string, userId: string) => {
    if (socket && myPeerId) {
      socket.emit('leave-room', { roomId, userId });
      Object.values(peers).forEach(peer => peer.destroy());
      setPeers({});
      setRemoteStreams({});
      console.log(`Leaving room: ${roomId}`);
    }
  }, [socket, peers, myPeerId]);

  const createPeer = useCallback((targetSocketId: string, initiator: boolean) => {
    if (!localStream || !socket || !myPeerId) {
        console.warn('Cannot create peer: localStream, socket or myPeerId is not available.');
        return null;
    }
    console.log(`Creating peer connection to ${targetSocketId} from ${myPeerId}, initiator: ${initiator}`);
    
    const peer = new SimplePeer({
      initiator,
      trickle: true,
      stream: localStream,
    });

    peer.on('signal', (signal: SignalData) => {
      console.log(`Sending signal from ${myPeerId} to ${targetSocketId}:`, signal);
      socket.emit('signal', { to: targetSocketId, /* from: myPeerId, */ signal }); // 'from' is added by backend
    });

    peer.on('stream', (stream: MediaStream) => {
      console.log(`Received remote stream at ${myPeerId} from ${targetSocketId}:`, stream);
      setRemoteStreams(prev => ({ ...prev, [targetSocketId]: stream }));
    });

    peer.on('connect', () => {
      console.log(`Peer connection established: ${myPeerId} <-> ${targetSocketId}`);
    });

    peer.on('close', () => {
      console.log(`Peer connection closed: ${myPeerId} <-> ${targetSocketId}`);
      setRemoteStreams(prev => {
        const { [targetSocketId]: _, ...rest } = prev;
        return rest;
      });
      setPeers(prev => {
        const { [targetSocketId]: _, ...rest } = prev;
        return rest;
      });
    });

    peer.on('error', (err: Error) => {
      console.error(`Peer error (${myPeerId} <-> ${targetSocketId}):`, err);
      // Clean up this specific peer on error
      if (peers[targetSocketId]) {
        peers[targetSocketId].destroy();
      }
      setRemoteStreams(prev => {
        const { [targetSocketId]: _, ...rest } = prev;
        return rest;
      });
      setPeers(prev => {
        const { [targetSocketId]: _, ...rest } = prev;
        return rest;
      });
    });

    setPeers(prev => ({ ...prev, [targetSocketId]: peer }));
    return peer;
  }, [localStream, socket, myPeerId, peers]); // Added peers to dependency array

  useEffect(() => {
    if (!socket || !myPeerId) return; // Ensure myPeerId is available

    socket.on('user-joined', ({ userId: newPeerId, roomId }: { userId: string, roomId: string }) => {
      if (newPeerId !== myPeerId) {
        console.log(`User ${newPeerId} joined room ${roomId}. ${myPeerId} creating peer (I am initiator).`);
        createPeer(newPeerId, true);
      }
    });

    socket.on('signal', ({ from: senderPeerId, signal }: { from: string, signal: SignalData }) => {
      if (senderPeerId !== myPeerId) {
        console.log(`Received signal at ${myPeerId} from ${senderPeerId}:`, signal);
        const peer = peers[senderPeerId];
        if (peer) {
          peer.signal(signal);
        } else {
          console.log(`Peer ${senderPeerId} is new for ${myPeerId}. Creating peer (I am not initiator).`);
          const newPeer = createPeer(senderPeerId, false);
          if (newPeer) {
            newPeer.signal(signal);
          }
        }
      }
    });

    socket.on('user-left', ({ userId: departingPeerId, roomId }: { userId: string, roomId: string}) => {
      if (departingPeerId !== myPeerId) {
        console.log(`User ${departingPeerId} left room ${roomId}. Cleaning up peer at ${myPeerId}.`);
        if (peers[departingPeerId]) {
          peers[departingPeerId].destroy();
        }
        setRemoteStreams(prev => {
          const { [departingPeerId]: _, ...rest } = prev;
          return rest;
        });
        setPeers(prev => {
          const { [departingPeerId]: _, ...rest } = prev;
          return rest;
        });
      }
    });

    return () => {
      socket.off('user-joined');
      socket.off('signal');
      socket.off('user-left');
    };
  }, [socket, peers, myPeerId, createPeer]);

  return (
    <WebRTCContext.Provider value={{
      socket,
      localStream,
      remoteStreams,
      peers,
      myPeerId,
      isMediaLoading,
      mediaError,
      initializeMedia,
      stopMedia,
      joinRoom,
      leaveRoom
    }}>
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = (): WebRTCContextType => {
  const context = useContext(WebRTCContext);
  if (context === undefined) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};
 