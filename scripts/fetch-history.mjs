#!/usr/bin/env node

/**
 * Fetch CQC inspection history for rated care homes.
 * Computes trend signal: improving / stable / declining / new
 * 
 * Adds to care-homes.json:
 *   trend: "up" | "down" | "stable" | "new" | null
 *   prev_r: previous overall rating (if changed)
 *   inspections: total number of rated inspections
 *   first_rated: date of earliest rated inspection
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LAYERS = resolve(__dirname, '..', '..', 'data', 'layers');
const API_KEY = process.env.CQC_API_KEY || '02dd1bb0f3a74a97a328e60791349f41';
const BASE = 'https://api.service.cqc.org.uk/public/v1';

const RATING_ORDER = {
  'Inadequate': 1,
  'Requires improvement': 2,
  'Good': 3,
  'Outstanding': 4,
};

function ratingNum(r) {
  return RATING_ORDER[r] || 0;
}

async function fetchLocation(id) {
  const resp = await fetch(`${BASE}/locations/${id}`, {
    headers: { 'Ocp-Apim-Subscription-Key': API_KEY },
  });
  if (!resp.ok) throw new Error(`${resp.status}`);
  return resp.json();
}

async function main() {
  console.log('=== CQC Inspection History Fetch ===\n');

  const homesPath = resolve(ROOT, 'public/data/care-homes.json');
  const homes = JSON.parse(readFileSync(homesPath, 'utf8'));

  // Load progress cache
  const cachePath = resolve(LAYERS, 'history_cache.json');
  let cache = {};
  try {
    cache = JSON.parse(readFileSync(cachePath, 'utf8'));
    console.log(`Loaded ${Object.keys(cache).length} cached entries`);
  } catch { }

  // Only fetch for rated homes
  const validRatings = new Set(['Good', 'Outstanding', 'Requires improvement', 'Inadequate']);
  const toFetch = homes.filter(h => validRatings.has(h.r) && !cache[h.id]);
  const alreadyCached = homes.filter(h => cache[h.id]).length;

  console.log(`Total homes: ${homes.length}`);
  console.log(`Rated homes needing fetch: ${toFetch.length}`);
  console.log(`Already cached: ${alreadyCached}`);

  // Fetch in batches of 5 with 200ms delay
  const CONCURRENCY = 5;
  const DELAY = 200;
  let done = 0;
  let errors = 0;

  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(h => fetchLocation(h.id))
    );

    for (let j = 0; j < results.length; j++) {
      const home = batch[j];
      const result = results[j];

      if (result.status === 'fulfilled') {
        const data = result.value;
        const current = data.currentRatings?.overall;
        const historic = data.historicRatings || [];

        // Get all rated inspections (current + historic)
        const allRatings = [];
        if (current?.rating && RATING_ORDER[current.rating]) {
          allRatings.push({
            date: current.reportDate,
            rating: current.rating,
          });
        }
        for (const h of historic) {
          if (h.overall?.rating && RATING_ORDER[h.overall.rating]) {
            allRatings.push({
              date: h.reportDate,
              rating: h.overall.rating,
            });
          }
        }

        // Sort by date descending
        allRatings.sort((a, b) => b.date.localeCompare(a.date));

        let trend = null;
        let prev_r = null;

        if (allRatings.length <= 1) {
          trend = 'new'; // Only one inspection
        } else {
          const currentRating = allRatings[0].rating;
          const previousRating = allRatings[1].rating;
          const cn = ratingNum(currentRating);
          const pn = ratingNum(previousRating);

          if (cn > pn) {
            trend = 'up';
            prev_r = previousRating;
          } else if (cn < pn) {
            trend = 'down';
            prev_r = previousRating;
          } else {
            trend = 'stable';
          }
        }

        cache[home.id] = {
          trend,
          prev_r,
          inspections: allRatings.length,
          first_rated: allRatings.length > 0 ? allRatings[allRatings.length - 1].date : null,
        };
      } else {
        errors++;
        if (result.reason?.message === '429') {
          // Rate limited - wait longer
          await new Promise(r => setTimeout(r, 5000));
          i -= CONCURRENCY; // retry this batch
          break;
        }
      }
      done++;
    }

    // Progress
    if ((done % 100 === 0) || done === toFetch.length) {
      console.log(`  ${done}/${toFetch.length} (${errors} errors, ${Object.keys(cache).length} cached)`);
    }

    // Save cache every 500
    if (done % 500 === 0 && done > 0) {
      writeFileSync(cachePath, JSON.stringify(cache));
    }

    await new Promise(r => setTimeout(r, DELAY));
  }

  // Final cache save
  writeFileSync(cachePath, JSON.stringify(cache));
  console.log(`\nSaved cache: ${Object.keys(cache).length} entries`);

  // Apply to homes
  let upCount = 0, downCount = 0, stableCount = 0, newCount = 0;

  for (const home of homes) {
    const entry = cache[home.id];
    if (!entry) continue;

    home.trend = entry.trend;
    if (entry.prev_r) home.prev_r = entry.prev_r;
    home.insp_n = entry.inspections;
    if (entry.first_rated) home.first_r = entry.first_rated;

    if (entry.trend === 'up') upCount++;
    else if (entry.trend === 'down') downCount++;
    else if (entry.trend === 'stable') stableCount++;
    else if (entry.trend === 'new') newCount++;
  }

  console.log('\n=== Trend Distribution ===');
  console.log(`  Improving:  ${upCount}`);
  console.log(`  Declining:  ${downCount}`);
  console.log(`  Stable:     ${stableCount}`);
  console.log(`  New (1 insp): ${newCount}`);

  // Save
  writeFileSync(homesPath, JSON.stringify(homes));
  const sizeMB = (Buffer.byteLength(JSON.stringify(homes)) / 1024 / 1024).toFixed(1);
  console.log(`\nSaved care-homes.json (${sizeMB} MB)`);

  // Sample
  const sample = homes.find(h => h.trend === 'up');
  if (sample) {
    console.log('\nSample (improving):');
    console.log(`  ${sample.n}: ${sample.prev_r} → ${sample.r} (${sample.insp_n} inspections)`);
  }
  const sampleDown = homes.find(h => h.trend === 'down');
  if (sampleDown) {
    console.log('Sample (declining):');
    console.log(`  ${sampleDown.n}: ${sampleDown.prev_r} → ${sampleDown.r} (${sampleDown.insp_n} inspections)`);
  }
}

main().catch(console.error);
