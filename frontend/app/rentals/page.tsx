"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BASE_URL, apiHeaders } from "@/lib/api";
import { getValidToken, logout } from "@/lib/auth";

type Rental = {
  listing_id: string;
  apartment_name?: string;
  locality?: string;
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

  return (
    <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Ivy Homes</p>
            <h1 className="text-3xl font-bold">Rentals</h1>
          </div>
          <a href="/listings" className="text-sm text-neutral-500 hover:underline">
            ← Back to listings
          </a>
        </div>

        {error ? <p className="text-red-700">{error}</p> : null}
        {loading ? (
          <p className="text-neutral-600">Loading rentals…</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-neutral-500">{items.length} rentals</p>
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.listing_id}
                  className="rounded border border-neutral-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                    {item.locality}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {item.apartment_name ?? item.listing_id}
                  </h2>
                  <p className="mt-2 text-sm text-neutral-600">
                    {item.bedroom ?? "—"} BHK · {item.bathroom ?? "—"} bath · {item.furnishing ?? "—"}
                  </p>
                  <p className="mt-2 text-sm text-neutral-600">
                    Carpet area: {item.carpet_area ?? "—"} sqft
                  </p>
                  <div className="mt-3 flex items-baseline justify-between">
                    <p className="text-lg font-medium">
                      {typeof item.price === "number"
                        ? `₹${item.price.toLocaleString("en-IN")}/mo`
                        : "—"}
                    </p>
                    {typeof item.deposit === "number" ? (
                      <p className="text-xs text-neutral-500">
                        Deposit: ₹{item.deposit.toLocaleString("en-IN")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}