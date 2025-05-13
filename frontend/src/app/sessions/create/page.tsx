'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
// import { createRoom, CreateRoomParams } from '../../../services/roomService'; // 旧パス
import { createSession, CreateSessionParams } from '../../../services/sessionService'; // ★ 新パス・新識別子
import FormInput from '../../../components/common/FormInput';
import FormTextarea from '../../../components/common/FormTextarea';
import FormCheckbox from '../../../components/common/FormCheckbox';
import FormSelect from '../../../components/common/FormSelect';
import FormDateTimePicker from '../../../components/common/FormDateTimePicker';

const CreateSessionPage: React.FC = () => { // ★ CreateRoomPage -> CreateSessionPage
  const { state } = useAuth();
  const router = useRouter();
  
  // セッション作成ステート (formData: CreateRoomParams -> CreateSessionParams)
  const [formData, setFormData] = useState<CreateSessionParams>({
    title: '',
    description: '',
    isPaid: false,
    price: undefined,
    maxParticipants: 4, // 同時演者数の初期値などに変更する可能性あり
    isArchiveEnabled: true,
    scheduledStartAt: undefined
  });
  // ★ startNow はセッション作成オプションの「今すぐ配信」「予定」に関わるので、より明確な名前に変更を検討 (例: creationType: 'now' | 'schedule')
  const [startNow, setStartNow] = useState<boolean>(false); // true: 今すぐ配信, false: 予定して作成
  
  // エラーと読み込み状態
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // ユーザーが認証されていない場合はリダイレクト
  useEffect(() => {
    if (!state.loading) {
      if (!state.isAuthenticated) {
        router.push('/login?redirect=/sessions/create'); // ★ /rooms/create -> /sessions/create
        return;
      }
    }
  }, [state.loading, state.isAuthenticated, router]);
  
  // フォーム入力変更ハンドラー
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }
    
    if (type === 'number') {
      const numberValue = value === '' ? undefined : Number(value);
      setFormData(prev => ({ ...prev, [name]: numberValue }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
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
    if (errors.scheduledStartAt) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.scheduledStartAt;
        return newErrors;
      });
    }
  };
  
  // 開始オプションの変更ハンドラー (「今すぐ配信」か「予定」か)
  const handleCreationTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isStartNow = e.target.value === 'now';
    setStartNow(isStartNow);
    if (isStartNow) {
      if (errors.scheduledStartAt) {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.scheduledStartAt;
            return newErrors;
        });
      }
      setFormData(prev => ({ ...prev, scheduledStartAt: undefined })); // 日時クリア
    } else {
      // 「予定」を選んだ場合、もし日時が未入力ならエラーを出す準備 (バリデーション時)
    }
  };
  
  // フォームバリデーション
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'タイトルは必須です';
    }
    
    if (formData.isPaid && (!formData.price || formData.price <= 0)) {
      newErrors.price = '有料セッションの場合、価格を設定してください'; // ★ ルーム -> セッション
    }
    
    // maxParticipants のバリデーションは、演者数上限などの仕様に合わせて見直しが必要
    if (formData.maxParticipants < 2 || formData.maxParticipants > 10) {
      newErrors.maxParticipants = '最大参加者数 (演者数など) は2〜10人の間で設定してください';
    }
    
    if (!startNow && !formData.scheduledStartAt) {
      newErrors.scheduledStartAt = '「予定して作成」の場合、開始予定日時を指定してください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    let submissionData = { ...formData };
    // 「今すぐ配信」の場合、scheduledStartAt はAPI側で設定されるか、ここでは設定しない
    // または、便宜上現在時刻を設定する。ここではユーザーの要望に合わせて「その時点で配信が始まる」を優先し、
    // scheduledStartAt はAPI側でよしなに扱ってもらう想定 or startNow フラグをAPIに渡す。
    // 今回は createSession のインターフェースに従い、startNowなら scheduledStartAt を設定しない (API側で解釈する想定)
    if (startNow) {
      submissionData.scheduledStartAt = undefined; // 「今すぐ」なので日時は不要
      // 必要であれば、APIに `startNow: true` のようなフラグを渡す改修を検討
    }
    
    try {
      const response = await createSession(submissionData); // ★ createRoom -> createSession
      
      if (response.success && response.session) { // ★ room -> session
        // 作成成功したら詳細ページへリダイレクト
        router.push(`/sessions/${response.session.id}`); // ★ /rooms/ -> /sessions/
      } else {
        setSubmitError(response.message || 'セッションの作成に失敗しました'); // ★ ルーム -> セッション
      }
    } catch (error) {
      console.error('セッション作成エラー:', error); // ★ ルーム -> セッション
      setSubmitError('セッション作成中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h1 className="text-3xl font-bold mb-8 text-zinc-100">新しいセッションを作成</h1> {/* ★ ルーム -> セッション */}
        
        {submitError && (
          <div className="bg-red-900/30 border-l-4 border-red-500 text-red-200 p-4 rounded-md mb-6">
            <p>{submitError}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="bg-zinc-900 shadow-md rounded-lg p-6 border border-zinc-800">
          {/* タイトル */}
          <FormInput
            label="セッションタイトル" // ★ ルーム -> セッション
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            required
            className="input-dark"
          />
          
          {/* 説明 */}
          <FormTextarea
            label="セッションの説明 (任意)" // ★ ルーム -> セッション
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows={4}
            className="input-dark"
          />

          {/* 開始方法の選択 */} 
          <fieldset className="my-6">
            <legend className="text-zinc-300 text-sm font-medium mb-2">作成オプション</legend>
            <div className="flex items-center space-x-6">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="radio" 
                  name="creationType" 
                  value="schedule" 
                  checked={!startNow} 
                  onChange={handleCreationTypeChange} 
                  className="form-radio-dark"
                />
                <span className="ml-2 text-zinc-300">予定して作成</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input 
                  type="radio" 
                  name="creationType" 
                  value="now" 
                  checked={startNow} 
                  onChange={handleCreationTypeChange}
                  className="form-radio-dark"
                />
                <span className="ml-2 text-zinc-300">今すぐ配信</span>
              </label>
            </div>
          </fieldset>

          {/* 予約開始日時 (「予定して作成」の場合のみ表示) */}
          {!startNow && (
            <FormDateTimePicker
              label="開始予定日時"
              value={formData.scheduledStartAt}
              onChange={handleDateTimeChange}
              error={errors.scheduledStartAt}
              required={!startNow} // 「予定して作成」の場合は必須
            />
          )}
          
          {/* 有料設定 */}
          <FormCheckbox
            label="有料セッションにする" // ★ ルーム -> セッション
            name="isPaid"
            checked={formData.isPaid}
            onChange={handleChange}
          />
          
          {/* 価格 (有料の場合のみ表示) */}
          {formData.isPaid && (
            <FormInput
              label="価格 (円)"
              name="price"
              type="number"
              value={formData.price === undefined ? '' : formData.price.toString()}
              onChange={handleChange}
              error={errors.price}
              min={1}
              required={formData.isPaid}
              className="input-dark"
            />
          )}
          
          {/* 最大参加者数 (演者数など) */}
          <FormInput 
            label="最大参加者数 (ホスト含む演者上限など)" // ラベルをより具体的に
            name="maxParticipants"
            type="number"
            value={formData.maxParticipants.toString()} 
            onChange={handleChange}
            error={errors.maxParticipants}
            min={2} 
            max={10} 
            required
            className="input-dark"
          />

          {/* アーカイブ設定 */}
          <FormCheckbox
            label="アーカイブを有効にする"
            name="isArchiveEnabled"
            checked={formData.isArchiveEnabled}
            onChange={handleChange}
          />
          
          <div className="mt-8 pt-6 border-t border-zinc-700">
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full next-button button-primary text-base py-3 disabled:opacity-70"
            >
              {isSubmitting ? '作成中...' : 'セッションを作成'} {/* ★ ルーム -> セッション */}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSessionPage; 