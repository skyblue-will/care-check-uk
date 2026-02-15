import { NextRequest, NextResponse } from "next/server";
import { lookupPostcode, distanceMiles } from "@/lib/geo";
import { cqcFetch } from "@/lib/cqc";

export const dynamic = "force-dynamic";

interface LocationSummary {
  locationId: string;
  locationName: string;
  postalCode: string;
}

interface LocationDetail {
  locationId: string;
  name: string;
  postalCode: string;
  onspdLatitude: number;
  onspdLongitude: number;
  postalAddressLine1?: string;
  postalAddressLine2?: string;
  postalAddressTownCity?: string;
  region?: string;
  localAuthority?: string;
  numberOfBeds?: number;
  website?: string;
  brandName?: string;
  gacServiceTypes?: { name: string }[];
  specialisms?: { name: string }[];
  currentRatings?: {
    overall?: {
      rating?: string;
      reportDate?: string;
      keyQuestionRatings?: { name: string; rating: string }[];
    };
  };
  lastInspection?: { date?: string };
}

export async function GET(req: NextRequest) {
  const postcode = req.nextUrl.searchParams.get("postcode");
  const radius = parseFloat(req.nextUrl.searchParams.get("radius") || "10");

  if (!postcode) {
    return NextResponse.json({ error: "Postcode required" }, { status: 400 });
  }

  // 1. Geocode the postcode
  const location = await lookupPostcode(postcode);
  if (!location) {
    return NextResponse.json({ error: "Invalid postcode" }, { status: 400 });
  }

  // 2. Get care homes in the local authority area
  const laResults = await cqcFetch(
    `/locations?careHome=Y&localAuthority=${encodeURIComponent(location.admin_district)}&perPage=200&page=1`
  );

  // Also fetch neighbouring areas by using region
  const regionResults = await cqcFetch(
    `/locations?careHome=Y&region=${encodeURIComponent(location.region)}&perPage=500&page=1`
  );

  // Merge and deduplicate
  const allLocations: LocationSummary[] = [];
  const seen = new Set<string>();
  for (const list of [laResults.locations, regionResults.locations]) {
    for (const loc of list || []) {
      if (!seen.has(loc.locationId)) {
        seen.add(loc.locationId);
        allLocations.push(loc);
      }
    }
  }

  // 3. Fetch details for all (concurrency-limited)
  const details: LocationDetail[] = [];
  const batchSize = 10;
  // Limit to first 200 to keep response time reasonable
  const toFetch = allLocations.slice(0, 200);

  for (let i = 0; i < toFetch.length; i += batchSize) {
    const batch = toFetch.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((loc) => cqcFetch(`/locations/${loc.locationId}`))
    );
    for (const r of results) {
      if (r.status === "fulfilled") details.push(r.value);
    }
  }

  // 4. Calculate distances and filter by radius
  const results = details
    .filter((d) => d.onspdLatitude && d.onspdLongitude)
    .map((d) => {
      const dist = distanceMiles(
        location.latitude,
        location.longitude,
        d.onspdLatitude,
        d.onspdLongitude
      );
      const ratings = d.currentRatings?.overall;
      const keyRatings: Record<string, string> = {};
      if (ratings?.keyQuestionRatings) {
        for (const kq of ratings.keyQuestionRatings) {
          keyRatings[kq.name.toLowerCase()] = kq.rating;
        }
      }
      return {
        id: d.locationId,
        name: d.name,
        postcode: d.postalCode,
        address: [d.postalAddressLine1, d.postalAddressLine2]
          .filter(Boolean)
          .join(", "),
        town: d.postalAddressTownCity || "",
        region: d.region || "",
        localAuthority: d.localAuthority || "",
        beds: d.numberOfBeds || null,
        types: (d.gacServiceTypes || []).map((t) => t.name),
        specialisms: (d.specialisms || []).map((s) => s.name),
        rating: ratings?.rating || null,
        safe: keyRatings.safe || null,
        effective: keyRatings.effective || null,
        caring: keyRatings.caring || null,
        responsive: keyRatings.responsive || null,
        wellLed: keyRatings["well-led"] || null,
        lastInspection: d.lastInspection?.date || null,
        reportDate: ratings?.reportDate || null,
        distance: Math.round(dist * 10) / 10,
      };
    })
    .filter((d) => d.distance <= radius)
    .sort((a, b) => a.distance - b.distance);

  return NextResponse.json({
    postcode: location.postcode,
    latitude: location.latitude,
    longitude: location.longitude,
    radius,
    total: results.length,
    results,
  });
}
