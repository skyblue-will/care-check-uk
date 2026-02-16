#!/usr/bin/env node
/**
 * Enrich care homes with local authority demographics:
 * - Population aged 65+ in the local authority
 * - % of population aged 65+
 * - Care home beds per 1,000 elderly residents
 *
 * Source: ONS Mid-Year Population Estimates 2024
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LAYERS = resolve(__dirname, '..', '..', 'data', 'layers');

function main() {
  const homes = JSON.parse(readFileSync(resolve(ROOT, 'public/data/care-homes.json'), 'utf8'));
  const demo = JSON.parse(readFileSync(resolve(LAYERS, 'la_demographics_2024.json'), 'utf8'));

  // Calculate total beds per LA from our data
  const laBeds = {};
  for (const home of homes) {
    if (!home.la || !home.beds) continue;
    laBeds[home.la] = (laBeds[home.la] || 0) + home.beds;
  }

  // Build beds-per-1000-elderly for each LA
  const laStats = {};
  for (const [la, beds] of Object.entries(laBeds)) {
    const d = demo[la];
    if (d && d.pop65 > 0) {
      laStats[la] = {
        beds_per_1k: Math.round(beds / d.pop65 * 1000 * 10) / 10,
        pct65: d.pct65,
        pop65: d.pop65,
      };
    }
  }

  // Apply to homes
  let matched = 0;
  for (const home of homes) {
    if (!home.la) continue;
    const stats = laStats[home.la];
    if (stats) {
      home.pct65 = stats.pct65;
      home.beds_1k = stats.beds_per_1k;
      matched++;
    }
  }

  console.log(`Demographics matched: ${matched}/${homes.length}`);

  // Stats
  const allBeds1k = Object.values(laStats).map(s => s.beds_per_1k).sort((a, b) => a - b);
  console.log(`\nBeds per 1,000 elderly:`);
  console.log(`  Median: ${allBeds1k[Math.floor(allBeds1k.length / 2)]}`);
  console.log(`  Range: ${allBeds1k[0]} — ${allBeds1k[allBeds1k.length - 1]}`);

  // Best and worst supplied
  const sorted = Object.entries(laStats).sort((a, b) => b[1].beds_per_1k - a[1].beds_per_1k);
  console.log('\nBest supplied (most beds per elderly):');
  sorted.slice(0, 5).forEach(([la, s]) => console.log(`  ${la}: ${s.beds_per_1k} beds/1k elderly (${s.pct65}% aged 65+)`));
  console.log('\nLeast supplied:');
  sorted.slice(-5).forEach(([la, s]) => console.log(`  ${la}: ${s.beds_per_1k} beds/1k elderly (${s.pct65}% aged 65+)`));

  // Save
  writeFileSync(resolve(ROOT, 'public/data/care-homes.json'), JSON.stringify(homes));
  const mb = (Buffer.byteLength(JSON.stringify(homes)) / 1024 / 1024).toFixed(1);
  console.log(`\nSaved: ${mb} MB`);

  const sample = homes.find(h => h.beds_1k && h.ae_4h && h.la_res);
  if (sample) {
    console.log(`\nSample: ${sample.n} (${sample.la})`);
    console.log(`  ${sample.pct65}% aged 65+, ${sample.beds_1k} beds per 1,000 elderly`);
  }
}

main();
