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
    return {
      results: [],
      postcode,
      error: "We couldn\u2019t find that postcode. Please check it and try again.",
    };
  }

  const [laResults, regionResults] = await Promise.all([
    cqcFetch(
      `/locations?careHome=Y&localAuthority=${encodeURIComponent(location.admin_district)}&perPage=200&page=1`
    ).catch(() => ({ locations: [] })),
    cqcFetch(
      `/locations?careHome=Y&region=${encodeURIComponent(location.region)}&perPage=500&page=1`
    ).catch(() => ({ locations: [] })),
  ]);

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

  const toFetch = allLocations.slice(0, 100);
  const details: Record<string, unknown>[] = [];
  const batchSize = 10;

  for (let i = 0; i < toFetch.length; i += batchSize) {
    const batch = toFetch.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((loc) => cqcFetch(`/locations/${loc.locationId}`))
    );
    for (const r of results) {
      if (r.status === "fulfilled")
        details.push(r.value as Record<string, unknown>);
    }
  }

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
        for (const kq of ratings.keyQuestionRatings as {
          name: string;
          rating: string;
        }[]) {
          keyRatings[kq.name.toLowerCase()] = kq.rating;
        }
      }
      return {
        id: d.locationId as string,
        name: d.name as string,
        postcode: d.postalCode as string,
        address: [d.postalAddressLine1, d.postalAddressLine2]
          .filter(Boolean)
          .join(", "),
        town: (d.postalAddressTownCity as string) || "",
        localAuthority: (d.localAuthority as string) || "",
        beds: (d.numberOfBeds as number) || null,
        types: ((d.gacServiceTypes as { name: string }[]) || []).map(
          (t) => t.name
        ),
        specialisms: ((d.specialisms as { name: string }[]) || []).map(
          (s) => s.name
        ),
        rating: (ratings?.rating as string) || null,
        safe: keyRatings.safe || null,
        effective: keyRatings.effective || null,
        caring: keyRatings.caring || null,
        responsive: keyRatings.responsive || null,
        wellLed: keyRatings["well-led"] || null,
        lastInspection:
          (d.lastInspection as Record<string, string>)?.date || null,
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
      <div className="py-12">
        <p className="text-slate-700">{data.error}</p>
      </div>
    );
  }

  if (data.results.length === 0) {
    return (
      <div className="py-12">
        <p className="text-slate-700">
          No care homes found within {radius} miles of {data.postcode}.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Try a wider search radius or a different postcode.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Care homes near {data.postcode}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {data.results.length} care home{data.results.length !== 1 ? "s" : ""}{" "}
          within {radius} miles · Sorted by distance
        </p>
      </div>

      <div className="space-y-3">
        {data.results.map((home) => (
          <Link
            key={home.id}
            href={`/location/${home.id}`}
            className="block bg-white rounded-lg border border-slate-200 px-5 py-4 hover:border-slate-300 hover:bg-slate-50/50 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-slate-900">
                      {home.name}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {home.address}
                      {home.town ? `, ${home.town}` : ""} · {home.postcode}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-sm text-slate-500">
                      {home.distance} miles
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <RatingBadge rating={home.rating} size="sm" />
                  {home.types.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded"
                    >
                      {t === "Residential homes"
                        ? "Residential"
                        : t === "Nursing homes"
                          ? "Nursing"
                          : t}
                    </span>
                  ))}
                  {home.beds && (
                    <span className="text-xs text-slate-400">
                      {home.beds} beds
                    </span>
                  )}
                </div>

                {/* Ratings row */}
                {(home.safe || home.caring || home.effective || home.responsive || home.wellLed) && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {home.safe && <QualityArea label="Safe" rating={home.safe} />}
                    {home.effective && <QualityArea label="Effective" rating={home.effective} />}
                    {home.caring && <QualityArea label="Caring" rating={home.caring} />}
                    {home.responsive && <QualityArea label="Responsive" rating={home.responsive} />}
                    {home.wellLed && <QualityArea label="Well-led" rating={home.wellLed} />}
                  </div>
                )}

                {home.lastInspection && (
                  <p className="mt-2 text-xs text-slate-400">
                    Last inspected{" "}
                    {new Date(home.lastInspection).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p className="text-xs text-slate-400 mt-10">
        Ratings data from the Care Quality Commission under the Open Government
        Licence. Last updated daily.
      </p>
    </div>
  );
}

function QualityArea({ label, rating }: { label: string; rating: string }) {
  const color =
    rating === "Outstanding"
      ? "text-emerald-700"
      : rating === "Good"
        ? "text-sky-700"
        : rating === "Requires improvement"
          ? "text-amber-700"
          : rating === "Inadequate"
            ? "text-red-700"
            : "text-slate-400";
  return (
    <span>
      {label}{" "}
      <span className={`font-medium ${color}`}>
        {rating === "Requires improvement" ? "RI" : rating}
      </span>
    </span>
  );
}
