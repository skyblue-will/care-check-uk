import RatingBadge from "./RatingBadge";
import Link from "next/link";
import { lookupPostcode, distanceMiles } from "@/lib/geo";
import { cqcFetch } from "@/lib/cqc";

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

async function fetchResults(
  postcode: string,
  radius: number
): Promise<{ results: CareHomeResult[]; postcode: string; error?: string }> {
  const location = await lookupPostcode(postcode);
  if (!location) {
    return { results: [], postcode, error: "Invalid postcode. Please check and try again." };
  }

  // Fetch care homes from CQC API by local authority + region
  const [laResults, regionResults] = await Promise.all([
    cqcFetch(
      `/locations?careHome=Y&localAuthority=${encodeURIComponent(location.admin_district)}&perPage=200&page=1`
    ).catch(() => ({ locations: [] })),
    cqcFetch(
      `/locations?careHome=Y&region=${encodeURIComponent(location.region)}&perPage=500&page=1`
    ).catch(() => ({ locations: [] })),
  ]);

  // Merge and deduplicate
  const seen = new Set<string>();
  const allLocations: { locationId: string }[] = [];
  for (const list of [laResults.locations, regionResults.locations]) {
    for (const loc of list || []) {
      if (!seen.has(loc.locationId)) {
        seen.add(loc.locationId);
        allLocations.push(loc);
      }
    }
  }

  // Fetch details (batched, max 100 to keep response time ok)
  const toFetch = allLocations.slice(0, 100);
  const details: Record<string, unknown>[] = [];
  const batchSize = 10;

  for (let i = 0; i < toFetch.length; i += batchSize) {
    const batch = toFetch.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((loc) => cqcFetch(`/locations/${loc.locationId}`))
    );
    for (const r of results) {
      if (r.status === "fulfilled") details.push(r.value as Record<string, unknown>);
    }
  }

  // Calculate distances and filter
  const results = details
    .filter((d) => d.onspdLatitude && d.onspdLongitude)
    .map((d) => {
      const dist = distanceMiles(
        location.latitude,
        location.longitude,
        d.onspdLatitude as number,
        d.onspdLongitude as number
      );
      const currentRatings = d.currentRatings as Record<string, unknown> | undefined;
      const ratings = currentRatings?.overall as Record<string, unknown> | undefined;
      const keyRatings: Record<string, string> = {};
      if (ratings?.keyQuestionRatings) {
        for (const kq of ratings.keyQuestionRatings as { name: string; rating: string }[]) {
          keyRatings[kq.name.toLowerCase()] = kq.rating;
        }
      }
      return {
        id: d.locationId as string,
        name: d.name as string,
        postcode: d.postalCode as string,
        address: [d.postalAddressLine1, d.postalAddressLine2].filter(Boolean).join(", "),
        town: (d.postalAddressTownCity as string) || "",
        localAuthority: (d.localAuthority as string) || "",
        beds: (d.numberOfBeds as number) || null,
        types: ((d.gacServiceTypes as { name: string }[]) || []).map((t) => t.name),
        specialisms: ((d.specialisms as { name: string }[]) || []).map((s) => s.name),
        rating: (ratings?.rating as string) || null,
        safe: keyRatings.safe || null,
        effective: keyRatings.effective || null,
        caring: keyRatings.caring || null,
        responsive: keyRatings.responsive || null,
        wellLed: keyRatings["well-led"] || null,
        lastInspection: (d.lastInspection as Record<string, string>)?.date || null,
        distance: Math.round(dist * 10) / 10,
      };
    })
    .filter((d) => d.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 50);

  return { results, postcode: location.postcode };
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

  if (data.results.length === 0) {
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
          {data.results.length} care home{data.results.length !== 1 ? "s" : ""} near{" "}
          {data.postcode}
        </h2>
        <span className="text-sm text-stone-500">Within {radius} miles</span>
      </div>

      <div className="space-y-4">
        {data.results.map((home) => (
          <Link
            key={home.id}
            href={`/location/${home.id}`}
            className="block bg-white rounded-xl border border-stone-200 p-5 hover:border-teal-300 hover:shadow-md transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="sm:w-24 flex-shrink-0">
                <RatingBadge rating={home.rating} />
              </div>

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
                    <span key={t} className="text-xs px-2 py-1 bg-stone-100 text-stone-600 rounded-full">
                      {t}
                    </span>
                  ))}
                  {home.beds && (
                    <span className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-full">
                      {home.beds} beds
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 mt-3 text-xs text-stone-500">
                  {home.safe && <MiniRating label="Safe" rating={home.safe} />}
                  {home.caring && <MiniRating label="Caring" rating={home.caring} />}
                  {home.effective && <MiniRating label="Effective" rating={home.effective} />}
                  {home.responsive && <MiniRating label="Responsive" rating={home.responsive} />}
                  {home.wellLed && <MiniRating label="Well-led" rating={home.wellLed} />}
                </div>
              </div>

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
        Data from the Care Quality Commission (CQC) under the Open Government Licence.
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
