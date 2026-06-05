import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";
import { UsernameGate } from "@/components/ui/UsernameGate";

export const metadata: Metadata = {
  title: "WC2026 竞猜 — 世界杯预测平台",
  description: "与朋友一起预测2026世界杯赛果，发现价值投注机会",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="min-h-screen bg-black antialiased">
        <UsernameGate>
          <Navbar />
          <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
        </UsernameGate>
      </body>
    </html>
  );
}
