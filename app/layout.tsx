import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoMoreRipOff — 근로계약서 위험 조항 검사",
  description:
    "근로계약서를 사진으로 찍으면 위법 소지가 있는 조항을 바로 확인할 수 있습니다. 법률 자문이 아닌 참고용 정보입니다.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
