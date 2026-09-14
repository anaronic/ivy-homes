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
    <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Saved Listings</h1>
          <Link href="/listings" className="text-sm text-neutral-500 hover:underline">
            ← Back to listings
          </Link>
        </div>

        {error ? <p className="text-red-700">{error}</p> : null}
        {loading ? (
          <p className="text-neutral-600">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-neutral-600">No saved listings yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <Link
                key={item.listing_id}
                href={`/listings/${item.listing_id}`}
                className="block rounded border border-neutral-200 bg-white p-4 shadow-sm hover:border-neutral-400"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                  {item.locality}
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  {item.apartment_name ?? item.listing_id}
                </h2>
                <p className="mt-2 text-sm text-neutral-600">{item.bedroom ?? "—"} BHK · {item.furnishing ?? "—"}</p>
                <p className="mt-2 text-lg font-medium">
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