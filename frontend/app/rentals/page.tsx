"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { BASE_URL, apiHeaders } from "@/lib/api";
import { getValidToken, logout } from "@/lib/auth";

type Rental = {
  listing_id: string;
  apartment_name?: string;
  locality?: string;
  property_type?: string;
  bedroom?: number;
  bathroom?: number;
  furnishing?: string;
  price?: number;
  deposit?: number;
  carpet_area?: number;
};

const PAGE_SIZE = 50;
const PAGES_TO_FETCH = 8; // 50 unique out of ~400 raw (8x duplication) - a handful of pages should surface all uniques

export default function RentalsPage() {
  const [items, setItems] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
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

        const seen = new Set<string>();
        const unique: Rental[] = [];

        for (let page = 1; page <= PAGES_TO_FETCH; page++) {
          const res = await fetch(
            `${BASE_URL}/v1/rentals?page=${page}&limit=${PAGE_SIZE}`,
            { headers: apiHeaders(token) }
          );
          if (!res.ok) throw new Error(`Failed: ${res.status}`);
          const data = await res.json();
          const results: Rental[] = Array.isArray(data?.results) ? data.results : [];

          for (const r of results) {
            if (r.listing_id && !seen.has(r.listing_id)) {
              seen.add(r.listing_id);
              unique.push(r);
            }
          }
          if (results.length === 0) break;
        }

        if (active) setItems(unique);
      } catch (err) {
        console.error("Rentals load failed:", err);
        if (active) setError("Unable to load rentals.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [router]);

  const filteredItems = items.filter((item) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    const haystack = [
      item.apartment_name,
      item.listing_id,
      item.locality,
      item.furnishing,
      item.property_type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  return (
    <>
      <Navbar />
      <main className="page-shell px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-3">
            <p className="section-label">Ivy Homes</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Rentals</h1>
          </div>

          <div className="surface-card mb-6 rounded-2xl p-3 sm:p-4">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rentals"
              className="input-shell w-full"
              aria-label="Search rentals"
            />
          </div>

          {error ? <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
          {loading ? (
            <div className="surface-card rounded-2xl p-6 text-sm text-slate-600">Loading rentals…</div>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-600"><span className="font-semibold text-slate-800">{filteredItems.length}</span> rentals</p>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredItems.map((item) => (
                  <Link
                    key={item.listing_id}
                    href={`/rentals/${item.listing_id}`}
                    className="card-link"
                  >
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-slate-500">
                      {item.locality}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                      {item.apartment_name ?? item.listing_id}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {item.bedroom ?? "—"} BHK · {item.bathroom ?? "—"} bath · {item.furnishing ?? "—"}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Carpet area: {item.carpet_area ?? "—"} sqft
                    </p>
                    <div className="mt-4 flex items-baseline justify-between gap-3">
                      <p className="text-lg font-semibold text-slate-900">
                        {typeof item.price === "number"
                          ? `₹${item.price.toLocaleString("en-IN")}/mo`
                          : "—"}
                      </p>
                      {typeof item.deposit === "number" ? (
                        <p className="text-xs font-medium text-slate-500">
                          Deposit: ₹{item.deposit.toLocaleString("en-IN")}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}