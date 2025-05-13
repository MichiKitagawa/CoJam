import React from 'react';
import Link from 'next/link';
import { Twitter, Github } from 'lucide-react'; // lucide-reactから直接インポート

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const siteConfig = {
    name: 'Session',
    description: 'リアルタイム音楽コラボレーションプラットフォーム',
    url: 'https://cojam.com', // ドメインは仮
    ogImage: 'https://cojam.com/og.jpg', // OG画像も仮
    links: {
      twitter: 'https://twitter.com/cojam_official',
      github: 'https://github.com/cojam-dev/cojam',
    },
  };

  const footerNav = [
    {
      title: 'プロダクト',
      items: [
        { title: '機能', href: '/features' },
        { title: '料金', href: '/pricing' },
        { title: 'ドキュメント', href: '/docs' },
        { title: 'リリースノート', href: '/changelog' },
      ],
    },
    {
      title: '企業情報',
      items: [
        { title: '会社概要', href: '/about' },
        { title: '採用情報', href: '/careers' },
        { title: 'プレス', href: '/press' },
      ],
    },
    {
      title: 'リソース',
      items: [
        { title: 'ブログ', href: '/blog' },
        { title: 'サポート', href: '/support' },
        { title: 'お問い合わせ', href: '/contact' },
      ],
    },
  ];

  return (
    <footer className="border-t border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <div className="next-container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <span className="text-xl font-bold">
                Session
              </span>
            </Link>
            <p className="text-sm text-[rgb(var(--muted-foreground))] max-w-xs">
              {siteConfig.description}
            </p>
          </div>
          {footerNav.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold mb-3.5">
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.items.map((item) => (
                  <li key={item.title}>
                    <Link 
                      href={item.href}
                      className="text-sm text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] transition-colors duration-200"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-[rgb(var(--border))] flex flex-col sm:flex-row items-center justify-between">
          <p className="text-xs text-[rgb(var(--muted-foreground))]">
            &copy; {currentYear} Session. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <Link href={siteConfig.links.twitter} target="_blank" rel="noreferrer" className="text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] transition-colors duration-200">
              <Twitter className="h-4 w-4" />
              <span className="sr-only">Twitter</span>
            </Link>
            <Link href={siteConfig.links.github} target="_blank" rel="noreferrer" className="text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] transition-colors duration-200">
              <Github className="h-4 w-4" />
              <span className="sr-only">GitHub</span>
            </Link>
            {/* 他のソーシャルリンクも必要に応じて追加 */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 