import React from 'react';
import { useWebRTC } from '../../../contexts/WebRTCContext'; // パス確認

const ParticipantList: React.FC = () => {
  const { peers, myPeerId, remoteStreams } = useWebRTC();

  // 自分自身も参加者として表示する場合
  const allParticipantIds = myPeerId ? [myPeerId, ...Object.keys(peers)] : Object.keys(peers);
  // ユニークなIDのみにフィルタリング (peersには自分は含まれないが、remoteStreamsのキーやuser-joinedイベントで重複する可能性を考慮)
  const uniqueParticipantIds = Array.from(new Set(allParticipantIds));

  if (!myPeerId) {
    return <p className="text-gray-400">接続待機中...</p>;
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2 text-white">参加者 ({uniqueParticipantIds.length})</h3>
      {uniqueParticipantIds.length === 0 && <p className="text-gray-400">現在、他の参加者はいません。</p>}
      <ul className="space-y-1">
        {uniqueParticipantIds.map((peerId) => (
          <li key={peerId} className="text-sm p-2 rounded bg-gray-700 text-gray-200">
            {peerId === myPeerId ? `${peerId} (あなた)` : peerId}
            {/* TODO: 接続状態やミュート状態などを表示 */} 
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ParticipantList; 