import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Care Home Ratings — Compare CQC-Rated Care Homes in England",
  description:
    "Compare care homes in England using official CQC inspection ratings. Search by postcode to find care homes rated Outstanding, Good, Requires Improvement or Inadequate across all five quality areas.",
  keywords: [
    "care homes near me",
    "CQC ratings",
    "care home ratings",
    "best care homes",
    "nursing homes England",
    "care home comparison",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased bg-white text-slate-900`}
      >
        <header className="border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <a href="/" className="group">
              <span className="text-lg font-semibold text-slate-900 tracking-tight">
                Care Home Ratings
              </span>
            </a>
            <nav className="flex items-center gap-5 text-sm">
              <a
                href="/about"
                className="text-slate-500 hover:text-slate-900 transition-colors"
              >
                About this data
              </a>
            </nav>
          </div>
        </header>
        <main className="min-h-[70vh]">{children}</main>
        <footer className="border-t border-slate-100 mt-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
            <div className="flex flex-col sm:flex-row justify-between gap-6 text-sm text-slate-400">
              <div className="space-y-2">
                <p>
                  All ratings data from the{" "}
                  <a
                    href="https://www.cqc.org.uk"
                    className="underline hover:text-slate-600"
                  >
                    Care Quality Commission
                  </a>{" "}
                  under the{" "}
                  <a
                    href="http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
                    className="underline hover:text-slate-600"
                  >
                    Open Government Licence
                  </a>
                  .
                </p>
                <p>
                  This site is independent and not affiliated with CQC. Always
                  verify information directly with the care provider.
                </p>
              </div>
              <div className="text-sm text-slate-400 sm:text-right">
                <p>Care Home Ratings</p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
