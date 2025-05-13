'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  requireAuth?: boolean;
}

const Navbar: React.FC = () => {
  const { state, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation: NavItem[] = [
    { name: 'ダッシュボード', href: '/dashboard', requireAuth: true },
    { name: 'セッション一覧', href: '/sessions' },
    { name: 'セッション作成', href: '/sessions/create', requireAuth: true },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const filteredNavigation = navigation.filter(item => {
    if (item.requireAuth && !state.isAuthenticated) {
      return false;
    }
    return true;
  });

  return (
    <header 
      className={`fixed top-0 z-50 w-full transition-all duration-200 bg-black border-b border-gray-800/70`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <span className="text-lg font-semibold text-white">
                Session
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:space-x-5">
            {filteredNavigation.map((item) => (
              <Link 
                key={item.name} 
                href={item.href}
                className={`relative py-1.5 px-1 text-sm transition-colors ${
                  pathname === item.href 
                    ? 'text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {item.name}
                {pathname === item.href && (
                  <span className="absolute inset-x-0 bottom-0 h-[2px] bg-white" />
                )}
              </Link>
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {state.isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Link 
                  href="/profile" 
                  className="flex items-center text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs text-white border border-gray-700">
                    {state.user?.name.charAt(0).toUpperCase() || 'U'}
                  </span>
                  <span className="hidden lg:inline-block ml-2 text-xs">{state.user?.name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  ログアウト
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs text-gray-300 hover:text-white transition-colors px-2 py-1 rounded-md"
                >
                  ログイン
                </Link>
                <Link
                  href="/register"
                  className="bg-gray-200 hover:bg-gray-300 text-xs px-2.5 py-1.5 rounded-md text-black transition-colors"
                >
                  登録
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-400 hover:text-white"
            >
              <span className="sr-only">メニューを開く</span>
              {mobileMenuOpen ? (
                <XMarkIcon className="h-3.5 w-3.5" />
              ) : (
                <Bars3Icon className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-md border-b border-gray-800/70">
          <div className="px-3 pt-2 pb-3 space-y-1">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-2 py-1.5 rounded-md text-sm ${
                  pathname === item.href
                    ? 'text-white bg-gray-800/50'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                } transition-colors`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            
            {state.isAuthenticated ? (
              <>
                <Link
                  href="/profile"
                  className="block px-2 py-1.5 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800/30 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  プロフィール
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left block px-2 py-1.5 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800/30 transition-colors"
                >
                  ログアウト
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block px-2 py-1.5 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800/30 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  ログイン
                </Link>
                <Link
                  href="/register"
                  className="block px-2 py-1.5 rounded-md text-sm bg-gray-200 text-black hover:bg-gray-300 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  登録
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar; 