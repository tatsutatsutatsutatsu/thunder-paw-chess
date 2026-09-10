import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'THUNDER PAW CHESS | 猫たちのチェス', description: '猫のコレクションフィギュアで楽しむチェス。6桁の番号によるインターネット対戦、2人対戦、初級CPU対戦に対応。' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) { return <html lang="ja"><body>{children}</body></html>; }
