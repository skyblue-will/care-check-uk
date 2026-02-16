#!/usr/bin/env node
/**
 * Enrich care homes with local crime data from police.uk API.
 *
 * Strategy: Sample one location per postcode district (e.g. BD24, DA1)
 * to avoid hitting the API 14,000+ times. Homes in the same district
 * share crime data since the areas are small enough.
 *
 * Stores: total crimes in last available month, category breakdown.
 * Fields added: crime_n (total), crime_t (top category), crime_d (date)
 *
 * Source: data.police.uk (Open Government Licence)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LAYERS = resolve(__dirname, '..', '..', 'data', 'layers');
const CACHE_PATH = resolve(LAYERS, 'crime_cache.json');

const CRIME_DATE = '2025-12'; // Latest available

async function fetchCrime(lat, lng) {
  const url = `https://data.police.uk/api/crimes-street/all-crime?date=${CRIME_DATE}&lat=${lat}&lng=${lng}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        console.log('  Rate limited, waiting 2s...');
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return null;
}

function summariseCrimes(crimes) {
  if (!crimes || crimes.length === 0) return { n: 0, top: null };
  const cats = {};
  for (const c of crimes) {
    cats[c.category] = (cats[c.category] || 0) + 1;
  }
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  return {
    n: crimes.length,
    top: sorted[0][0],
  };
}

async function main() {
  const homes = JSON.parse(readFileSync(resolve(ROOT, 'public/data/care-homes.json'), 'utf8'));

  // Group homes by postcode district (outward code)
  const districts = {};
  for (const home of homes) {
    if (!home.lat || !home.lng || !home.pc) continue;
    const district = home.pc.split(' ')[0]; // e.g. "BD24"
    if (!districts[district]) {
      districts[district] = { lat: home.lat, lng: home.lng, homes: [] };
    }
    districts[district].homes.push(home);
  }

  console.log(`Postcode districts: ${Object.keys(districts).length}`);
  console.log(`Homes: ${homes.length}`);

  // Load cache
  let cache = {};
  if (existsSync(CACHE_PATH)) {
    cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
    console.log(`Cache: ${Object.keys(cache).length} districts`);
  }

  // Fetch crime data for each district
  const districtKeys = Object.keys(districts);
  let fetched = 0, errors = 0, cached = 0;

  for (let i = 0; i < districtKeys.length; i++) {
    const district = districtKeys[i];
    
    if (cache[district]) {
      cached++;
      continue;
    }

    const { lat, lng } = districts[district];
    const crimes = await fetchCrime(lat, lng);
    
    if (crimes !== null) {
      cache[district] = summariseCrimes(crimes);
      cache[district].date = CRIME_DATE;
      fetched++;
    } else {
      errors++;
    }

    if ((fetched + errors) % 50 === 0) {
      console.log(`  ${fetched + errors + cached}/${districtKeys.length} (fetched: ${fetched}, cached: ${cached}, errors: ${errors})`);
      // Save cache periodically
      writeFileSync(CACHE_PATH, JSON.stringify(cache));
    }

    // Rate limiting — police.uk allows ~15 req/sec
    await new Promise(r => setTimeout(r, 100));
  }

  // Save cache
  writeFileSync(CACHE_PATH, JSON.stringify(cache));
  console.log(`\nFetched: ${fetched}, Cached: ${cached}, Errors: ${errors}`);

  // Apply to homes
  let matched = 0;
  for (const home of homes) {
    if (!home.pc) continue;
    const district = home.pc.split(' ')[0];
    const crime = cache[district];
    if (crime) {
      home.crime_n = crime.n;
      home.crime_t = crime.top;
      home.crime_d = crime.date;
      matched++;
    }
  }

  console.log(`\nCrime data applied: ${matched}/${homes.length} homes`);

  // Stats
  const withCrime = homes.filter(h => h.crime_n != null);
  const counts = withCrime.map(h => h.crime_n).sort((a, b) => a - b);
  console.log(`  Median crimes (street-level, ${CRIME_DATE}): ${counts[Math.floor(counts.length / 2)]}`);
  console.log(`  Min: ${counts[0]}, Max: ${counts[counts.length - 1]}`);

  // Top categories
  const allCats = {};
  withCrime.forEach(h => {
    if (h.crime_t) allCats[h.crime_t] = (allCats[h.crime_t] || 0) + 1;
  });
  console.log('\nTop categories across all districts:');
  Object.entries(allCats).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .forEach(([cat, n]) => console.log(`  ${cat}: ${n} districts`));

  // Save
  writeFileSync(resolve(ROOT, 'public/data/care-homes.json'), JSON.stringify(homes));
  const mb = (Buffer.byteLength(JSON.stringify(homes)) / 1024 / 1024).toFixed(1);
  console.log(`\nSaved: ${mb} MB`);

  // Sample
  const sample = homes.find(h => h.crime_n > 0 && h.ae_4h);
  if (sample) {
    console.log(`\nSample: ${sample.n} (${sample.pc})`);
    console.log(`  Crimes nearby: ${sample.crime_n} (${sample.crime_d}), top: ${sample.crime_t}`);
  }
}

main();
