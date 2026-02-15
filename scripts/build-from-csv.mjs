#!/usr/bin/env node
/**
 * Builds care home database from CQC CSV + API for ratings/lat/lng.
 * Resumes from progress file if interrupted.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { parse } from "csv-parse/sync";

const API_BASE = "https://api.service.cqc.org.uk/public/v1";
const API_KEY = process.env.CQC_API_KEY || "02dd1bb0f3a74a97a328e60791349f41";
const CSV_PATH = "/home/clawdbot/.clawdbot/agents/care-checker/data/cqc-directory.csv";
const OUTPUT = "public/data/care-homes.json";
const PROGRESS_PATH = "public/data/progress.json";
const CONCURRENCY = 5;
const BATCH_DELAY_MS = 1000; // 1s between batches to avoid rate limits

async function apiFetch(path) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Ocp-Apim-Subscription-Key": API_KEY },
      });
      if (res.status === 429) {
        console.log("  Rate limited, waiting 5s...");
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      if (!res.ok) return null;
      return res.json();
    } catch (e) {
      console.log(`  Fetch error (attempt ${attempt + 1}): ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return null;
}

function parseDetail(d) {
  if (!d) return null;
  const ratings = d.currentRatings?.overall;
  const kr = {};
  if (ratings?.keyQuestionRatings) {
    for (const kq of ratings.keyQuestionRatings) {
      kr[kq.name.toLowerCase()] = kq.rating;
    }
  }
  return {
    id: d.locationId,
    n: d.name,
    pc: d.postalCode,
    lat: d.onspdLatitude || null,
    lng: d.onspdLongitude || null,
    addr: [d.postalAddressLine1, d.postalAddressLine2].filter(Boolean).join(", "),
    town: d.postalAddressTownCity || "",
    rgn: d.region || "",
    la: d.localAuthority || "",
    beds: d.numberOfBeds || null,
    ty: (d.gacServiceTypes || []).map((t) => t.name),
    sp: (d.specialisms || []).map((s) => s.name),
    r: ratings?.rating || null,
    rs: kr.safe || null,
    re: kr.effective || null,
    rc: kr.caring || null,
    rr: kr.responsive || null,
    rw: kr["well-led"] || null,
    ins: d.lastInspection?.date || null,
  };
}

async function main() {
  // Parse CSV — skip first 4 lines (metadata), line 5 is header
  console.log("Parsing CSV...");
  const raw = readFileSync(CSV_PATH, "utf-8");
  const lines = raw.split("\n");
  const csvData = lines.slice(4).join("\n"); // line 5 onwards (header + data)
  const rows = parse(csvData, { columns: true, skip_empty_lines: true, relax_column_count: true });

  console.log(`Total rows: ${rows.length}`);

  // Filter care homes
  const careHomes = rows.filter((r) => {
    const types = r["Service types"] || "";
    return types.includes("Residential homes") || types.includes("Nursing homes");
  });

  const locationIds = careHomes
    .map((r) => (r["CQC Location ID (for office use only)"] || "").trim())
    .filter(Boolean);

  console.log(`Care homes: ${careHomes.length}, IDs: ${locationIds.length}`);

  // Load progress
  let results = [];
  const fetched = new Set();
  if (existsSync(PROGRESS_PATH)) {
    results = JSON.parse(readFileSync(PROGRESS_PATH, "utf-8"));
    results.forEach((r) => fetched.add(r.id));
    console.log(`Resuming from ${results.length} already fetched`);
  }

  const remaining = locationIds.filter((id) => !fetched.has(id));
  console.log(`${remaining.length} remaining to fetch\n`);

  // Fetch in batches
  let errors = 0;
  for (let i = 0; i < remaining.length; i += CONCURRENCY) {
    const batch = remaining.slice(i, i + CONCURRENCY);
    const details = await Promise.allSettled(
      batch.map((id) => apiFetch(`/locations/${id}`))
    );
    for (const d of details) {
      if (d.status === "fulfilled" && d.value) {
        const p = parseDetail(d.value);
        if (p) { results.push(p); fetched.add(p.id); }
      } else {
        errors++;
      }
    }

    const done = Math.min(i + CONCURRENCY, remaining.length);
    if (done % 100 < CONCURRENCY || done === remaining.length) {
      const pct = ((done / remaining.length) * 100).toFixed(1);
      console.log(`${done}/${remaining.length} (${pct}%) — ${results.length} ok, ${errors} err`);
    }

    // Throttle
    await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));

    // Save progress every 100
    if (done % 100 < CONCURRENCY) {
      mkdirSync("public/data", { recursive: true });
      writeFileSync(PROGRESS_PATH, JSON.stringify(results));
    }
  }

  // Write final
  mkdirSync("public/data", { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(results));
  if (existsSync(PROGRESS_PATH)) unlinkSync(PROGRESS_PATH);

  const mb = (Buffer.byteLength(JSON.stringify(results)) / 1024 / 1024).toFixed(1);
  console.log(`\nDone! ${results.length} care homes → ${OUTPUT} (${mb} MB)`);

  const dist = {};
  results.forEach((h) => { if (h.r) dist[h.r] = (dist[h.r] || 0) + 1; });
  console.log("Ratings:", dist);
}

main().catch(console.error);
