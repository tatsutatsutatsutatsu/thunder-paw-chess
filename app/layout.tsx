import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'THUNDER PAW CHESS | 猫たちのチェス', description: '猫のコレクションフィギュアで楽しむチェス。2人対戦と初級CPU対戦。' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) { return <html lang="ja"><body>{children}</body></html>; }
