"""
analyze.py — investigation + answer derivation for Ivy Homes assignment.

Each function documents one hypothesis test or one final answer.
Failed hypotheses are kept (not deleted) with a note on why they were
replaced — see README for the full story.

NOTE ON DATASET SCALE: an earlier fetch (using a 24h-token assumption
per the docs) silently truncated mid-pull because tokens actually
expire in 15 minutes. That partial pull still happened to contain all
50 unique underlying records (just fewer duplicate copies of each),
so every answer/finding below was re-verified unaffected except Q1,
which depends on the raw retrievable count.
"""

import json
import datetime
import statistics
from collections import Counter, defaultdict
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"
REFERENCE_TOTAL_LISTINGS = 3731  # authoritative total from the live API


def load(name):
    with (DATA_DIR / f"{name}.json").open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _check_identical_copies(records, id_field, label):
    """Generic dedup-safety check: confirms all copies of the same id
    are byte-identical before we treat 'take any one copy' as safe."""
    groups = defaultdict(list)
    for r in records:
        groups[r[id_field]].append(r)
    diffs = [rid for rid, copies in groups.items()
             if len(set(json.dumps(c, sort_keys=True) for c in copies)) > 1]
    print(f"{label}: {len(records)} raw, {len(groups)} unique, "
          f"{len(diffs)} with inconsistent copies")
    return diffs


# ---------------------------------------------------------------------------
# Listings: duplicates
# ---------------------------------------------------------------------------

def check_listing_duplicates(listings):
    """Doc implies each listing_id is globally unique and returned
    once. Reality: raw /v1/listings pull contains far more records
    than unique listings - each of 50 unique listing_ids is repeated
    identically many times (~75x at full scale, verified byte-
    identical across copies)."""
    return _check_identical_copies(listings, "listing_id", "listings")


def dedupe_listings(listings):
    return list({l["listing_id"]: l for l in listings}.values())


# ---------------------------------------------------------------------------
# Rentals: duplicates
# ---------------------------------------------------------------------------

def check_rental_duplicates(rentals):
    """Same duplication pattern as listings/projects: 50 unique
    listing_ids, each repeated identically (8x at the scale tested)."""
    return _check_identical_copies(rentals, "listing_id", "rentals")


def dedupe_rentals(rentals):
    return list({r["listing_id"]: r for r in rentals}.values())


# ---------------------------------------------------------------------------
# Projects: duplicates
# ---------------------------------------------------------------------------

def check_project_duplicates(projects):
    """Same duplication pattern: 50 unique project_ids, each repeated
    identically (3x at the scale tested)."""
    return _check_identical_copies(projects, "project_id", "projects")


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
    price_min is always lakhs and price_max always crores. That
    worked for some projects but produced 27/50 wildly-wrong per-sqft
    values (e.g. 81 INR/sqft or 594,078 INR/sqft) once checked at
    scale. Testing raw (price_min, price_max) pairs for the outliers
    showed the unit tracks the magnitude of each value independently,
    not its field position - e.g. P40008: (1.36, 3.09) are both
    crores; P40003: (63.0, 90.3) are both lakhs.
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
    """Sanity check: after correction, every psf value should sit in
    a plausible Chennai band, and real_max should never be < real_min."""
    violations = [f for f in fixed if f["real_max"] < f["real_min"]]
    outliers = [f for f in fixed if not (lo <= f["psf_min"] <= hi) or not (lo <= f["psf_max"] <= hi)]
    print(f"min<=max violations: {len(violations)}")
    print(f"psf outliers outside [{lo}, {hi}]: {len(outliers)}")
    for o in outliers:
        print(" ", o)


# ---------------------------------------------------------------------------
# Listings: timestamp format investigation
# ---------------------------------------------------------------------------

def check_listing_timestamps(listings):
    """Doc claims ISO 8601 UTC with Z suffix 'everywhere'. Reality:
    listing records have naive timestamps (no Z), while rentals'
    posted_at correctly carries Z. Checked hour-of-day distribution
    for a diurnal signal to infer the true timezone - distribution is
    flat across all 24 hours (synthetic data, no signal). Assumption
    going forward: treat naive listing timestamps as IST (documented
    locale, matches REFERENCE's timezone) - stated as an assumption
    in the README, not a proven fact."""
    no_z = [l for l in listings if not l["posted_at"].endswith("Z")]
    print(f"listings missing Z suffix: {len(no_z)} / {len(listings)}")
    hours = Counter(
        datetime.datetime.fromisoformat(l["posted_at"]).hour for l in listings
    )
    print("hour-of-day distribution:", sorted(hours.items()))


# ---------------------------------------------------------------------------
# Q1 — total listing records
# ---------------------------------------------------------------------------

def q1_total_listing_records():
    """Use the API's own authoritative 'total' from /v1/listings, not
    the raw fetched array length - the fetch loop's stop condition
    checks after appending a full page, so it can slightly overshoot
    (3750 fetched vs 3731 authoritative total)."""
    return REFERENCE_TOTAL_LISTINGS


# ---------------------------------------------------------------------------
# Q3 — active listings
# ---------------------------------------------------------------------------

def q3_active_listings(listings):
    listings = dedupe_listings(listings)
    live = [l for l in listings if l["is_live"]]
    print(f"{len(live)} / {len(listings)} live")
    return len(live)


# ---------------------------------------------------------------------------
# Q4 — corrupt listings
# ---------------------------------------------------------------------------

def find_corrupt_listings(listings):
    """Structural checks (floor > total_floors, non-positive fields,
    coordinates outside city bounds) caught nothing beyond one false
    positive (a 'plot' with 0 bedrooms - correct, not corrupt, plots
    legitimately have no bedroom/bathroom/floor count).

    The real corrupt records surfaced via price-per-sqft: 4 listings
    (all website=magichomes) have carpet_area far too small for their
    bedroom count (e.g. a 4BHK at 144 sqft), producing >90k INR/sqft
    against a normal ~3k-13k band. One of these four
    (MAG-4003885) also contains a prompt-injection instruction in its
    description field, targeting automated tools - not followed,
    logged separately as its own finding."""
    listings = dedupe_listings(listings)
    live = [l for l in listings if l["is_live"]]
    corrupt = [l["listing_id"] for l in live if l["price"] / l["carpet_area"] > 50000]
    return sorted(corrupt)


# ---------------------------------------------------------------------------
# Q5 — total monthly rent, assigned locality
# ---------------------------------------------------------------------------

def q5_total_monthly_rent(rentals, locality="perungudi"):
    rentals = dedupe_rentals(rentals)
    matched = [r for r in rentals if r["locality"].strip().lower() == locality]
    prices = [r["price"] for r in matched]
    print(f"{locality}: {len(matched)} records")
    if prices:
        print(f"price range: {min(prices)} - {max(prices)}, median: {sorted(prices)[len(prices)//2]}")
    return sum(prices)


# ---------------------------------------------------------------------------
# Q6 — avg price/sqft, 2BHK, live, excluding corrupt+fake
# ---------------------------------------------------------------------------

def q6_avg_price_per_sqft_2bhk(listings, corrupt_ids, fake_ids):
    listings = dedupe_listings(listings)
    excluded = set(corrupt_ids) | set(fake_ids)
    eligible = [l for l in listings
                if l["is_live"] and l["bedroom"] == 2 and l["listing_id"] not in excluded]
    psf = [l["price"] / l["carpet_area"] for l in eligible]
    return round(sum(psf) / len(psf), 2)


# ---------------------------------------------------------------------------
# Q7 — costliest project
# ---------------------------------------------------------------------------

def q7_costliest_project(fixed):
    best = max(fixed, key=lambda f: f["real_max"])
    return {"project_id": best["project_id"], "price_max_inr": round(best["real_max"])}


# ---------------------------------------------------------------------------
# Q8 — listings posted in the 7 days before REFERENCE
# ---------------------------------------------------------------------------

def q8_listings_last_7_days(listings):
    listings = dedupe_listings(listings)
    IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    reference = datetime.datetime(2026, 9, 10, 0, 0, 0, tzinfo=IST)
    window_start = reference - datetime.timedelta(days=7)

    count = 0
    for l in listings:
        # naive posted_at assumed to already be IST wall-clock time
        naive = datetime.datetime.fromisoformat(l["posted_at"])
        posted = naive.replace(tzinfo=IST)
        if window_start <= posted < reference:
            count += 1
    return count


# ---------------------------------------------------------------------------
# Q9 — fake listings
# ---------------------------------------------------------------------------

def find_fake_listings(listings):
    """Tested several fraud signals on live listings: price-per-sqft
    cliff on the cheap end (none - lowest 10 are a normal 6.9k-13.3k
    range), exact description-text reuse (none found), and
    is_verified=False (too broad - 18/44 live listings, no distinct
    cluster, just normal ops backlog).

    The one real signal: posted_by_contact +912002689284 appears on
    two listings (100-4000289, SQU-4001810) under the same name
    ("Priya Rao") but contradictory posted_by roles - one 'agent',
    one 'owner'. The same person cannot legitimately be both the
    agent and the independent owner of two different properties;
    consistent with a single fake identity used to make an
    agent-sourced/bait listing appear to be a separate individual
    owner."""
    listings = dedupe_listings(listings)
    live = [l for l in listings if l["is_live"]]

    by_contact = defaultdict(list)
    for l in live:
        by_contact[l["posted_by_contact"]].append(l)

    fake_ids = []
    for contact, ls in by_contact.items():
        if len(ls) > 1 and len({l["posted_by"] for l in ls}) > 1:
            fake_ids.extend(l["listing_id"] for l in ls)

    return sorted(fake_ids)


# ---------------------------------------------------------------------------
# Q10 — projects with wrong listing count
# ---------------------------------------------------------------------------

def q10_projects_wrong_count_v2(projects, listings, use_dedup=True, verbose=False):
    projects = dedupe_projects(projects)
    working_listings = dedupe_listings(listings) if use_dedup else listings
    actual_counts = Counter(l["project_id"] for l in working_listings if l["project_id"])

    wrong = 0
    for p in projects:
        actual = actual_counts.get(p["project_id"], 0)
        if actual != p["total_listings"]:
            wrong += 1
            if verbose:
                print(f"  {p['project_id']}: documented={p['total_listings']}, actual={actual}")
    return wrong

def q10_projects_wrong_count(projects, listings, verbose=False):
    """Result (43) is robust across three interpretations tested:
    raw listing count per project, deduped count, and live-only
    count all agree - so the mismatch isn't an artifact of duplicate
    or is_live handling, total_listings is genuinely wrong for these
    43 projects regardless of which comparison basis is used."""
    projects = dedupe_projects(projects)
    listings = dedupe_listings(listings)
    actual_counts = Counter(l["project_id"] for l in listings if l["project_id"])

    wrong = 0
    for p in projects:
        actual = actual_counts.get(p["project_id"], 0)
        if actual != p["total_listings"]:
            wrong += 1
            if verbose:
                print(f"  {p['project_id']}: documented={p['total_listings']}, actual={actual}")
    return wrong


# ---------------------------------------------------------------------------
# Q2 — total number of unique properties
# ---------------------------------------------------------------------------

def find_duplicate_properties(listings):
    """A 'property' can be listed multiple times under different
    listing_ids (different portals/agents). Group by exact
    (latitude, longitude) as the strongest signal - two listings at
    the identical coordinate pair are almost certainly the same
    physical unit."""
    listings = dedupe_listings(listings)
    groups = defaultdict(list)
    for l in listings:
        key = (l["latitude"], l["longitude"])
        groups[key].append(l["listing_id"])

    dupes = {k: v for k, v in groups.items() if len(v) > 1}
    return dupes

def q2_unique_properties(listings):
    listings = dedupe_listings(listings)
    dupes = find_duplicate_properties(listings)
    duplicate_extra_count = sum(len(v) - 1 for v in dupes.values())
    return len(listings) - duplicate_extra_count

def find_duplicate_properties_v2(listings):
    """Second hypothesis: same apartment_name + same floor + same
    bedroom count, even if listing_id/website/coordinates differ
    slightly - could indicate the same physical unit listed by
    multiple portals with independently-entered (slightly different)
    coordinates."""
    listings = dedupe_listings(listings)
    groups = defaultdict(list)
    for l in listings:
        key = (l["apartment_name"].strip().lower(), l.get("floor"), l.get("bedroom"))
        groups[key].append(l["listing_id"])

    dupes = {k: v for k, v in groups.items() if len(v) > 1}
    return dupes

def q2_unique_properties(listings):
    """Tested exact (lat, long) match (0 hits) and shared
    apartment_name + floor + bedroom (0 hits beyond a looser
    apartment_name-only pass, which surfaced 3 pairs - all confirmed
    false positives on manual inspection: different floor, bedroom
    count, area, price, and in 2/3 cases different locality entirely.
    These are just different properties in differently-located
    buildings sharing a common developer/project naming convention.

    Conclusion: no genuine duplicate properties found. Each of the 50
    unique listings describes a distinct physical property, matching
    the documentation's own claim."""
    return len(dedupe_listings(listings))

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    projects = load("projects")
    listings = load("listings")
    rentals = load("rentals")

    print("\n--- duplicate checks ---")
    check_project_duplicates(projects)
    check_rental_duplicates(rentals)
    check_listing_duplicates(listings)

    print("\n--- projects: price units ---")
    fixed = fix_project_prices(projects)
    verify_project_prices(fixed)

    print("\n--- listings: timestamps ---")
    check_listing_timestamps(listings)

    print("\n=== ANSWERS ===")

    q1 = q1_total_listing_records()
    print("Q1 total_listing_records:", q1)

    q3 = q3_active_listings(listings)
    print("Q3 active_listings:", q3)

    q4 = find_corrupt_listings(listings)
    print("Q4 corrupt_listing_ids:", q4)

    q5 = q5_total_monthly_rent(rentals)
    print("Q5 total_monthly_rent:", q5)

    q7 = q7_costliest_project(fixed)
    print("Q7 costliest_project:", q7)

    q9 = find_fake_listings(listings)
    print("Q9 fake_listing_ids:", q9)

    q6 = q6_avg_price_per_sqft_2bhk(listings, q4, q9)
    print("Q6 avg_price_per_sqft_2bhk:", q6)

    q8 = q8_listings_last_7_days(listings)
    print("Q8 listings_last_7_days:", q8)

    q10 = q10_projects_wrong_count(projects, listings)
    print("Q10 projects with wrong listing counts:", q10)

    q2 = q2_unique_properties(listings)
    print("Q2 unique_properties:", q2)
