"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BASE_URL, apiHeaders } from "@/lib/api";
import { getValidToken, logout } from "@/lib/auth";

type Listing = {
  listing_id: string;
  locality?: string;
  bedroom?: number;
  price?: number;
  carpet_area?: number;
  is_live?: boolean;
};

type Summary = {
  city?: string;
  total_listings?: number;
  median_price?: number;
  median_price_per_sqft?: number;
  by_locality?: { locality: string; count: number; median_price: number }[];
  by_bhk?: { bedroom: number; count: number }[];
};

const PAGE_SIZE = 50;
const PAGES_TO_FETCH = 15;

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function buildFallbackSummary(items: Listing[]): Summary {
  const live = items.filter((item) => item.is_live);
  const byLocality = Object.entries(
    live.reduce((acc, item) => {
      const locality = item.locality ?? "unknown";
      acc[locality] = (acc[locality] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .sort((a, b) => b[1] - a[1])
    .map(([locality, count]) => ({
      locality,
      count,
      median_price: median(live.filter((item) => (item.locality ?? "unknown") === locality).map((item) => item.price ?? 0)),
    }));

  const byBhk = Object.entries(
    live.reduce((acc, item) => {
      const bedroom = item.bedroom ?? 0;
      acc[bedroom] = (acc[bedroom] ?? 0) + 1;
      return acc;
    }, {} as Record<number, number>)
  )
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([bedroom, count]) => ({ bedroom: Number(bedroom), count: Number(count) }));

  return {
    city: "Bengaluru",
    total_listings: live.length,
    median_price: live.length ? median(live.map((item) => item.price ?? 0)) : 0,
    median_price_per_sqft: live.length
      ? median(live.filter((item) => item.carpet_area).map((item) => (item.price ?? 0) / (item.carpet_area ?? 1)))
      : 0,
    by_locality: byLocality,
    by_bhk: byBhk,
  };
}

export default function InsightsPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const token = await getValidToken();
        if (!token) {
          logout();
          router.replace("/login");
          return;
        }

        const summaryRes = await fetch(`${BASE_URL}/v1/analytics/summary`, {
          headers: apiHeaders(token),
        });

        if (summaryRes.ok) {
          const data = await summaryRes.json();
          if (active) setSummary(data);
          return;
        }

        if (summaryRes.status !== 404) {
          throw new Error(`Summary endpoint failed: ${summaryRes.status}`);
        }

        const seen = new Set<string>();
        const unique: Listing[] = [];

        for (let page = 1; page <= PAGES_TO_FETCH; page++) {
          const res = await fetch(
            `${BASE_URL}/v1/listings?page=${page}&limit=${PAGE_SIZE}`,
            { headers: apiHeaders(token) }
          );
          if (!res.ok) throw new Error(`Failed: ${res.status}`);
          const data = await res.json();
          const results: Listing[] = Array.isArray(data?.results) ? data.results : [];
          for (const listing of results) {
            if (listing.listing_id && !seen.has(listing.listing_id)) {
              seen.add(listing.listing_id);
              unique.push(listing);
            }
          }
          if (results.length === 0) break;
        }

        if (active) {
          setItems(unique);
          setSummary(buildFallbackSummary(unique));
        }
      } catch (err) {
        console.error("Insights load failed:", err);
        if (active) setError("Unable to load listing data for insights.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [router]);

  const live = items.filter((item) => item.is_live);
  const medianPrice = summary?.median_price ?? (live.length ? median(live.map((item) => item.price ?? 0)) : 0);
  const medianPsf = summary?.median_price_per_sqft ?? (live.length
    ? median(live.filter((item) => item.carpet_area).map((item) => (item.price ?? 0) / (item.carpet_area ?? 1)))
    : 0);

  const byLocality =
    summary?.by_locality ??
    Object.entries(
      live.reduce((acc, item) => {
        const locality = item.locality ?? "unknown";
        acc[locality] = (acc[locality] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .sort((a, b) => b[1] - a[1])
      .map(([locality, count]) => ({
        locality,
        count,
        median_price: median(
          live
            .filter((item) => (item.locality ?? "unknown") === locality)
            .map((item) => item.price ?? 0)
        ),
      }));

  const byBhk =
    summary?.by_bhk ??
    Object.entries(
      live.reduce((acc, item) => {
        const bedroom = item.bedroom ?? 0;
        acc[bedroom] = (acc[bedroom] ?? 0) + 1;
        return acc;
      }, {} as Record<number, number>)
    )
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([bedroom, count]) => ({ bedroom: Number(bedroom), count: Number(count) }));

  return (
    <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Ivy Homes</p>
            <h1 className="text-3xl font-bold">Insights</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/listings" className="rounded border border-neutral-300 px-3 py-2 text-sm">
              Listings
            </Link>
            <Link href="/rentals" className="rounded border border-neutral-300 px-3 py-2 text-sm">
              Rentals
            </Link>
            <Link href="/projects" className="rounded border border-neutral-300 px-3 py-2 text-sm">
              Projects
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="rounded border border-neutral-300 px-3 py-2 text-sm"
            >
              Log out
            </button>
          </div>
        </div>

        <section className="mb-8 rounded border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold">City Overview</h2>
          <p className="mb-3 text-xs text-neutral-500">
            Computed live from listing data — the documented <code>/v1/analytics/summary</code> endpoint returns 404 on this API.
          </p>
          {loading ? (
            <p className="text-neutral-600">Loading…</p>
          ) : error ? (
            <p className="text-red-700">{error}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div><span className="text-neutral-500">Unique listings:</span> {items.length}</div>
                <div><span className="text-neutral-500">Live listings:</span> {live.length}</div>
                <div><span className="text-neutral-500">Median price:</span> ₹{Math.round(medianPrice).toLocaleString("en-IN")}</div>
                <div><span className="text-neutral-500">Median ₹/sqft:</span> {Math.round(medianPsf).toLocaleString("en-IN")}</div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-sm font-medium text-neutral-700">By locality</p>
                  <ul className="text-sm text-neutral-600">
                    {byLocality.map((entry) => (
                      <li key={entry.locality} className="flex justify-between capitalize">
                        <span>{entry.locality}</span><span>{entry.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-neutral-700">By BHK</p>
                  <ul className="text-sm text-neutral-600">
                    {byBhk.map((entry) => (
                      <li key={entry.bedroom} className="flex justify-between">
                        <span>{entry.bedroom} BHK</span><span>{entry.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="rounded border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Data Quality Findings</h2>
          <p className="mb-4 text-sm text-neutral-600">
            Discovered while building this app — see <code>submission.json</code> for full details.
          </p>
          <ul className="space-y-3 text-sm">
            <li>
              <strong>Duplicate records:</strong> every listing/rental/project is returned repeated many times by the API (~75x for listings, 8x rentals, 3x projects) — only <strong>50 unique</strong> records exist per collection despite raw totals in the thousands.
            </li>
            <li>
              <strong>4 corrupt listings</strong> report a carpet area far too small for their bedroom count (e.g. a 4BHK at 144 sqft), producing impossible ₹/sqft figures (92.5k–109.4k vs a normal ~3k–13k range).
            </li>
            <li>
              <strong>2 likely fake listings</strong> share a phone number under contradictory seller roles (one &quot;agent,&quot; one &quot;owner&quot;) for two unrelated properties.
            </li>
            <li>
              <strong>43 of 50 projects</strong> report a <code>total_listings</code> count that does not match the actual number of listings tied to that project.
            </li>
            <li>
              <strong>Project prices</strong> are documented as rupees but are actually a mix of lakhs and crores, determined by each value&apos;s own magnitude rather than which field it is in — corrected throughout this app.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}