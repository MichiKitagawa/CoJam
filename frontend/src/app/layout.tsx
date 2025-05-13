import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { WebRTCProvider } from "../contexts/WebRTCContext";

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Session - 即興コラボ音楽ライブプラットフォーム",
  description: "演者同士がリアルタイムでセッションし、リスナーには高品質Mix配信を行うプラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} dark scroll-smooth`}>
      <body className="font-sans antialiased bg-black text-white">
        <AuthProvider>
          <WebRTCProvider>
            {children}
          </WebRTCProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
