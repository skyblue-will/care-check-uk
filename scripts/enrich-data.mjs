#!/usr/bin/env node

/**
 * Enrich care home database with layered datasets:
 * 1. Nearest A&E hospital (name + distance in miles)
 * 2. IMD 2019 data (deprivation score, decile, older people income deprivation)
 * 
 * Reads: public/data/care-homes.json
 * Reads: ../../data/layers/hospitals_england.json
 * Reads: ../../data/layers/imd_lookup.json
 * Uses: postcodes.io API for postcode → LSOA mapping
 * Writes: public/data/care-homes.json (enriched)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LAYERS = resolve(__dirname, '..', '..', 'data', 'layers');

// Haversine distance in miles
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// IMD decile from score
function imdDecile(score) {
  const boundaries = [5.9, 8.6, 11.3, 14.2, 17.6, 21.6, 26.6, 33.2, 43.9, 100];
  for (let i = 0; i < boundaries.length; i++) {
    if (score <= boundaries[i]) return i + 1;
  }
  return 10;
}

// Human-readable deprivation label
function imdLabel(decile) {
  if (decile <= 2) return 'Least deprived';
  if (decile <= 4) return 'Below average deprivation';
  if (decile <= 6) return 'Average';
  if (decile <= 8) return 'Above average deprivation';
  return 'Most deprived';
}

async function bulkPostcodeLookup(postcodes) {
  // postcodes.io allows max 100 per request
  const results = {};
  const batches = [];
  for (let i = 0; i < postcodes.length; i += 100) {
    batches.push(postcodes.slice(i, i + 100));
  }
  
  console.log(`Looking up ${postcodes.length} postcodes in ${batches.length} batches...`);
  
  for (let i = 0; i < batches.length; i++) {
    if (i > 0 && i % 10 === 0) {
      console.log(`  Batch ${i}/${batches.length} (${Object.keys(results).length} resolved)`);
    }
    
    try {
      const resp = await fetch('https://api.postcodes.io/postcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcodes: batches[i] }),
      });
      
      if (!resp.ok) {
        console.error(`  Batch ${i} failed: ${resp.status}`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      
      const data = await resp.json();
      for (const item of data.result) {
        if (item.result && item.result.codes) {
          results[item.query] = {
            lsoa: item.result.codes.lsoa,
            lsoa11: item.result.codes.lsoa11,
          };
        }
      }
    } catch (err) {
      console.error(`  Batch ${i} error:`, err.message);
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // Small delay to be polite
    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  
  console.log(`  Resolved ${Object.keys(results).length}/${postcodes.length} postcodes`);
  return results;
}

async function main() {
  console.log('=== Care Home Data Enrichment ===\n');
  
  // Load data
  const homes = JSON.parse(readFileSync(resolve(ROOT, 'public/data/care-homes.json'), 'utf8'));
  const hospitals = JSON.parse(readFileSync(resolve(LAYERS, 'hospitals_england.json'), 'utf8'));
  const imd = JSON.parse(readFileSync(resolve(LAYERS, 'imd_lookup.json'), 'utf8'));
  
  console.log(`Care homes: ${homes.length}`);
  console.log(`A&E hospitals: ${hospitals.length}`);
  console.log(`IMD LSOAs: ${Object.keys(imd).length}`);
  
  // Step 1: Find nearest A&E for each care home
  console.log('\n--- Step 1: Nearest A&E Hospital ---');
  let aeCount = 0;
  for (const home of homes) {
    if (!home.lat || !home.lng) continue;
    
    let minDist = Infinity;
    let nearest = null;
    
    for (const h of hospitals) {
      const d = haversine(home.lat, home.lng, h.lat, h.lng);
      if (d < minDist) {
        minDist = d;
        nearest = h;
      }
    }
    
    if (nearest) {
      home.ae_name = nearest.name;
      home.ae_miles = Math.round(minDist * 10) / 10;
      aeCount++;
    }
  }
  console.log(`  Matched ${aeCount} homes to nearest A&E`);
  
  // Stats
  const distances = homes.filter(h => h.ae_miles).map(h => h.ae_miles).sort((a, b) => a - b);
  console.log(`  Median distance: ${distances[Math.floor(distances.length / 2)]} miles`);
  console.log(`  Max distance: ${distances[distances.length - 1]} miles`);
  console.log(`  Under 5 miles: ${distances.filter(d => d <= 5).length}`);
  console.log(`  Under 10 miles: ${distances.filter(d => d <= 10).length}`);
  console.log(`  Over 20 miles: ${distances.filter(d => d > 20).length}`);
  
  // Step 2: LSOA lookup via postcodes.io
  console.log('\n--- Step 2: Postcode → LSOA Lookup ---');
  
  // Check if we have a cached lookup
  const cacheFile = resolve(LAYERS, 'postcode_lsoa_cache.json');
  let pcLookup = {};
  try {
    pcLookup = JSON.parse(readFileSync(cacheFile, 'utf8'));
    console.log(`  Loaded ${Object.keys(pcLookup).length} cached lookups`);
  } catch { }
  
  // Find postcodes we still need
  const allPostcodes = [...new Set(homes.map(h => h.pc).filter(Boolean))];
  const needed = allPostcodes.filter(pc => !pcLookup[pc]);
  console.log(`  Unique postcodes: ${allPostcodes.length}, need to lookup: ${needed.length}`);
  
  if (needed.length > 0) {
    const newResults = await bulkPostcodeLookup(needed);
    Object.assign(pcLookup, newResults);
    
    // Cache results
    writeFileSync(cacheFile, JSON.stringify(pcLookup));
    console.log(`  Cached ${Object.keys(pcLookup).length} total lookups`);
  }
  
  // Step 3: Apply IMD data
  console.log('\n--- Step 3: IMD Enrichment ---');
  let imdMatched = 0;
  let imdMissed = 0;
  
  for (const home of homes) {
    const pc = home.pc;
    if (!pc || !pcLookup[pc]) {
      imdMissed++;
      continue;
    }
    
    // Try current LSOA code first, then 2011
    const lsoaCode = pcLookup[pc].lsoa || pcLookup[pc].lsoa11;
    if (!lsoaCode || !imd[lsoaCode]) {
      // Try lsoa11
      const lsoa11 = pcLookup[pc].lsoa11;
      if (lsoa11 && imd[lsoa11]) {
        const data = imd[lsoa11];
        home.imd = Math.round(data.imd_score * 10) / 10;
        home.imd_d = imdDecile(data.imd_score);
        home.idaopi = Math.round(data.idaopi * 1000) / 10; // percentage
        imdMatched++;
      } else {
        imdMissed++;
      }
      continue;
    }
    
    const data = imd[lsoaCode];
    home.imd = Math.round(data.imd_score * 10) / 10;
    home.imd_d = imdDecile(data.imd_score);
    home.idaopi = Math.round(data.idaopi * 1000) / 10; // as percentage
    imdMatched++;
  }
  
  console.log(`  IMD matched: ${imdMatched}, missed: ${imdMissed}`);
  
  // IMD distribution across care homes
  const deciles = {};
  homes.filter(h => h.imd_d).forEach(h => {
    deciles[h.imd_d] = (deciles[h.imd_d] || 0) + 1;
  });
  console.log('  IMD decile distribution of care homes:');
  for (let d = 1; d <= 10; d++) {
    const count = deciles[d] || 0;
    const bar = '█'.repeat(Math.round(count / 50));
    const label = imdLabel(d);
    console.log(`    D${d} (${label}): ${count} ${bar}`);
  }
  
  // Save enriched data
  console.log('\n--- Saving ---');
  const outPath = resolve(ROOT, 'public/data/care-homes.json');
  writeFileSync(outPath, JSON.stringify(homes));
  
  const sizeMB = (Buffer.byteLength(JSON.stringify(homes)) / 1024 / 1024).toFixed(1);
  console.log(`  Saved to ${outPath} (${sizeMB} MB)`);
  
  // Summary of new fields
  console.log('\n=== New fields added ===');
  console.log('  ae_name  - Name of nearest A&E hospital');
  console.log('  ae_miles - Distance to nearest A&E in miles');
  console.log('  imd      - IMD 2019 score (0-100, higher = more deprived)');
  console.log('  imd_d    - IMD decile (1=least deprived, 10=most deprived)');
  console.log('  idaopi   - Income deprivation affecting older people (%)');
  console.log('\nSample enriched entry:');
  const sample = homes.find(h => h.imd && h.ae_miles);
  if (sample) {
    console.log(JSON.stringify(sample, null, 2));
  }
}

main().catch(console.error);
