import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "tackup",
  description: "Next.js + Drizzle + Better Auth template",
};

/** CSP の nonce はリクエストごとに作るので、すべてのページをリクエストのたびに描画する（ビルド時に作った静的なページには nonce が付かない）。 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();

  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
