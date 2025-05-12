export const formatDate = (dateString: string, showFullDateTime: boolean = false): string => {
  const date = new Date(dateString);
  
  // 日付が無効な場合
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: showFullDateTime ? 'long' : 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo'
  };
  
  // 未来の予定時刻、または詳細表示が求められる場合は、指定のフォーマットでJST表示
  const now = new Date();
  if (date.getTime() > now.getTime() || showFullDateTime) {
    return date.toLocaleString('ja-JP', options) + ' (JST)';
  }
  
  // 過去の時刻については相対表示
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) { // 1分未満は「たった今」などでも良いが、ここではシンプルに
    return '1分未満前';
  }
  if (diffMins < 60) {
    return `${diffMins}分前`;
  }
  
  if (diffHours < 24) {
    return `${diffHours}時間前`;
  }
  
  if (diffDays < 7) {
    return `${diffDays}日前`;
  }
  
  // それ以上過去の場合は、指定のフォーマットでJST表示
  return date.toLocaleString('ja-JP', options) + ' (JST)';
}; 