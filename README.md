# Ivy Homes Investigation + Frontend

This repository contains the Ivy Homes frontend app and the investigation tooling used to validate the live API behavior against the supplied documentation. The source-of-truth evidence for the findings is captured in [submission.json](submission.json), and the implementation history is visible in the Git log.

## Project structure

- [frontend](frontend) — Next.js app for browsing listings, rentals, projects, favourites, insights, and the login flow
- [data-tools](data-tools) — investigation scripts used to pull/list and validate API data
- [resources](resources) — assignment guidance and reference materials
- [submission.json](submission.json) — the final structured findings and answer payload used for the assignment

## How to run

The app runs from the frontend folder:

```bash
cd frontend
npm install
npm run dev
```

Then open the app in a browser at the local Next.js URL printed in the terminal.

### Required environment variables

Create a `.env.local` file inside [frontend](frontend) with the following variables:

```env
NEXT_PUBLIC_API_BASE_URL=https://solve.ivy.homes
NEXT_PUBLIC_API_KEY=YOUR_API_KEY
```

Notes:
- `NEXT_PUBLIC_API_BASE_URL` points to the live Ivy Homes API host.
- `NEXT_PUBLIC_API_KEY` is required for authenticated requests.
- Do not commit real secrets into the repo. Keep local `.env.local` values out of source control.

## Methodology

The investigation started by validating the documented API contract against the live service. We treated the live API as the source of truth rather than the written docs.

### 1) Authentication mismatch

The documentation stated that the API key was appended as a query parameter. That was wrong. Direct login attempts using the documented pattern failed with 401 responses and a server message indicating the `X-API-Key` header was required. The correct flow is to send the API key as the `X-API-Key` header, not as `?api_key=`.

### 2) Full dataset pull and pagination review

We then pulled the complete listing, rental, and project datasets with pagination, checking the actual responses rather than assuming the docs were correct.

This surfaced several concrete mismatches:
- the server returned exactly 50 results per page even when a higher `limit` was requested
- the login response was not the documented `token` shape; it returned `access_token`, `refresh_token`, and `expires_in`
- the refresh flow existed at `/auth/refresh`, even though the docs did not describe it
- the response envelope for some paginated endpoints did not include `page_size` as a field, so code had to track progress via the result length instead of trusting the docs

### 3) Duplicate-record detection

Once we had the full raw pulls, we deduplicated by the key IDs and found repeated records across the live endpoints:
- listings: raw total was 3731, but only 50 unique listing IDs existed after dedupe; each record was repeated many times
- rentals: only 50 unique listing IDs existed, each repeated about 8 times
- projects: each project ID appeared multiple times, with 3 copies per project in the raw API response

This affected all aggregate answers and made it clear that raw row counts could not be used directly without deduplication.

### 4) Project pricing anomaly 

The project data was documented as price values in rupees, but the actual values were mixed between lakhs and crores. The unit was not fixed by field; it was effectively determined by the magnitude of each raw value. We caught this by computing price-per-sqft sanity checks and finding absurd outlier values when the units were assumed incorrectly.

This was corrected by normalizing the price values per value magnitude before comparing project pricing and price-per-sqft.

### 5) Corrupt and fake listing detection

We then moved to data-quality checks on listings.

Corrupt listings were identified via price-per-sqft outlier detection: several listings reported carpet areas too small for their stated bedroom counts, producing impossible values in the 92.5k-109.4k INR/sqft range, far above the normal citywide range of approximately 3k-13k INR/sqft. The affected records were flagged as corrupt and excluded from effective metrics.

Fake or suspicious listings were identified by contact-number cross-referencing. A single phone number showed up across multiple listings with contradictory `posted_by_role` values (`agent` vs `owner`), which is consistent with misrepresentation or fake enquiry generation.

### 6) Broken endpoints discovered by direct testing

We directly tested the documented endpoints and discovered multiple broken or mismatched paths:
- favourites endpoints returned 404 across the tested variants, so a client-side localStorage favourites flow was used as a fallback pending confirmation from Ivy Homes
- `/v1/analytics/summary` returned 404 on the documented path
- `/v1/listing/{id}` returned 404, while the working endpoint was `/v1/listings/{id}` (plural)

These were not assumptions; they were observed by direct HTTP testing against the live API. Confirmed with Ivy Homes that no endpoints are disabled per-key, so 404s found reflect genuine documentation/API mismatches, not key-specific restrictions.

## What turned out fine

The following checks did not reveal genuine corruption and were useful to rule out common false positives:

- Structural corruption checks such as floor count vs total floors found nothing material
- One structural false positive occurred for a plot with 0 bedrooms; after inspection it was correctly judged not corrupt
- Price-cliff checks found nothing abnormal beyond the specific unit-conversion and outlier corruption already identified
- Description-reuse fraud checks found nothing actionable
- Exact-coordinate duplicate checks found no genuine duplicates
- Apartment-name-based duplicate checks also found no genuine duplicates; the final Q2 result remained 50

These findings are consistent with the project’s final submission and the records in [submission.json](submission.json).

## With two more days

If this project had two more days of work, the next priorities would be:

1. Test the remaining filter/sort parameters server-side to verify which ones are actually supported by the live API
2. Replace the fixed page-fetch-count logic with a real infinite-scroll pattern once the server-side pagination behavior is fully validated
3. Add server-side favourites support once `/v1/favourites` is confirmed by Ivy Homes or a working server contract is provided
4. Expand fraud-detection heuristics for contact reuse, description anomalies, and suspicious price patterns

## LLM/tooling note

LLM tooling was used throughout the investigation and implementation workflow, including Claude, in accordance with the assignment rules. The actual repo history and the final structured findings in [submission.json](submission.json) were used as the primary source material for this README and for the project conclusions.

## Final note

This repo is both:
- a working Next.js frontend for the Ivy Homes app, and
- an evidence-based data investigation into the API behavior, deduplication, pricing issues, data quality problems, and broken documented endpoints.

The key lesson is that the live API and the documentation diverged significantly, and the frontend and investigation logic were built around the live system rather than the stale docs.
