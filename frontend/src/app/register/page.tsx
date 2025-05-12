'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const { state, register, clearError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.isAuthenticated) {
      router.push('/dashboard');
    }
  }, [state.isAuthenticated, router]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const validateForm = () => {
    if (password !== confirmPassword) {
      setPasswordError('パスワードが一致しません');
      return false;
    }
    if (password.length < 8) {
      setPasswordError('パスワードは8文字以上である必要があります');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await register({
        name,
        email,
        password,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center next-section bg-black">
      <div className="max-w-md w-full space-y-6 p-8 md:p-10 next-card next-fadeIn">
        <div className="text-center">
          <Link href="/" className="inline-block mb-8">
            <span className="text-2xl font-semibold text-white">
              CoJam
            </span>
          </Link>
          <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">新規アカウント登録</h2>
          <p className="mt-2 text-sm text-zinc-400">音楽で繋がる新しい世界へようこそ</p>
        </div>
        
        {state.error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-lg next-fadeIn text-sm">
            <p>{state.error}</p>
          </div>
        )}
        
        {passwordError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-lg next-fadeIn text-sm">
            <p>{passwordError}</p>
          </div>
        )}
        
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-zinc-400 mb-1.5">
                名前
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-dark block w-full px-3.5 py-2.5 text-sm"
                placeholder="フルネーム"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-zinc-400 mb-1.5">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark block w-full px-3.5 py-2.5 text-sm"
                placeholder="you@example.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-zinc-400 mb-1.5">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark block w-full px-3.5 py-2.5 text-sm"
                placeholder="•••••••• (8文字以上)"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-zinc-400 mb-1.5">
                パスワード（確認）
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-dark block w-full px-3.5 py-2.5 text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full next-button button-primary py-3 text-sm disabled:opacity-70"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  登録中...
                </div>
              ) : 'アカウント作成'}
            </button>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-zinc-400">
              既にアカウントをお持ちですか？{' '}
              <Link href="/login" className="font-medium text-violet-400 hover:text-violet-300 transition-colors duration-200">
                ログインはこちら
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage; 