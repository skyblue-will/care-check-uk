#!/usr/bin/env node
/**
 * Deduplicate care homes database:
 * 1. Remove duplicate registrations (same name + postcode + beds)
 *    — keep the entry with a rating, or the newer CQC ID
 * 2. Normalize edge-case ratings to null for consistency
 * 3. Report stats
 */

import { readFileSync, writeFileSync } from 'fs';

const DB = 'public/data/care-homes.json';
const data = JSON.parse(readFileSync(DB, 'utf8'));
console.log(`Loaded: ${data.length} homes`);

// 1. Deduplicate by name+postcode+beds
const groups = {};
data.forEach(h => {
  const k = `${(h.n || '').toLowerCase()}|${(h.pc || '').toLowerCase()}|${h.beds || 0}`;
  if (!groups[k]) groups[k] = [];
  groups[k].push(h);
});

const deduped = [];
let removed = 0;
for (const group of Object.values(groups)) {
  if (group.length === 1) {
    deduped.push(group[0]);
    continue;
  }
  // Keep the one with a real rating, or newer ID
  group.sort((a, b) => {
    const aRated = a.r && !['No published rating', 'Inspected but not rated', 'Insufficient evidence to rate'].includes(a.r);
    const bRated = b.r && !['No published rating', 'Inspected but not rated', 'Insufficient evidence to rate'].includes(b.r);
    if (aRated && !bRated) return -1;
    if (!aRated && bRated) return 1;
    // Prefer newer inspection date
    if (a.ins && b.ins) return b.ins.localeCompare(a.ins);
    if (a.ins) return -1;
    if (b.ins) return 1;
    return b.id.localeCompare(a.id);
  });
  deduped.push(group[0]);
  removed += group.length - 1;
}

console.log(`Removed ${removed} duplicates`);

// 2. Normalize edge-case ratings
let normalized = 0;
const edgeCaseRatings = ['No published rating', 'Inspected but not rated', 'Insufficient evidence to rate'];
for (const h of deduped) {
  if (edgeCaseRatings.includes(h.r)) {
    h.r = null;
    normalized++;
  }
}
console.log(`Normalized ${normalized} edge-case ratings to null`);

// 3. Stats
console.log(`\nFinal: ${deduped.length} homes`);
const rValues = {};
deduped.forEach(h => { rValues[h.r || 'unrated'] = (rValues[h.r || 'unrated'] || 0) + 1 });
Object.entries(rValues).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

writeFileSync(DB, JSON.stringify(deduped));
const mb = (Buffer.byteLength(JSON.stringify(deduped)) / 1024 / 1024).toFixed(1);
console.log(`\nSaved: ${mb} MB`);
