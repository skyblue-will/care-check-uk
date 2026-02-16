#!/usr/bin/env node
/**
 * Enrich care homes with:
 * 1. A&E waiting time performance (% seen within 4 hours) at nearest hospital
 * 2. Local authority care home fee rates (council-funded, residential + nursing)
 *
 * Sources:
 * - NHS England Monthly A&E Statistics (January 2026)
 * - DHSC MSIF fee reporting 2025-26
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LAYERS = resolve(__dirname, '..', '..', 'data', 'layers');

function main() {
  const homes = JSON.parse(readFileSync(resolve(ROOT, 'public/data/care-homes.json'), 'utf8'));

  // --- A&E Performance ---
  const aePerf = JSON.parse(readFileSync(resolve(LAYERS, 'ae_hospital_performance.json'), 'utf8'));
  let aeMatched = 0;
  for (const home of homes) {
    if (home.ae_name && aePerf[home.ae_name]) {
      home.ae_4h = aePerf[home.ae_name].pct_4h;
      aeMatched++;
    }
  }
  console.log(`A&E performance: ${aeMatched}/${homes.length} homes matched`);

  const aePcts = homes.filter(h => h.ae_4h).map(h => h.ae_4h).sort((a, b) => a - b);
  console.log(`  Median: ${aePcts[Math.floor(aePcts.length / 2)]}%`);

  // --- LA Fee Rates ---
  const laFees = JSON.parse(readFileSync(resolve(LAYERS, 'la_fees_2025.json'), 'utf8'));

  // Build a flexible lookup — try exact name match, then normalised
  const feeLookup = {};
  for (const [name, data] of Object.entries(laFees)) {
    feeLookup[name.toLowerCase()] = data;
    // Also try without common suffixes
    feeLookup[name.toLowerCase().replace(' council', '')] = data;
    feeLookup[name.toLowerCase().replace(' county council', '')] = data;
    feeLookup[name.toLowerCase().replace(' borough council', '')] = data;
    feeLookup[name.toLowerCase().replace(' city council', '')] = data;
    feeLookup[name.toLowerCase().replace(' metropolitan borough council', '')] = data;
  }

  let feeMatched = 0;
  const unmatched = new Set();
  for (const home of homes) {
    if (!home.la) continue;
    const la = home.la.toLowerCase();
    const fee = feeLookup[la] || feeLookup[la.replace(' county', '')] ||
      feeLookup[la.replace(' city', '')] || feeLookup[la.replace(', city of', '')] ||
      feeLookup[la.replace(', county of', '')];
    if (fee) {
      if (fee.res_pw) home.la_res = fee.res_pw;
      if (fee.nurs_pw) home.la_nurs = fee.nurs_pw;
      feeMatched++;
    } else {
      unmatched.add(home.la);
    }
  }
  console.log(`\nLA fees: ${feeMatched}/${homes.length} homes matched`);
  if (unmatched.size > 0 && unmatched.size <= 20) {
    console.log(`Unmatched LAs: ${[...unmatched].join(', ')}`);
  } else if (unmatched.size > 20) {
    console.log(`Unmatched LAs: ${unmatched.size} (showing first 10)`);
    [...unmatched].slice(0, 10).forEach(la => console.log(`  ${la}`));
  }

  const resFees = homes.filter(h => h.la_res).map(h => h.la_res).sort((a, b) => a - b);
  console.log(`  Homes with residential fee: ${resFees.length}`);
  console.log(`  Median: £${resFees[Math.floor(resFees.length / 2)]}/week`);

  // Save
  writeFileSync(resolve(ROOT, 'public/data/care-homes.json'), JSON.stringify(homes));
  const mb = (Buffer.byteLength(JSON.stringify(homes)) / 1024 / 1024).toFixed(1);
  console.log(`\nSaved: ${mb} MB`);

  // Sample
  const sample = homes.find(h => h.ae_4h && h.la_res && h.ae_name);
  if (sample) {
    console.log(`\nSample: ${sample.n} (${sample.pc})`);
    console.log(`  A&E: ${sample.ae_name} — ${sample.ae_miles}mi — ${sample.ae_4h}% within 4h`);
    console.log(`  LA fees: residential £${sample.la_res}/wk, nursing £${sample.la_nurs || '?'}/wk`);
  }
}

main();
