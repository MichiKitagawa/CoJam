export const formatDate = (dateString: string, showFullDateTime: boolean = false): string => {
  const date = new Date(dateString);
  
  // 日付が無効な場合
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  // 詳細な日時表示が必要な場合
  if (showFullDateTime) {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // 現在日時との差を計算
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // 1時間以内
  if (diffMins < 60) {
    return `${diffMins}分前`;
  }
  
  // 24時間以内
  if (diffHours < 24) {
    return `${diffHours}時間前`;
  }
  
  // 7日以内
  if (diffDays < 7) {
    return `${diffDays}日前`;
  }
  
  // それ以上は日付形式で
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}; 