"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SearchHero({ compact }: { compact?: boolean }) {
  const searchParams = useSearchParams();
  const [postcode, setPostcode] = useState(
    searchParams.get("postcode")?.replace(/\+/g, " ") || ""
  );
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = postcode.trim();
    if (cleaned) {
      router.push(`/search?postcode=${encodeURIComponent(cleaned)}`);
    }
  };

  if (compact) {
    return (
      <form onSubmit={handleSearch} className="flex gap-3 max-w-md">
        <input
          type="text"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="Enter a postcode"
          className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
          aria-label="Postcode"
        />
        <button
          type="submit"
          className="px-5 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Search
        </button>
      </form>
    );
  }

  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight max-w-xl">
          Compare care home ratings in&nbsp;England
        </h1>
        <p className="mt-4 text-lg text-slate-500 max-w-lg">
          Search by postcode to see official CQC inspection ratings for care
          homes near you.
        </p>

        <form
          onSubmit={handleSearch}
          className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md"
        >
          <input
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="Postcode, e.g. OX1 1PT"
            className="flex-1 px-4 py-3.5 text-base rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            aria-label="Enter a postcode to search for care homes"
          />
          <button
            type="submit"
            className="px-7 py-3.5 text-base font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors cursor-pointer"
          >
            Search care homes
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-400">
          Ratings from the{" "}
          <a
            href="https://www.cqc.org.uk"
            className="underline hover:text-slate-600"
          >
            Care Quality Commission
          </a>
          . Covers all registered care homes in England.
        </p>
      </div>
    </section>
  );
}
