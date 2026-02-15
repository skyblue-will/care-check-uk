import { NextRequest, NextResponse } from "next/server";
import { lookupPostcode, distanceMiles } from "@/lib/geo";
import { cqcFetch } from "@/lib/cqc";
import { searchLocal } from "@/lib/search-local";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const postcode = req.nextUrl.searchParams.get("postcode");
  const radius = parseFloat(req.nextUrl.searchParams.get("radius") || "10");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

  if (!postcode) {
    return NextResponse.json({ error: "Postcode required" }, { status: 400 });
  }

  // 1. Geocode the postcode
  const location = await lookupPostcode(postcode);
  if (!location) {
    return NextResponse.json({ error: "Invalid postcode" }, { status: 400 });
  }

  // 2. Try local database first (instant)
  const localResults = searchLocal(
    location.latitude,
    location.longitude,
    radius,
    limit
  );

  if (localResults && localResults.length > 0) {
    return NextResponse.json({
      postcode: location.postcode,
      latitude: location.latitude,
      longitude: location.longitude,
      radius,
      total: localResults.length,
      source: "local",
      results: localResults,
    });
  }

  // 3. Fall back to CQC API (slower)
  const laResults = await cqcFetch(
    `/locations?careHome=Y&localAuthority=${encodeURIComponent(location.admin_district)}&perPage=200&page=1`
  );

  const regionResults = await cqcFetch(
    `/locations?careHome=Y&region=${encodeURIComponent(location.region)}&perPage=500&page=1`
  );

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

  // Fetch details (batched)
  const details: Record<string, unknown>[] = [];
  const batchSize = 10;
  const toFetch = allLocations.slice(0, 200);

  for (let i = 0; i < toFetch.length; i += batchSize) {
    const batch = toFetch.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((loc) => cqcFetch(`/locations/${loc.locationId}`))
    );
    for (const r of results) {
      if (r.status === "fulfilled") details.push(r.value as Record<string, unknown>);
    }
  }

  // Calculate distances
  const results = details
    .filter((d: Record<string, unknown>) => d.onspdLatitude && d.onspdLongitude)
    .map((d: Record<string, unknown>) => {
      const dist = distanceMiles(
        location.latitude,
        location.longitude,
        d.onspdLatitude as number,
        d.onspdLongitude as number
      );
      const ratings = (d.currentRatings as Record<string, unknown>)?.overall as Record<string, unknown> | undefined;
      const keyRatings: Record<string, string> = {};
      if (ratings?.keyQuestionRatings) {
        for (const kq of ratings.keyQuestionRatings as { name: string; rating: string }[]) {
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
        town: (d.postalAddressTownCity as string) || "",
        region: (d.region as string) || "",
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
        reportDate: (ratings?.reportDate as string) || null,
        distance: Math.round(dist * 10) / 10,
      };
    })
    .filter((d) => d.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  return NextResponse.json({
    postcode: location.postcode,
    latitude: location.latitude,
    longitude: location.longitude,
    radius,
    total: results.length,
    source: "api",
    results,
  });
}
