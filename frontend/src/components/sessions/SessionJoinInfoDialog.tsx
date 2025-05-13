import React, { useState } from 'react';

interface SessionJoinInfoDialogProps {
  sessionId: string;
  joinToken: string;
  onClose: () => void;
}

const SessionJoinInfoDialog: React.FC<SessionJoinInfoDialogProps> = ({ sessionId, joinToken, onClose }) => {
  const [copied, setCopied] = useState<'url' | 'token' | null>(null);
  
  const getInviteUrl = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/invite/${joinToken}`;
  };
  
  const copyToClipboard = async (text: string, type: 'url' | 'token') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-4 w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">セッション招待情報</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="閉じる"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-2">
            以下の招待URLまたは参加トークンを共有して、他のユーザーをこのセッションに招待できます。
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            招待URL
          </label>
          <div className="flex">
            <input
              type="text"
              readOnly
              value={getInviteUrl()}
              className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50"
            />
            <button
              onClick={() => copyToClipboard(getInviteUrl(), 'url')}
              className="px-3 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700"
            >
              {copied === 'url' ? 'コピー済み' : 'コピー'}
            </button>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            参加トークン
          </label>
          <div className="flex">
            <input
              type="text"
              readOnly
              value={joinToken}
              className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50"
            />
            <button
              onClick={() => copyToClipboard(joinToken, 'token')}
              className="px-3 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700"
            >
              {copied === 'token' ? 'コピー済み' : 'コピー'}
            </button>
          </div>
        </div>
        
        <div className="text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionJoinInfoDialog; 