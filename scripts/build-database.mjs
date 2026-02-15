#!/usr/bin/env node
/**
 * Downloads all care homes from CQC API and builds a JSON database.
 * Run: node scripts/build-database.mjs
 */

const API_BASE = "https://api.service.cqc.org.uk/public/v1";
const API_KEY = process.env.CQC_API_KEY || "02dd1bb0f3a74a97a328e60791349f41";
const PER_PAGE = 500;
const CONCURRENCY = 5;
const OUTPUT = "public/data/care-homes.json";

import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Ocp-Apim-Subscription-Key": API_KEY },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchLocationDetail(locationId) {
  const d = await apiFetch(`/locations/${locationId}`);
  const ratings = d.currentRatings?.overall;
  const keyRatings = {};
  if (ratings?.keyQuestionRatings) {
    for (const kq of ratings.keyQuestionRatings) {
      keyRatings[kq.name.toLowerCase()] = kq.rating;
    }
  }
  return {
    id: d.locationId,
    name: d.name,
    postcode: d.postalCode,
    lat: d.onspdLatitude,
    lng: d.onspdLongitude,
    addr: [d.postalAddressLine1, d.postalAddressLine2]
      .filter(Boolean)
      .join(", "),
    town: d.postalAddressTownCity || "",
    region: d.region || "",
    la: d.localAuthority || "",
    beds: d.numberOfBeds || null,
    web: d.website || null,
    phone: d.mainPhoneNumber || null,
    brand: d.brandName || null,
    provider: d.providerId || "",
    providerName:
      d.regulatedActivities?.[0]?.contacts?.[0]
        ? undefined
        : undefined,
    types: (d.gacServiceTypes || []).map((t) => t.name),
    specs: (d.specialisms || []).map((s) => s.name),
    rating: ratings?.rating || null,
    safe: keyRatings.safe || null,
    effective: keyRatings.effective || null,
    caring: keyRatings.caring || null,
    responsive: keyRatings.responsive || null,
    wellLed: keyRatings["well-led"] || null,
    inspDate: d.lastInspection?.date || null,
    reportDate: ratings?.reportDate || null,
    reportId: d.reports?.[0]?.linkId || null,
    regDate: d.registrationDate || null,
  };
}

async function fetchBatch(ids) {
  const results = [];
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const details = await Promise.allSettled(
      batch.map((id) => fetchLocationDetail(id))
    );
    for (const d of details) {
      if (d.status === "fulfilled") results.push(d.value);
      else console.error("  Failed:", d.reason?.message);
    }
  }
  return results;
}

async function main() {
  console.log("Fetching care home list from CQC API...");

  // Step 1: Get all care home IDs
  const firstPage = await apiFetch(
    `/locations?careHome=Y&perPage=${PER_PAGE}&page=1`
  );
  const total = firstPage.total;
  const totalPages = firstPage.totalPages;
  console.log(`Total care homes: ${total} (${totalPages} pages)`);

  let allIds = firstPage.locations.map((l) => l.locationId);

  for (let page = 2; page <= totalPages; page++) {
    if (page % 10 === 0) console.log(`  Fetching page ${page}/${totalPages}...`);
    const data = await apiFetch(
      `/locations?careHome=Y&perPage=${PER_PAGE}&page=${page}`
    );
    allIds = allIds.concat(data.locations.map((l) => l.locationId));
  }

  console.log(`Got ${allIds.length} care home IDs. Fetching details...`);

  // Step 2: Fetch details for each (with concurrency)
  const allHomes = [];
  const batchSize = 50;
  for (let i = 0; i < allIds.length; i += batchSize) {
    const batch = allIds.slice(i, i + batchSize);
    console.log(
      `  Details ${i + 1}-${Math.min(i + batchSize, allIds.length)} / ${allIds.length}...`
    );
    const results = await fetchBatch(batch);
    allHomes.push(...results);
  }

  console.log(`\nDownloaded ${allHomes.length} care homes with details.`);

  // Step 3: Write to file
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(allHomes));

  const sizeMB = (Buffer.byteLength(JSON.stringify(allHomes)) / 1024 / 1024).toFixed(1);
  console.log(`Written to ${OUTPUT} (${sizeMB} MB)`);

  // Stats
  const withRating = allHomes.filter((h) => h.rating).length;
  const ratings = {};
  allHomes.forEach((h) => {
    if (h.rating) ratings[h.rating] = (ratings[h.rating] || 0) + 1;
  });
  console.log(`\nWith ratings: ${withRating}/${allHomes.length}`);
  console.log("Rating distribution:", ratings);
}

main().catch(console.error);
