import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mint · หมาล่าไม้โปรดของคุณ",
  description: "เลือกหมาล่า สั่งอาหาร ชำระเงิน และติดตามออเดอร์กับ Mint",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased">{children}</body>
    </html>
  );
}
