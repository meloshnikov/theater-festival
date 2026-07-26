import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Фестиваль в твоём ритме",
  description:
    "Интерактивная программа XIV Международного фестиваля уличных театров «Елагин парк», 24–26 июля 2026 года.",
  other: {
    "codex-preview": "development",
  },
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
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
