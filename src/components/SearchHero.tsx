"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchHero() {
  const [postcode, setPostcode] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = postcode.trim().replace(/\s+/g, "+");
    if (cleaned) {
      router.push(`/search?postcode=${encodeURIComponent(cleaned)}`);
    }
  };

  return (
    <section className="bg-gradient-to-b from-teal-50 to-stone-50 py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold text-stone-900 leading-tight">
          Find the best-rated care homes{" "}
          <span className="text-teal-700">near you</span>
        </h1>
        <p className="mt-4 text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto">
          Search official CQC ratings for every care home in England. Compare
          ratings, read inspection results, and make informed decisions.
        </p>

        <form onSubmit={handleSearch} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
          <input
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="Enter a postcode, e.g. SW1A 1AA"
            className="flex-1 px-5 py-4 text-lg rounded-xl border border-stone-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            aria-label="Postcode"
          />
          <button
            type="submit"
            className="px-8 py-4 text-lg font-semibold text-white bg-teal-600 rounded-xl shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <p className="mt-3 text-sm text-stone-500">
          Free to use · Official CQC data · Updated daily
        </p>
      </div>
    </section>
  );
}
