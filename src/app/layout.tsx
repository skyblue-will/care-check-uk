import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Care Check UK - Find & Compare CQC-Rated Care Homes",
  description:
    "Search and compare care homes across England using official CQC ratings. Find the best-rated care homes near you with inspection results, ratings breakdowns, and area insights.",
  keywords: [
    "care homes near me",
    "CQC ratings",
    "care home ratings",
    "best care homes",
    "care home comparison",
    "nursing homes England",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-stone-50 text-stone-900`}>
        <header className="border-b border-stone-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-2xl">🏥</span>
              <span className="text-xl font-bold text-teal-700">Care Check UK</span>
            </a>
            <nav className="hidden sm:flex gap-6 text-sm text-stone-600">
              <a href="/" className="hover:text-teal-700">Search</a>
              <a href="/about" className="hover:text-teal-700">About</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-stone-200 bg-white mt-16">
          <div className="max-w-5xl mx-auto px-4 py-8 text-center text-sm text-stone-500">
            <p>Data from the <a href="https://www.cqc.org.uk" className="underline hover:text-teal-700">Care Quality Commission</a> under the Open Government Licence.</p>
            <p className="mt-1">Care Check UK is not affiliated with CQC.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
