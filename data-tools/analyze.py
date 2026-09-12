"""
analyze.py — investigation + answer derivation for Ivy Homes assignment.

Each function documents one hypothesis test or one final answer.
Failed hypotheses are kept (not deleted) with a note on why they were
replaced — see README for the full story.
"""

import json
import datetime
import statistics
from collections import Counter
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"


def load(name):
    with (DATA_DIR / f"{name}.json").open("r", encoding="utf-8") as fh:
        return json.load(fh)


# ---------------------------------------------------------------------------
# Projects: duplicate records
# ---------------------------------------------------------------------------

def check_project_duplicates(projects):
    """Doc implies each collection record is unique. Reality: every
    project_id appears exactly 3 times in the raw /v1/projects pull."""
    ids = [p["project_id"] for p in projects]
    print(f"raw records: {len(ids)}, unique project_ids: {len(set(ids))}")


def dedupe_projects(projects):
    return list({p["project_id"]: p for p in projects}.values())


# ---------------------------------------------------------------------------
# Projects: price unit investigation
# ---------------------------------------------------------------------------

def to_rupees(value):
    """Unit is determined by magnitude, not by field identity.
    Raw value < 10  => crores
    Raw value >= 10 => lakhs

    FAILED HYPOTHESIS (kept for the record): originally assumed
    price_min is always lakhs and price_max always crores. That worked
    for some projects but produced 27/50 wildly-wrong per-sqft values
    (e.g. 81 INR/sqft or 594,078 INR/sqft) once checked at scale.
    Testing raw (price_min, price_max) pairs for the outliers showed
    the unit tracks the magnitude of each value independently, not its
    field position — e.g. P40008: (1.36, 3.09) are both crores;
    P40003: (63.0, 90.3) are both lakhs.
    """
    return value * 1e7 if value < 10 else value * 1e5


def fix_project_prices(projects):
    """Returns deduped projects with real_min/real_max (rupees) and
    price-per-sqft added, for use in Q7 and any price comparison."""
    fixed = []
    for p in dedupe_projects(projects):
        real_min = to_rupees(p["price_min"])
        real_max = to_rupees(p["price_max"])
        fixed.append({
            "project_id": p["project_id"],
            "real_min": real_min,
            "real_max": real_max,
            "psf_min": real_min / p["min_area_sqft"],
            "psf_max": real_max / p["max_area_sqft"],
        })
    return fixed


def verify_project_prices(fixed, lo=2000, hi=20000):
    """Sanity check: after correction, every psf value should sit in a
    plausible Chennai band, and real_max should never be < real_min."""
    violations = [f for f in fixed if f["real_max"] < f["real_min"]]
    outliers = [f for f in fixed if not (lo <= f["psf_min"] <= hi) or not (lo <= f["psf_max"] <= hi)]
    print(f"min<=max violations: {len(violations)}")
    print(f"psf outliers outside [{lo}, {hi}]: {len(outliers)}")
    for o in outliers:
        print(o)


# ---------------------------------------------------------------------------
# Q7 — costliest project
# ---------------------------------------------------------------------------

def q7_costliest_project(fixed):
    best = max(fixed, key=lambda f: f["real_max"])
    return {"project_id": best["project_id"], "price_max_inr": round(best["real_max"])}


# ---------------------------------------------------------------------------
# Listings: timestamp format investigation
# ---------------------------------------------------------------------------

def check_listing_timestamps(listings):
    """Doc claims ISO 8601 UTC with Z suffix 'everywhere'. Reality:
    all 950 listing records have naive timestamps (no Z), while
    rentals' posted_at correctly carries Z. Checked hour-of-day
    distribution for a diurnal signal to infer the true timezone —
    distribution is flat across all 24 hours (synthetic data, no
    signal). Assumption going forward: treat naive listing timestamps
    as IST (documented locale, matches REFERENCE's timezone) — stated
    explicitly in README as an assumption, not a proven fact."""
    no_z = [l for l in listings if not l["posted_at"].endswith("Z")]
    print(f"listings missing Z suffix: {len(no_z)} / {len(listings)}")

    hours = Counter(
        datetime.datetime.fromisoformat(l["posted_at"]).hour for l in listings
    )
    print("hour-of-day distribution:", sorted(hours.items()))


# ---------------------------------------------------------------------------
# Q5 — total monthly rent, assigned locality
# ---------------------------------------------------------------------------

def check_rental_duplicates(rentals):
    """Same duplication pattern as /v1/projects: raw records repeat.
    400 raw rental records -> only 50 unique listing_ids (8x repeat)."""
    ids = [r["listing_id"] for r in rentals]
    print(f"raw records: {len(ids)}, unique listing_ids: {len(set(ids))}")


def dedupe_rentals(rentals):
    return list({r["listing_id"]: r for r in rentals}.values())


def q5_total_monthly_rent(rentals, locality="perungudi"):
    rentals = dedupe_rentals(rentals)
    matched = [r for r in rentals if r["locality"].strip().lower() == locality]
    prices = [r["price"] for r in matched]
    print(f"{locality}: {len(matched)} records")
    if prices:
        print(f"price range: {min(prices)} - {max(prices)}, median: {sorted(prices)[len(prices)//2]}")
    return sum(prices)


def check_listing_duplicates(listings):
    """Same pattern as /v1/projects and /v1/rentals: raw records
    repeat identically. 950 raw listing records -> 50 unique
    listing_ids (19x each)."""
    ids = [l["listing_id"] for l in listings]
    print(f"raw records: {len(ids)}, unique listing_ids: {len(set(ids))}")

def dedupe_listings(listings):
    return list({l["listing_id"]: l for l in listings}.values())

def q3_active_listings(listings):
    listings = dedupe_listings(listings)
    live = [l for l in listings if l["is_live"]]
    print(f"{len(live)} / {len(listings)} live")
    return len(live)

def find_corrupt_listings(listings):
    """Structural checks (floor > total_floors, non-positive fields,
    coordinates outside city bounds) caught nothing beyond one false
    positive (a 'plot' with 0 bedrooms - correct, not corrupt).
    The real corrupt records surfaced via price-per-sqft: 4 listings
    (all website=magichomes) have carpet_area far too small for their
    bedroom count (e.g. a 4BHK at 144 sqft), producing >90k INR/sqft
    against a normal ~3k-13k band."""
    listings = dedupe_listings(listings)
    live = [l for l in listings if l["is_live"]]
    corrupt = [l["listing_id"] for l in live if l["price"] / l["carpet_area"] > 50000]
    return sorted(corrupt)

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    projects = load("projects")
    listings = load("listings")
    rentals = load("rentals")

    print("\n--- projects: duplicates ---")
    check_project_duplicates(projects)

    print("\n--- projects: price units ---")
    fixed = fix_project_prices(projects)
    verify_project_prices(fixed)

    print("\n--- listings: timestamps ---")
    check_listing_timestamps(listings)

    print("\n--- rentals: duplicates ---")
    check_rental_duplicates(rentals)

    print("\n--- listings: duplicates ---")
    check_listing_duplicates(listings)

    print("\n--- Q3: active listings ---")
    q3 = q3_active_listings(listings)
    print("Q3 active_listings:", q3)

    print("\n--- Q5: total monthly rent ---")
    q5 = q5_total_monthly_rent(dedupe_rentals(rentals))
    print("Q5 total_monthly_rent:", q5)

    print("\n--- Q7: costliest project ---")
    q7 = q7_costliest_project(fixed)
    print(q7)

    print("\n--- Q4: corrupt listings ---")
    q4 = find_corrupt_listings(listings)
    print("Q4 corrupt_listing_ids:", q4)
