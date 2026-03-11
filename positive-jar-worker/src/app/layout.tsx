import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Positive Jar — Chấm Công & Báo Cáo",
  description: "App nhân viên sản xuất Positive Jar - Chấm công, báo cáo công việc, đăng ký lịch",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
