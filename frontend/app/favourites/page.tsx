"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BASE_URL, apiHeaders } from "@/lib/api";
import { getValidToken, logout } from "@/lib/auth";
import { getFavouriteIds } from "@/lib/favourites";

type Listing = {
  listing_id: string;
  apartment_name?: string;
  locality?: string;
  bedroom?: number;
  furnishing?: string;
  price?: number;
};

export default function FavouritesPage() {
  const [items, setItems] = useState<Listing[]>([]);
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

        const ids = getFavouriteIds();
        const results = await Promise.all(
          ids.map(async (id) => {
            const res = await fetch(`${BASE_URL}/v1/listings/${id}`, {
              headers: apiHeaders(token),
            });
            return res.ok ? res.json() : null;
          })
        );

        if (active) setItems(results.filter(Boolean) as Listing[]);
      } catch (err) {
        console.error("Favourites load failed:", err);
        if (active) setError("Unable to load favourites.");
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
    <main className="page-shell px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label">Saved</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Saved Listings</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/listings" className="nav-button">Listings</Link>
            <Link href="/rentals" className="nav-button">Rentals</Link>
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="nav-button nav-button--primary"
            >
              Log out
            </button>
          </div>
        </div>

        {error ? <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        {loading ? (
          <div className="surface-card rounded-2xl p-6 text-sm text-slate-600">Loading…</div>
        ) : items.length === 0 ? (
          <div className="surface-card rounded-2xl p-6 text-slate-600">No saved listings yet.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <Link
                key={item.listing_id}
                href={`/listings/${item.listing_id}`}
                className="card-link"
              >
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-slate-500">
                  {item.locality}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                  {item.apartment_name ?? item.listing_id}
                </h2>
                <p className="mt-2 text-sm text-slate-600">{item.bedroom ?? "—"} BHK · {item.furnishing ?? "—"}</p>
                <p className="mt-4 text-lg font-semibold text-slate-900">
                  {typeof item.price === "number" ? `₹${item.price.toLocaleString("en-IN")}` : "—"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}