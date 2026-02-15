import RatingBadge from "./RatingBadge";
import Link from "next/link";

interface CareHomeResult {
  id: string;
  name: string;
  postcode: string;
  address: string;
  town: string;
  localAuthority: string;
  beds: number | null;
  types: string[];
  specialisms: string[];
  rating: string | null;
  safe: string | null;
  effective: string | null;
  caring: string | null;
  responsive: string | null;
  wellLed: string | null;
  lastInspection: string | null;
  distance: number;
}

interface SearchResponse {
  postcode: string;
  total: number;
  results: CareHomeResult[];
  error?: string;
}

async function fetchResults(
  postcode: string,
  radius: number
): Promise<SearchResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const res = await fetch(
    `${baseUrl}/api/search?postcode=${encodeURIComponent(postcode)}&radius=${radius}`,
    { cache: "no-store" }
  );
  return res.json();
}

export default async function SearchResults({
  postcode,
  radius,
}: {
  postcode: string;
  radius: number;
}) {
  const data = await fetchResults(postcode, radius);

  if (data.error) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-red-600">⚠️ {data.error}</p>
        <p className="mt-2 text-stone-500">
          Please check the postcode and try again.
        </p>
      </div>
    );
  }

  if (data.total === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-stone-700">
          No care homes found within {radius} miles of {data.postcode}.
        </p>
        <p className="mt-2 text-stone-500">
          Try increasing the search radius or check a different postcode.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-stone-900">
          {data.total} care home{data.total !== 1 ? "s" : ""} near{" "}
          {data.postcode}
        </h2>
        <span className="text-sm text-stone-500">
          Within {radius} miles
        </span>
      </div>

      <div className="space-y-4">
        {data.results.map((home) => (
          <Link
            key={home.id}
            href={`/location/${home.id}`}
            className="block bg-white rounded-xl border border-stone-200 p-5 hover:border-teal-300 hover:shadow-md transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Rating badge */}
              <div className="sm:w-24 flex-shrink-0">
                <RatingBadge rating={home.rating} />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-stone-900">
                  {home.name}
                </h3>
                <p className="text-sm text-stone-500 mt-1">
                  {home.address}
                  {home.town ? `, ${home.town}` : ""} · {home.postcode}
                </p>

                <div className="flex flex-wrap gap-2 mt-3">
                  {home.types.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-1 bg-stone-100 text-stone-600 rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                  {home.beds && (
                    <span className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-full">
                      {home.beds} beds
                    </span>
                  )}
                </div>

                {/* Mini ratings */}
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-stone-500">
                  {home.safe && <MiniRating label="Safe" rating={home.safe} />}
                  {home.caring && <MiniRating label="Caring" rating={home.caring} />}
                  {home.effective && <MiniRating label="Effective" rating={home.effective} />}
                  {home.responsive && <MiniRating label="Responsive" rating={home.responsive} />}
                  {home.wellLed && <MiniRating label="Well-led" rating={home.wellLed} />}
                </div>
              </div>

              {/* Distance */}
              <div className="sm:text-right flex-shrink-0">
                <span className="text-sm font-medium text-teal-700">
                  {home.distance} mi
                </span>
                {home.lastInspection && (
                  <p className="text-xs text-stone-400 mt-1">
                    Inspected{" "}
                    {new Date(home.lastInspection).toLocaleDateString("en-GB", {
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p className="text-xs text-stone-400 text-center mt-8">
        Data from the Care Quality Commission (CQC) under the Open Government
        Licence.
      </p>
    </div>
  );
}

function MiniRating({ label, rating }: { label: string; rating: string }) {
  const color =
    rating === "Outstanding"
      ? "text-blue-700"
      : rating === "Good"
        ? "text-green-700"
        : rating === "Requires improvement"
          ? "text-amber-700"
          : rating === "Inadequate"
            ? "text-red-700"
            : "text-stone-500";
  return (
    <span>
      {label}: <span className={`font-medium ${color}`}>{rating}</span>
    </span>
  );
}
