import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'THUNDER PAW | でんきねこのゲームひろば', description: 'でんきねこと遊ぶミニゲーム。チェスやソリティアから、すきなゲームをえらんで遊ぼう！' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) { return <html lang="ja"><body>{children}</body></html>; }
