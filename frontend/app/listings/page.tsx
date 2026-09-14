"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BASE_URL, apiHeaders } from "@/lib/api";
import { getValidToken, logout } from "@/lib/auth";

type Listing = {
  listing_id: string;
  apartment_name?: string;
  locality?: string;
  property_type?: string;
  bedroom?: number;
  bathroom?: number;
  furnishing?: string;
  price?: number;
  carpet_area?: number;
  is_live?: boolean;
};

const PAGE_SIZE = 50; // server returns exactly 50/page regardless of `limit` requested
const PAGES_TO_FETCH = 15; // enough to reliably surface all ~50 unique listings given heavy duplication

export default function ListingsPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  // filters
  const [locality, setLocality] = useState("");
  const [bedroom, setBedroom] = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    let active = true;

    async function loadListings() {
      try {
        const token = await getValidToken();
        if (!token) {
          logout();
          router.replace("/login");
          return;
        }

        const seen = new Set<string>();
        const unique: Listing[] = [];

        for (let page = 1; page <= PAGES_TO_FETCH; page++) {
          const res = await fetch(
            `${BASE_URL}/v1/listings?page=${page}&limit=${PAGE_SIZE}`,
            { headers: apiHeaders(token) }
          );
          if (!res.ok) throw new Error(`Listings request failed: ${res.status}`);

          const data = await res.json();
          const results: Listing[] = Array.isArray(data?.results) ? data.results : [];

          for (const l of results) {
            if (l.listing_id && !seen.has(l.listing_id)) {
              seen.add(l.listing_id);
              unique.push(l);
            }
          }

          // stop early once we've likely captured everything unique
          if (results.length === 0) break;
        }

        if (active) setItems(unique);
      } catch (err) {
        console.error("Listings load failed:", err);
        if (active) setError("Unable to load listings right now.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadListings();
    return () => {
      active = false;
    };
  }, [router]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (locality && item.locality?.toLowerCase() !== locality.toLowerCase()) return false;
      if (bedroom && item.bedroom !== Number(bedroom)) return false;
      if (furnishing && item.furnishing !== furnishing) return false;
      if (minPrice && (item.price ?? 0) < Number(minPrice)) return false;
      if (maxPrice && (item.price ?? 0) > Number(maxPrice)) return false;
      return true;
    });
  }, [items, locality, bedroom, furnishing, minPrice, maxPrice]);

  const localities = useMemo(
    () => Array.from(new Set(items.map((i) => i.locality).filter(Boolean))).sort(),
    [items]
  );

  return (
    <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
              Ivy Homes
            </p>
            <h1 className="text-3xl font-bold">Listings</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/favourites"
              className="rounded border border-neutral-300 px-3 py-2 text-sm"
            >
              Saved
            </Link>
            <Link
              href="/rentals"
              className="rounded border border-neutral-300 px-3 py-2 text-sm"
            >
              Rentals
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

        {/* filters */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <select
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            className="rounded border px-2 py-2 text-sm"
          >
            <option value="">All localities</option>
            {localities.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          <select
            value={bedroom}
            onChange={(e) => setBedroom(e.target.value)}
            className="rounded border px-2 py-2 text-sm"
          >
            <option value="">Any BHK</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} BHK</option>
            ))}
          </select>

          <select
            value={furnishing}
            onChange={(e) => setFurnishing(e.target.value)}
            className="rounded border px-2 py-2 text-sm"
          >
            <option value="">Any furnishing</option>
            <option value="unfurnished">Unfurnished</option>
            <option value="semi-furnished">Semi-furnished</option>
            <option value="fully-furnished">Fully-furnished</option>
          </select>

          <input
            type="number"
            placeholder="Min price"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="rounded border px-2 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Max price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="rounded border px-2 py-2 text-sm"
          />
        </div>

        {error ? (
          <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-neutral-600">Loading listings…</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-neutral-500">
              {filtered.length} of {items.length} listings
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.length === 0 ? (
                <p className="text-neutral-600">No listings match these filters.</p>
              ) : (
                filtered.map((item) => (
                  <Link
                    key={item.listing_id}
                    href={`/listings/${item.listing_id}`}
                    className="block rounded border border-neutral-200 bg-white p-4 shadow-sm hover:border-neutral-400"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      {item.locality ?? "Locality unavailable"}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">
                      {item.apartment_name ?? item.listing_id}
                    </h2>
                    <div className="mt-3 flex items-center justify-between text-sm text-neutral-600">
                      <span>{item.bedroom ?? "—"} BHK</span>
                      <span>{item.furnishing ?? "—"}</span>
                    </div>
                    <p className="mt-3 text-lg font-medium">
                      {typeof item.price === "number"
                        ? `₹${item.price.toLocaleString("en-IN")}`
                        : "Price unavailable"}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}