"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
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
  const [search, setSearch] = useState("");

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
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const haystack = [
        item.apartment_name,
        item.listing_id,
        item.locality,
        item.property_type,
        item.furnishing,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query && !haystack.includes(query)) return false;
      if (locality && item.locality?.toLowerCase() !== locality.toLowerCase()) return false;
      if (bedroom && item.bedroom !== Number(bedroom)) return false;
      if (furnishing && item.furnishing !== furnishing) return false;
      if (minPrice && (item.price ?? 0) < Number(minPrice)) return false;
      if (maxPrice && (item.price ?? 0) > Number(maxPrice)) return false;
      return true;
    });
  }, [items, locality, bedroom, furnishing, minPrice, maxPrice, search]);

  const localities = useMemo(
    () => Array.from(new Set(items.map((i) => i.locality).filter(Boolean))).sort(),
    [items]
  );

  return (
    <>
      <Navbar />
      <main className="page-shell px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-3">
            <p className="section-label">Ivy Homes</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Listings</h1>
          </div>

          <div className="surface-card mb-6 rounded-2xl p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search listings"
              className="input-shell xl:col-span-2"
              aria-label="Search listings"
            />

            <select
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              className="input-shell"
            >
              <option value="">All localities</option>
              {localities.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>

            <select
              value={bedroom}
              onChange={(e) => setBedroom(e.target.value)}
              className="input-shell"
            >
              <option value="">Any BHK</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n} BHK</option>
              ))}
            </select>

            <select
              value={furnishing}
              onChange={(e) => setFurnishing(e.target.value)}
              className="input-shell"
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
              className="input-shell"
            />
            <input
              type="number"
              placeholder="Max price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="input-shell"
            />
          </div>
        </div>

          {error ? (
            <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="surface-card rounded-2xl p-6 text-sm text-slate-600">Loading listings…</div>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">{filtered.length}</span> of <span className="font-semibold text-slate-800">{items.length}</span> listings
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {filtered.length === 0 ? (
                  <div className="surface-card rounded-2xl p-6 text-slate-600">No listings match these filters.</div>
                ) : (
                  filtered.map((item) => (
                    <Link
                      key={item.listing_id}
                      href={`/listings/${item.listing_id}`}
                      className="card-link"
                    >
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-slate-500">
                        {item.locality ?? "Locality unavailable"}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                        {item.apartment_name ?? item.listing_id}
                      </h2>
                      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">{item.bedroom ?? "—"} BHK</span>
                        <span>{item.furnishing ?? "—"}</span>
                      </div>
                      <p className="mt-4 text-lg font-semibold text-slate-900">
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
    </>
  );
}