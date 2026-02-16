#!/usr/bin/env node
/**
 * Enrich care homes with provider (parent company) data:
 * 1. Fetch providerId for each home from CQC API
 * 2. Fetch provider details (name, total locations, ratings breakdown)
 * 3. Add provider portfolio stats to each home
 *
 * Fields added:
 * - prov: provider name
 * - prov_n: total locations this provider operates
 * - prov_good: % of provider's homes rated Good or Outstanding
 *
 * Source: CQC API
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LAYERS = resolve(__dirname, '..', '..', 'data', 'layers');
const CACHE_PATH = resolve(LAYERS, 'provider_cache.json');
const API_BASE = 'https://api.service.cqc.org.uk/public/v1';
const API_KEY = '02dd1bb0f3a74a97a328e60791349f41';

async function apiFetch(path) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Ocp-Apim-Subscription-Key': API_KEY }
      });
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      if (!res.ok) return null;
      return res.json();
    } catch {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return null;
}

async function main() {
  const homes = JSON.parse(readFileSync(resolve(ROOT, 'public/data/care-homes.json'), 'utf8'));
  
  // Step 1: Build provider map from our database
  // We need to fetch providerId for each home — it's not in our local data yet
  // But we can get it efficiently: group homes, fetch provider for a sample from each
  
  // Actually, let's use a two-pass approach:
  // Pass 1: For each home, get its providerId from the location endpoint
  // Pass 2: For each unique provider, fetch their full portfolio
  
  // Load cache
  let locProviders = {}; // locationId -> providerId
  let providerDetails = {}; // providerId -> {name, locations[]}
  
  if (existsSync(CACHE_PATH)) {
    const cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
    locProviders = cache.locProviders || {};
    providerDetails = cache.providerDetails || {};
    console.log(`Cache: ${Object.keys(locProviders).length} locations, ${Object.keys(providerDetails).length} providers`);
  }

  // Pass 1: Get providerId for each home (from CQC location endpoint)
  const needProvId = homes.filter(h => !locProviders[h.id]);
  console.log(`\nPass 1: Need providerId for ${needProvId.length} homes`);
  
  let fetched = 0, errors = 0;
  for (const home of needProvId) {
    const data = await apiFetch(`/locations/${home.id}`);
    if (data?.providerId) {
      locProviders[home.id] = data.providerId;
      fetched++;
    } else {
      errors++;
    }
    
    if ((fetched + errors) % 100 === 0) {
      console.log(`  ${fetched + errors}/${needProvId.length} (fetched: ${fetched}, errors: ${errors})`);
      writeFileSync(CACHE_PATH, JSON.stringify({ locProviders, providerDetails }));
    }
    await new Promise(r => setTimeout(r, 100));
  }
  writeFileSync(CACHE_PATH, JSON.stringify({ locProviders, providerDetails }));
  console.log(`Pass 1 done: ${fetched} fetched, ${errors} errors`);

  // Collect unique providers and count their homes in our database
  const providerHomes = {}; // providerId -> [home, ...]
  for (const home of homes) {
    const provId = locProviders[home.id];
    if (provId) {
      if (!providerHomes[provId]) providerHomes[provId] = [];
      providerHomes[provId].push(home);
    }
  }
  
  const uniqueProviders = Object.keys(providerHomes);
  console.log(`\nUnique providers: ${uniqueProviders.length}`);
  
  // Find providers with multiple homes (chains)
  const chains = uniqueProviders.filter(p => providerHomes[p].length >= 2);
  console.log(`Chains (2+ homes): ${chains.length}`);
  const bigChains = uniqueProviders.filter(p => providerHomes[p].length >= 10);
  console.log(`Big chains (10+ homes): ${bigChains.length}`);

  // Pass 2: Fetch provider names for chains
  const needProvDetails = chains.filter(p => !providerDetails[p]);
  console.log(`\nPass 2: Need details for ${needProvDetails.length} providers`);
  
  fetched = 0; errors = 0;
  for (const provId of needProvDetails) {
    const data = await apiFetch(`/providers/${provId}`);
    if (data) {
      providerDetails[provId] = {
        name: data.name,
        totalLocations: (data.locationIds || []).length,
      };
      fetched++;
    } else {
      errors++;
    }
    
    if ((fetched + errors) % 50 === 0) {
      console.log(`  ${fetched + errors}/${needProvDetails.length}`);
      writeFileSync(CACHE_PATH, JSON.stringify({ locProviders, providerDetails }));
    }
    await new Promise(r => setTimeout(r, 100));
  }
  writeFileSync(CACHE_PATH, JSON.stringify({ locProviders, providerDetails }));
  console.log(`Pass 2 done: ${fetched} fetched, ${errors} errors`);

  // Build portfolio stats per provider from our data
  const provStats = {};
  for (const [provId, homesList] of Object.entries(providerHomes)) {
    const rated = homesList.filter(h => h.r);
    const good = rated.filter(h => h.r === 'Good' || h.r === 'Outstanding');
    const details = providerDetails[provId];
    
    provStats[provId] = {
      name: details?.name || null,
      n: details?.totalLocations || homesList.length,
      n_our: homesList.length,
      pct_good: rated.length > 0 ? Math.round(good.length / rated.length * 100) : null,
    };
  }

  // Apply to homes — only show provider data for chains (2+ homes)
  let applied = 0;
  for (const home of homes) {
    const provId = locProviders[home.id];
    if (!provId) continue;
    const stats = provStats[provId];
    if (!stats || stats.n_our < 2) continue; // Skip single-home providers
    
    if (stats.name) home.prov = stats.name;
    home.prov_n = stats.n;
    if (stats.pct_good !== null) home.prov_good = stats.pct_good;
    applied++;
  }

  console.log(`\nProvider data applied: ${applied}/${homes.length} homes`);

  // Top chains
  const chainList = Object.entries(provStats)
    .filter(([, s]) => s.n_our >= 10 && s.name)
    .sort((a, b) => b[1].n - a[1].n);
  
  console.log('\nTop 15 chains:');
  for (const [, stats] of chainList.slice(0, 15)) {
    console.log(`  ${stats.name}: ${stats.n} total locations, ${stats.pct_good}% Good/Outstanding (${stats.n_our} in our DB)`);
  }

  // Save
  writeFileSync(resolve(ROOT, 'public/data/care-homes.json'), JSON.stringify(homes));
  const mb = (Buffer.byteLength(JSON.stringify(homes)) / 1024 / 1024).toFixed(1);
  console.log(`\nSaved: ${mb} MB`);
}

main();
