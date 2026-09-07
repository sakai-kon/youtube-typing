import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YouTube Typing',
  description: 'YouTube動画に合わせて自分で作った譜面をタイピングするサービス',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
