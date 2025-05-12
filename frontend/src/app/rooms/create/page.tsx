'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { createRoom, CreateRoomParams } from '../../../services/roomService';
import FormInput from '../../../components/common/FormInput';
import FormTextarea from '../../../components/common/FormTextarea';
import FormCheckbox from '../../../components/common/FormCheckbox';
import FormSelect from '../../../components/common/FormSelect';
import FormDateTimePicker from '../../../components/common/FormDateTimePicker';

const CreateRoomPage: React.FC = () => {
  const { state } = useAuth();
  const router = useRouter();
  
  // ルーム作成ステート
  const [formData, setFormData] = useState<CreateRoomParams>({
    title: '',
    description: '',
    isPaid: false,
    price: undefined,
    maxParticipants: 4,
    isArchiveEnabled: true,
    scheduledStartAt: undefined
  });
  const [startNow, setStartNow] = useState<boolean>(false);
  
  // エラーと読み込み状態
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // ユーザーが認証されていない、またはパフォーマーでない場合はリダイレクト
  useEffect(() => {
    if (!state.loading) {
      if (!state.isAuthenticated) {
        router.push('/login?redirect=/rooms/create');
        return;
      }
    }
  }, [state.loading, state.isAuthenticated, state.user, router]);
  
  // フォーム入力変更ハンドラー
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // チェックボックスの場合は特別な処理
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }
    
    // 数値フィールドの場合は数値に変換
    if (type === 'number') {
      const numberValue = value === '' ? undefined : Number(value);
      setFormData(prev => ({ ...prev, [name]: numberValue }));
      return;
    }
    
    // 通常のフィールド
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // エラーをクリア
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // 日時選択のハンドラー
  const handleDateTimeChange = (dateTime: string | undefined) => {
    setFormData(prev => ({ ...prev, scheduledStartAt: dateTime }));
    
    // エラーをクリア
    if (errors.scheduledStartAt) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.scheduledStartAt;
        return newErrors;
      });
    }
  };
  
  // 開始方法の変更ハンドラー
  const handleStartOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isStartNow = e.target.value === 'now';
    setStartNow(isStartNow);
    if (isStartNow) {
      // 「今すぐ開始」を選んだら、日時指定のエラーはクリア
      if (errors.scheduledStartAt) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.scheduledStartAt;
          return newErrors;
        });
      }
      // 「今すぐ開始」の場合、日時指定をクリア
      setFormData(prev => ({ ...prev, scheduledStartAt: undefined }));
    }
  };
  
  // フォームバリデーション
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'タイトルは必須です';
    }
    
    if (formData.isPaid && (!formData.price || formData.price <= 0)) {
      newErrors.price = '有料ルームの場合、価格を設定してください';
    }
    
    if (formData.maxParticipants < 2 || formData.maxParticipants > 10) {
      newErrors.maxParticipants = '参加者数は2〜10人の間で設定してください';
    }
    
    if (!startNow && !formData.scheduledStartAt) {
      newErrors.scheduledStartAt = '予約開始の場合、開始予定日時を指定してください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // フォームバリデーション
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    let submissionData = { ...formData };
    if (startNow) {
      const now = new Date();
      // 現在時刻から1分後をUTCで設定 (簡易的な方法)
      // より正確には date-fns-tz などを使うべき
      now.setMinutes(now.getMinutes() + 1);
      submissionData.scheduledStartAt = now.toISOString();
    }
    
    try {
      const response = await createRoom(submissionData);
      
      if (response.success && response.room) {
        // 作成成功したら詳細ページへリダイレクト
        router.push(`/rooms/${response.room.id}`);
      } else {
        // エラーメッセージの設定
        setSubmitError(response.message || 'ルームの作成に失敗しました');
      }
    } catch (error) {
      console.error('ルーム作成エラー:', error);
      setSubmitError('ルーム作成中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ローディング中の表示
  if (state.loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-zinc-950">
        <p className="text-zinc-400">ロード中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 py-12">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8 text-zinc-100">新しいルームを作成</h1>
        
        {submitError && (
          <div className="bg-red-900/30 border-l-4 border-red-500 text-red-200 p-4 rounded-md mb-6">
            <p>{submitError}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="bg-zinc-900 shadow-md rounded-lg p-6 border border-zinc-800">
          {/* タイトル */}
          <FormInput
            label="ルームタイトル"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            required
            className="input-dark"
          />
          
          {/* 説明 */}
          <FormTextarea
            label="ルーム説明"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            error={errors.description}
            placeholder="ルームの説明を入力してください"
            rows={4}
            className="input-dark"
          />
          
          {/* 有料設定 */}
          <FormCheckbox
            label="有料ルームにする"
            name="isPaid"
            checked={formData.isPaid}
            onChange={handleChange}
          />
          
          {/* 価格（有料の場合のみ表示） */}
          {formData.isPaid && (
            <FormInput
              label="価格（円）"
              name="price"
              type="number"
              min={100}
              step={100}
              value={formData.price || ''}
              onChange={handleChange}
              error={errors.price}
              required={formData.isPaid}
              className="input-dark"
            />
          )}
          
          {/* 最大参加者数 */}
          <FormSelect
            label="最大参加者数"
            name="maxParticipants"
            value={formData.maxParticipants.toString()}
            onChange={handleChange}
            error={errors.maxParticipants}
            className="input-dark"
            options={[
              { value: '2', label: '2人' },
              { value: '3', label: '3人' },
              { value: '4', label: '4人' },
              { value: '5', label: '5人' },
              { value: '6', label: '6人' },
              { value: '8', label: '8人' },
              { value: '10', label: '10人' }
            ]}
          />
          
          {/* アーカイブ設定 */}
          <FormCheckbox
            label="セッション終了後にアーカイブを保存する"
            name="isArchiveEnabled"
            checked={formData.isArchiveEnabled}
            onChange={handleChange}
          />
          
          {/* 開始方法の選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">開始方法</label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center text-zinc-400">
                <input
                  type="radio"
                  name="startOption"
                  value="schedule"
                  checked={!startNow}
                  onChange={handleStartOptionChange}
                  className="form-radio h-4 w-4 text-violet-600 bg-zinc-800 border-zinc-700 focus:ring-violet-500"
                />
                <span className="ml-2">予約して開始</span>
              </label>
              <label className="flex items-center text-zinc-400">
                <input
                  type="radio"
                  name="startOption"
                  value="now"
                  checked={startNow}
                  onChange={handleStartOptionChange}
                  className="form-radio h-4 w-4 text-violet-600 bg-zinc-800 border-zinc-700 focus:ring-violet-500"
                />
                <span className="ml-2">今すぐ開始</span>
              </label>
            </div>
          </div>
          
          {/* 開始予定日時 (予約の場合のみ表示) */}
          {!startNow && (
            <FormDateTimePicker
              label="開始予定日時"
              value={formData.scheduledStartAt}
              onChange={handleDateTimeChange}
              error={errors.scheduledStartAt}
              minDate={new Date()}
              className="input-dark"
            />
          )}
          
          {/* 送信ボタン */}
          <div className="mt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 rounded-md text-white font-medium ${
                isSubmitting
                  ? 'bg-violet-900/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700'
              } transition-all duration-200 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  処理中...
                </div>
              ) : 'ルームを作成する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomPage; 