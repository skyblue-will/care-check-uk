import { PostcodeResult } from "./types";

export async function lookupPostcode(
  postcode: string
): Promise<PostcodeResult | null> {
  const cleaned = postcode.replace(/\s+/g, "").toUpperCase();
  const res = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 200 || !data.result) return null;
  const r = data.result;
  return {
    postcode: r.postcode,
    latitude: r.latitude,
    longitude: r.longitude,
    admin_district: r.admin_district || "",
    region: r.region || "",
  };
}

/** Haversine distance in miles */
export function distanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
