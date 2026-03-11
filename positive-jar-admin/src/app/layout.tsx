import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Positive Jar — Admin Dashboard",
  description: "Admin Panel — Quản lý nhân sự, sản xuất, bảng công, cài đặt",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
