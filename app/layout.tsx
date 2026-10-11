import type { Metadata } from 'next';
import './globals.css';
import { UpdateChecker } from './update-checker';

export const metadata: Metadata = {
  title: 'YouTube Typing — 動画タイピングゲーム',
  description: 'YouTube動画に合わせて自分で作った譜面をタイピングするサービス',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <UpdateChecker />
        {children}
      </body>
    </html>
  );
}
