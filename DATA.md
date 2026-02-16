# Data Methodology

## Overview

Care Home Ratings layers multiple open datasets to provide context beyond what any single source offers. This document describes each data layer, its source, how we use it, and our editorial decisions about what to show users.

## Layer 1: CQC Ratings and Inspection Data

**Source:** Care Quality Commission API (`api.service.cqc.org.uk/public/v1`)
**Licence:** Open Government Licence v3.0
**Coverage:** 14,796 care homes in England
**Refresh:** Bulk rebuild from CQC directory CSV, individual locations fetched from API

We pull every CQC-registered care home (residential and nursing) including:
- Current overall rating and five quality area ratings (Safe, Effective, Caring, Responsive, Well-led)
- Location details: address, postcode, beds, type, specialisms
- Coordinates for distance search (via postcodes.io geocoding)

### Build process
1. Parse CQC directory CSV for care home location IDs
2. Fetch full details from CQC API (`/locations/{id}`) with concurrency controls
3. Compact into a JSON database with abbreviated keys to manage file size

**Script:** `scripts/build-from-csv.mjs`

## Layer 2: Inspection History and Trend

**Source:** CQC API — `historicRatings` and `currentRatings` fields per location
**Coverage:** 10,746 rated care homes (unrated homes excluded)

For each rated care home, we fetch the full inspection history and compute:
- **Trend:** `up` (improved), `down` (declined), `stable` (unchanged), `new` (only one rated inspection)
- **Previous rating:** The overall rating at the prior inspection (if trend is up/down)
- **Inspection count:** Total number of rated inspections on record
- **First rated date:** When CQC first published a rating

### Methodology
- Inspections marked "Inspected but not rated" are excluded from trend calculation
- Trend compares the two most recent *rated* inspections only
- Rating order: Inadequate (1) → Requires Improvement (2) → Good (3) → Outstanding (4)

### Distribution (as of Feb 2026)
- Improving: 2,878 (27%)
- Stable: 5,996 (56%)
- Declining: 812 (7.5%)
- New: 1,060 (10%)

**Why we show this:** Families care about trajectory, not just a snapshot. A home rated Good that was previously Outstanding tells a different story to one rated Good that was previously Requires Improvement. Nobody else presents this clearly.

**Script:** `scripts/fetch-history.mjs`

## Layer 3: Nearest A&E Hospital

**Source:** OpenStreetMap via Overpass API
**Query:** `amenity=hospital` + `emergency=yes` within England/Wales bounding box
**Coverage:** 202 hospitals with A&E departments, matched to 14,787 care homes (99.9%)

For each care home, we calculate the straight-line (haversine) distance to the nearest hospital tagged with an A&E department.

### Methodology
- Distances are straight-line, not driving distance. We state this clearly on the site.
- Hospital coordinates from OSM `way` centroids and `node` points
- Filtered to England/Wales by bounding box (lat 50.0–56.0, lng -6.0–2.0)

### Distribution
- Median distance: 4.6 miles
- Under 5 miles: 7,858 (53%)
- Under 10 miles: 11,613 (78%)
- Over 20 miles: 352 (2.4%)

**Why we show this:** When something goes wrong in a care home — a fall, a stroke, a medical emergency — proximity to A&E matters. This is practical information families can't easily find elsewhere.

**Script:** `scripts/enrich-data.mjs`

## Layer 4: Index of Multiple Deprivation (IMD 2019)

**Source:** English Indices of Deprivation 2019, Ministry of Housing, Communities and Local Government (MHCLG)
**Data file:** File 5 — IoD2019 Scores (all sub-domains by LSOA)
**Mapping:** postcodes.io API to resolve postcode → LSOA code
**Coverage:** 14,754 care homes matched (99.7%)

### Fields stored (not currently shown to users)
- `imd` — Overall IMD score (0–100, higher = more deprived)
- `imd_d` — IMD decile (1 = least deprived, 10 = most deprived)
- `idaopi` — Income Deprivation Affecting Older People Index (% of over-60s on low income)

### Editorial decision: NOT shown on the consumer site

We researched this carefully and decided against displaying deprivation data to families. Our reasoning:

1. **It's not actionable.** A family searching for a care home near their parent can't move their parent to a less deprived area. The CQC rating and inspection trend already capture quality directly.

2. **The correlation is modest.** Our analysis shows average CQC rating scores drop from 2.96 (decile 1, least deprived) to 2.87 (decile 10, most deprived). Outstanding homes are twice as common in the least deprived areas. But the vast majority of care homes in *every* decile are rated Good. Deprivation is a weak predictor of individual home quality compared to the actual CQC inspection.

3. **Risk of stigmatisation.** Labelling areas as "most deprived" next to a care home listing could discourage families from considering homes that are perfectly good. It could also read as classist.

4. **The underlying issue is systemic, not consumer-actionable.** Academic research (PMC, 2025) shows that for-profit care homes with more council-funded residents receive lower CQC ratings, because councils pay less per resident than self-funders. This is a structural funding problem — surfacing it as a consumer data point doesn't help and may harm.

### Where this data IS valuable
- **B2B analytics:** Care home operators, local authorities, and NHS commissioners understanding care provision patterns and identifying "care deserts"
- **Policy analysis:** Editorial content about the two-tier funding system in social care
- **Internal insights:** Informing which additional datasets to layer next

The data remains in the database and enrichment pipeline for these future uses.

**Script:** `scripts/enrich-data.mjs`

## Data Pipeline

All enrichment scripts are idempotent and cache intermediate results:
- `data/layers/postcode_lsoa_cache.json` — 13,301 postcode-to-LSOA mappings
- `data/layers/history_cache.json` — 10,746 inspection history lookups
- `data/layers/hospitals_england.json` — 202 A&E hospital locations

### Refresh process
1. Re-download CQC directory CSV (monthly)
2. Run `scripts/build-from-csv.mjs` to rebuild base database
3. Run `scripts/fetch-history.mjs` to update inspection trends
4. Run `scripts/enrich-data.mjs` to re-apply A&E distances and IMD data
5. Commit and push to deploy

## Attributions

- **Care Quality Commission** — Ratings and inspection data. Open Government Licence v3.0. Crown copyright.
- **OpenStreetMap contributors** — Hospital locations. Open Database Licence (ODbL).
- **MHCLG** — English Indices of Deprivation 2019. Open Government Licence v3.0.
- **postcodes.io** — Postcode geocoding and LSOA lookup. Open source.
