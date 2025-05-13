import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import MainLayout from "../components/layout/MainLayout";

export default function Home() {
  return (
    <MainLayout>
      <div className="relative pb-20">
        {/* Hero Section */}
        <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 overflow-hidden next-section">
          <div className="next-container relative z-10">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16 next-fadeIn">
              <h1 className="next-heading mb-6 text-4xl sm:text-5xl lg:text-6xl">
                Session: みんなで創る音楽セッション！
              </h1>
              <p className="next-subheading mb-10 max-w-2xl mx-auto text-lg sm:text-xl">
                リアルタイムで音を重ね、リスナーと繋がる。新しい音楽体験プラットフォームで、セッションをもっと楽しく、もっと身近に。
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Link href="/sessions" className="next-button button-primary">
                  セッションを探す
                </Link>
                <Link href="/sessions/create" className="next-button button-secondary">
                  セッションを作成 <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="next-section">
          <div className="next-container">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 sm:mb-16">主な機能</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="next-card p-6 sm:p-8 flex flex-col h-full">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-5 ring-4 ring-primary/20">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">リアルタイムセッション</h3>
                <p className="flex-grow">演者同士がリアルタイムで音楽セッションを行うことができます。低レイテンシーで高品質な音声通信を実現。</p>
              </div>
              
              <div className="next-card p-6 sm:p-8 flex flex-col h-full">
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-5 ring-4 ring-green-500/20">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">高品質配信</h3>
                <p className="flex-grow">リスナーには自動でミキシングされた高品質な音声を配信。複数のパフォーマーの音をバランス良く届けます。</p>
              </div>
              
              <div className="next-card p-6 sm:p-8 flex flex-col h-full">
                <div className="w-12 h-12 bg-sky-500/10 rounded-lg flex items-center justify-center mb-5 ring-4 ring-sky-500/20">
                  <svg className="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">コミュニティ</h3>
                <p className="flex-grow">音楽を通じて新しい仲間との出会いを促進。演者とリスナーが交流できるチャット機能も完備。</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="next-section">
          <div className="next-container">
            <div className="next-card p-8 md:p-12 text-center max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">今すぐ音楽体験を始めよう</h2>
              <p className="mb-8 max-w-xl mx-auto text-lg">
                新しい音楽の楽しみ方を体験してみませんか？<br className="hidden sm:block" />
                演者としても、リスナーとしても、新しい音楽体験があなたを待っています。
              </p>
              <Link href="/sessions" className="next-button button-primary px-10 py-4 text-lg">
                無料アカウント作成
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
