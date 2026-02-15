import { Suspense } from "react";
import SearchResults from "@/components/SearchResults";
import SearchHero from "@/components/SearchHero";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ postcode?: string; radius?: string }>;
}) {
  const params = await searchParams;
  const postcode = params.postcode || "";
  const radius = params.radius || "10";

  if (!postcode) {
    return (
      <>
        <Suspense>
          <SearchHero />
        </Suspense>
        <div className="max-w-3xl mx-auto px-4 py-8 text-center text-stone-500">
          <p>Enter a postcode above to search for care homes.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <section className="bg-gradient-to-b from-teal-50 to-stone-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <Suspense>
            <SearchHero compact />
          </Suspense>
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-4 py-8">
        <Suspense
          fallback={
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-600 border-t-transparent"></div>
              <p className="mt-4 text-stone-600">
                Searching care homes near {postcode}...
              </p>
            </div>
          }
        >
          <SearchResults postcode={postcode} radius={Number(radius)} />
        </Suspense>
      </section>
    </>
  );
}
