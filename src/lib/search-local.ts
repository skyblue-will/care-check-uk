import { readFileSync, existsSync } from "fs";
import path from "path";
import { distanceMiles } from "./geo";

interface CareHomeEntry {
  id: string;
  n: string;       // name
  pc: string;      // postcode
  lat: number | null;
  lng: number | null;
  addr: string;
  town: string;
  rgn: string;     // region
  la: string;      // local authority
  beds: number | null;
  ty: string[];    // types
  sp: string[];    // specialisms
  r: string | null; // overall rating
  rs: string | null; // safe
  re: string | null; // effective
  rc: string | null; // caring
  rr: string | null; // responsive
  rw: string | null; // well-led
  ins: string | null; // last inspection date
}

let cachedData: CareHomeEntry[] | null = null;

function loadData(): CareHomeEntry[] {
  if (cachedData) return cachedData;
  const filePath = path.join(process.cwd(), "public/data/care-homes.json");
  if (!existsSync(filePath)) return [];
  const raw = readFileSync(filePath, "utf-8");
  cachedData = JSON.parse(raw);
  return cachedData!;
}

export function searchLocal(
  lat: number,
  lng: number,
  radiusMiles: number,
  limit = 50
) {
  const data = loadData();
  if (data.length === 0) return null; // Fall back to API

  const results = data
    .filter((h) => h.lat && h.lng)
    .map((h) => ({
      id: h.id,
      name: h.n,
      postcode: h.pc,
      address: h.addr,
      town: h.town,
      region: h.rgn,
      localAuthority: h.la,
      beds: h.beds,
      types: h.ty,
      specialisms: h.sp,
      rating: h.r,
      safe: h.rs,
      effective: h.re,
      caring: h.rc,
      responsive: h.rr,
      wellLed: h.rw,
      lastInspection: h.ins,
      reportDate: null,
      distance: Math.round(distanceMiles(lat, lng, h.lat!, h.lng!) * 10) / 10,
    }))
    .filter((h) => h.distance <= radiusMiles)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  return results;
}
