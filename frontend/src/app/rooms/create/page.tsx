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
      
      if (state.user?.role !== 'performer') {
        router.push('/rooms');
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
    
    try {
      const response = await createRoom(formData);
      
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
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500">ロード中...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">新しいルームを作成</h1>
      
      {submitError && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">
          <p>{submitError}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        {/* タイトル */}
        <FormInput
          label="ルームタイトル"
          name="title"
          value={formData.title}
          onChange={handleChange}
          error={errors.title}
          required
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
          />
        )}
        
        {/* 最大参加者数 */}
        <FormSelect
          label="最大参加者数"
          name="maxParticipants"
          value={formData.maxParticipants.toString()}
          onChange={handleChange}
          error={errors.maxParticipants}
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
        
        {/* 開始予定日時 */}
        <FormDateTimePicker
          label="開始予定日時"
          value={formData.scheduledStartAt}
          onChange={handleDateTimeChange}
          error={errors.scheduledStartAt}
          minDate={new Date()}
        />
        
        {/* 送信ボタン */}
        <div className="mt-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 px-4 rounded-md text-white font-medium ${
              isSubmitting
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isSubmitting ? 'ルーム作成中...' : 'ルームを作成'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateRoomPage; 