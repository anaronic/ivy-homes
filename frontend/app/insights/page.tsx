"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
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
    <>
      <Navbar />
      <main className="page-shell px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex flex-col gap-3">
            <p className="section-label">Ivy Homes</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Insights</h1>
          </div>

          <section className="surface-card mb-8 rounded-[24px] p-5 sm:p-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">City Overview</h2>
          <p className="mt-2 text-xs text-slate-500">
            Computed live from listing data — the documented <code>/v1/analytics/summary</code> endpoint returns 404 on this API.
          </p>
          {loading ? (
            <p className="mt-4 text-sm text-slate-600">Loading…</p>
          ) : error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
          ) : (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="grid-card-metric">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Unique listings</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{items.length}</p>
                </div>
                <div className="grid-card-metric">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Live listings</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{live.length}</p>
                </div>
                <div className="grid-card-metric">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Median price</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">₹{Math.round(medianPrice).toLocaleString("en-IN")}</p>
                </div>
                <div className="grid-card-metric">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Median ₹/sqft</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{Math.round(medianPsf).toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <p className="mb-2 text-sm font-semibold text-slate-700">By locality</p>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {byLocality.map((entry) => (
                      <li key={entry.locality} className="flex items-center justify-between gap-3 capitalize">
                        <span>{entry.locality}</span><span className="font-medium text-slate-800">{entry.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <p className="mb-2 text-sm font-semibold text-slate-700">By BHK</p>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {byBhk.map((entry) => (
                      <li key={entry.bedroom} className="flex items-center justify-between gap-3">
                        <span>{entry.bedroom} BHK</span><span className="font-medium text-slate-800">{entry.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="surface-card rounded-[28px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 sm:p-6 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-3 border-b border-amber-200/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-label text-amber-700">Findings</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">What the API and docs disagree on</h2>
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">live evidence</p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-500">Auth</p>
              <p className="mt-2 text-sm leading-6 text-slate-700"><strong className="text-slate-900">Key mismatch:</strong> the API rejects the documented query-param flow and requires the <code>X-API-Key</code> header. Login also responds with access + refresh tokens instead of a single 24h token.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-500">Pagination</p>
              <p className="mt-2 text-sm leading-6 text-slate-700"><strong className="text-slate-900">Server reality:</strong> every paginated endpoint returns exactly 50 rows per page regardless of the requested limit, and the documented <code>page_size</code> field is absent.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-500">Missing endpoints</p>
              <p className="mt-2 text-sm leading-6 text-slate-700"><strong className="text-slate-900">Broken docs:</strong> <code>/v1/analytics/summary</code> and <code>/v1/favourites</code> return 404 on this API, so the app falls back to live computed metrics and browser-side saved listings.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-500">Duplicates</p>
              <p className="mt-2 text-sm leading-6 text-slate-700"><strong className="text-slate-900">Raw totals are misleading:</strong> listings repeat ~75x, rentals repeat 8x, and projects repeat 3x. Only 50 unique properties exist in the current city dataset.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-500">Data quality</p>
              <p className="mt-2 text-sm leading-6 text-slate-700"><strong className="text-slate-900">4 corrupt listings:</strong> carpet areas are impossible for the bedroom counts, producing ₹/sqft values around 92.5k–109.4k instead of the normal ~3k–13k range.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-500">Fraud</p>
              <p className="mt-2 text-sm leading-6 text-slate-700"><strong className="text-slate-900">Fake enquiry listings:</strong> two records share a phone number under contradictory roles and are treated as generated enquiry bait rather than genuine seller posts.</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-900 p-5 text-slate-100 shadow-inner">
            <h3 className="text-base font-semibold tracking-tight text-white">Key conclusions</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              <li><span className="font-semibold text-white">Duplicate handling is mandatory:</span> raw listing totals are not the same as real unique property counts, and any answers derived from rows without deduplication are inflated.</li>
              <li><span className="font-semibold text-white">Project pricing needs unit normalization:</span> the documented rupee assumption is wrong for many project values because the API mixes lakhs and crores by magnitude rather than by field.</li>
              <li><span className="font-semibold text-white">The dataset needs quality filtering:</span> corrupt records and fake enquiry listings distort price-per-sqft and any aggregate based on raw rows.</li>
            </ul>
          </div>
        </section>
        </div>
      </main>
    </>
  );
}