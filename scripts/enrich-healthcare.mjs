#!/usr/bin/env node

/**
 * Enrich care homes with nearby healthcare services:
 * - Nearest GP surgery (name + distance)
 * - Nearest pharmacy (name + distance) 
 * - Nearest dentist (name + distance)
 * - Count of GPs, pharmacies, dentists within 2 miles
 *
 * Source: OpenStreetMap via Overpass API
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LAYERS = resolve(__dirname, '..', '..', 'data', 'layers');

function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function main() {
  console.log('=== Healthcare Services Enrichment ===\n');

  const homes = JSON.parse(readFileSync(resolve(ROOT, 'public/data/care-homes.json'), 'utf8'));
  const services = JSON.parse(readFileSync(resolve(LAYERS, 'healthcare_services.json'), 'utf8'));

  // Split services by type
  const gps = services.filter(s => s.type === 'doctors');
  const pharmacies = services.filter(s => s.type === 'pharmacy');
  const dentists = services.filter(s => s.type === 'dentist');

  console.log(`Care homes: ${homes.length}`);
  console.log(`GPs: ${gps.length}`);
  console.log(`Pharmacies: ${pharmacies.length}`);
  console.log(`Dentists: ${dentists.length}`);

  const NEARBY_RADIUS = 2; // miles

  let matched = 0;
  let skipped = 0;

  for (const home of homes) {
    if (!home.lat || !home.lng) { skipped++; continue; }

    // Find nearest of each type + count within radius
    let nearestGp = null, nearestGpDist = Infinity;
    let nearestPharm = null, nearestPharmDist = Infinity;
    let nearestDent = null, nearestDentDist = Infinity;
    let gpCount = 0, pharmCount = 0, dentCount = 0;

    for (const gp of gps) {
      const d = haversine(home.lat, home.lng, gp.lat, gp.lng);
      if (d <= NEARBY_RADIUS) gpCount++;
      if (d < nearestGpDist) { nearestGpDist = d; nearestGp = gp; }
    }

    for (const ph of pharmacies) {
      const d = haversine(home.lat, home.lng, ph.lat, ph.lng);
      if (d <= NEARBY_RADIUS) pharmCount++;
      if (d < nearestPharmDist) { nearestPharmDist = d; nearestPharm = ph; }
    }

    for (const de of dentists) {
      const d = haversine(home.lat, home.lng, de.lat, de.lng);
      if (d <= NEARBY_RADIUS) dentCount++;
      if (d < nearestDentDist) { nearestDentDist = d; nearestDent = de; }
    }

    // Only add if we found services (handles the OSM coverage gap)
    if (nearestGpDist < 50) {
      home.gp_name = nearestGp.name || null;
      home.gp_miles = Math.round(nearestGpDist * 10) / 10;
      home.gp_n = gpCount;
      matched++;
    }
    if (nearestPharmDist < 50) {
      home.ph_name = nearestPharm.name || null;
      home.ph_miles = Math.round(nearestPharmDist * 10) / 10;
      home.ph_n = pharmCount;
    }
    if (nearestDentDist < 50) {
      home.dn_miles = Math.round(nearestDentDist * 10) / 10;
      home.dn_n = dentCount;
    }
  }

  console.log(`\nMatched: ${matched}, Skipped: ${skipped}`);

  // Stats
  const withGp = homes.filter(h => h.gp_miles != null);
  const gpDists = withGp.map(h => h.gp_miles).sort((a, b) => a - b);
  console.log(`\n--- GP Surgeries ---`);
  console.log(`  Homes with GP data: ${withGp.length}`);
  console.log(`  Median distance: ${gpDists[Math.floor(gpDists.length / 2)]} miles`);
  console.log(`  Under 1 mile: ${gpDists.filter(d => d <= 1).length}`);
  console.log(`  Under 2 miles: ${gpDists.filter(d => d <= 2).length}`);
  const gpCounts = withGp.map(h => h.gp_n);
  console.log(`  Avg GPs within 2mi: ${(gpCounts.reduce((a,b) => a+b, 0) / gpCounts.length).toFixed(1)}`);

  const withPh = homes.filter(h => h.ph_miles != null);
  const phDists = withPh.map(h => h.ph_miles).sort((a, b) => a - b);
  console.log(`\n--- Pharmacies ---`);
  console.log(`  Homes with pharmacy data: ${withPh.length}`);
  console.log(`  Median distance: ${phDists[Math.floor(phDists.length / 2)]} miles`);
  console.log(`  Under 1 mile: ${phDists.filter(d => d <= 1).length}`);

  const withDn = homes.filter(h => h.dn_miles != null);
  const dnDists = withDn.map(h => h.dn_miles).sort((a, b) => a - b);
  console.log(`\n--- Dentists ---`);
  console.log(`  Homes with dentist data: ${withDn.length}`);
  console.log(`  Median distance: ${dnDists[Math.floor(dnDists.length / 2)]} miles`);

  // Save
  const outPath = resolve(ROOT, 'public/data/care-homes.json');
  writeFileSync(outPath, JSON.stringify(homes));
  const sizeMB = (Buffer.byteLength(JSON.stringify(homes)) / 1024 / 1024).toFixed(1);
  console.log(`\nSaved care-homes.json (${sizeMB} MB)`);

  // Sample
  const sample = homes.find(h => h.gp_miles && h.ph_miles && h.ae_name);
  if (sample) {
    console.log('\nSample entry:');
    console.log(`  ${sample.n} (${sample.pc})`);
    console.log(`  A&E: ${sample.ae_name} — ${sample.ae_miles} mi`);
    console.log(`  GP: ${sample.gp_name} — ${sample.gp_miles} mi (${sample.gp_n} within 2mi)`);
    console.log(`  Pharmacy: ${sample.ph_name} — ${sample.ph_miles} mi (${sample.ph_n} within 2mi)`);
    console.log(`  Dentist: ${sample.dn_miles} mi (${sample.dn_n} within 2mi)`);
  }
}

main();
