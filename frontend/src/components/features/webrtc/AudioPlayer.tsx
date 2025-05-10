import React, { useEffect, useRef } from 'react';

interface AudioPlayerProps {
  stream: MediaStream | null;
  isLocalStream?: boolean;
  peerId?: string; // For debugging or identification
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ stream, isLocalStream = false, peerId }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    } else if (audioRef.current) {
      audioRef.current.srcObject = null; // Clear stream if null
    }
  }, [stream]);

  return (
    <div>
      {peerId && <p className="text-xs text-gray-400">{isLocalStream ? `Local (${peerId})` : `Remote (${peerId})`}</p>}
      <audio ref={audioRef} autoPlay playsInline muted={isLocalStream} />
      {/* ローカルストリームはハウリング防止のためデフォルトでミュート */}
      {/* TODO: ボリュームコントロールやミュート切り替え機能の追加 */}
    </div>
  );
};

export default AudioPlayer; 