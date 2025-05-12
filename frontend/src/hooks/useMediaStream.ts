'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseMediaStreamOptions {
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
}

function useMediaStream(options?: UseMediaStreamOptions) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const defaultOptions: UseMediaStreamOptions = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false, // CoJamは音声のみなのでデフォルトfalse
    ...(options || {}),
  };

  const getMediaStream = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(defaultOptions as MediaStreamConstraints);
      setStream(mediaStream);
    } catch (err) {
      console.error('メディアアクセスエラー:', err);
      setError(err as Error);
      setStream(null);
    } finally {
      setIsLoading(false);
    }
  }, []); // 依存配列を空に変更

  const stopMediaStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsLoading(false);
      console.log('メディアストリームを停止しました。');
    }
  }, [stream]);

  useEffect(() => {
    // フックがアンマウントされる際にストリームを停止するクリーンアップ関数
    return () => {
      stopMediaStream();
    };
  }, [stopMediaStream]);

  return { stream, error, isLoading, getMediaStream, stopMediaStream };
}

export default useMediaStream; 