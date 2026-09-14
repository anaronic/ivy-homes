"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BASE_URL, apiHeaders } from "@/lib/api";
import { getValidToken, logout } from "@/lib/auth";

type Listing = {
  listing_id: string;
  apartment_name?: string;
  locality?: string;
  property_type?: string;
  bedroom?: number;
  bathroom?: number;
  balcony?: number;
  floor?: number;
  total_floors?: number;
  furnishing?: string;
  facing_direction?: string;
  covered_parking?: number;
  price?: number;
  carpet_area?: number;
  super_built_up_area?: number;
  posted_by?: string;
  posted_by_name?: string;
  posted_by_contact?: string;
  description?: string;
  posted_at?: string;
  is_live?: boolean;
  is_verified?: boolean;
};

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

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

        const res = await fetch(`${BASE_URL}/v1/listings/${id}`, {
          headers: apiHeaders(token),
        });
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        if (active) setListing(data);
      } catch (err) {
        console.error("Listing detail load failed:", err);
        if (active) setError("Unable to load this listing.");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      active = false;
    };
  }, [id, router]);

  async function toggleFavourite() {
    const token = await getValidToken();
    if (!token) return;

    try {
      if (!saved) {
        await fetch(`${BASE_URL}/v1/favourites`, {
          method: "POST",
          headers: { ...apiHeaders(token), "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      } else {
        await fetch(`${BASE_URL}/v1/favourites/${id}`, {
          method: "DELETE",
          headers: apiHeaders(token),
        });
      }
      setSaved(!saved);
    } catch (err) {
      console.error("Favourite toggle failed:", err);
    }
  }

  if (loading) return <main className="p-6">Loading…</main>;
  if (error || !listing) return <main className="p-6 text-red-700">{error || "Not found."}</main>;

  return (
    <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => router.push("/listings")}
          className="mb-4 text-sm text-neutral-500 hover:underline"
        >
          ← Back to listings
        </button>

        <div className="rounded border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            {listing.locality}
          </p>
          <div className="mt-1 flex items-start justify-between">
            <h1 className="text-2xl font-bold">
              {listing.apartment_name ?? listing.listing_id}
            </h1>
            <button
              onClick={toggleFavourite}
              className={`rounded border px-3 py-1 text-sm ${
                saved ? "border-red-400 bg-red-50 text-red-600" : "border-neutral-300"
              }`}
            >
              {saved ? "♥ Saved" : "♡ Save"}
            </button>
          </div>

          <p className="mt-2 text-xl font-semibold">
            {typeof listing.price === "number"
              ? `₹${listing.price.toLocaleString("en-IN")}`
              : "Price unavailable"}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-neutral-700 sm:grid-cols-3">
            <div><span className="text-neutral-500">Type:</span> {listing.property_type ?? "—"}</div>
            <div><span className="text-neutral-500">BHK:</span> {listing.bedroom ?? "—"}</div>
            <div><span className="text-neutral-500">Bath:</span> {listing.bathroom ?? "—"}</div>
            <div><span className="text-neutral-500">Floor:</span> {listing.floor ?? "—"}/{listing.total_floors ?? "—"}</div>
            <div><span className="text-neutral-500">Carpet area:</span> {listing.carpet_area ?? "—"} sqft</div>
            <div><span className="text-neutral-500">Super area:</span> {listing.super_built_up_area ?? "—"} sqft</div>
            <div><span className="text-neutral-500">Furnishing:</span> {listing.furnishing ?? "—"}</div>
            <div><span className="text-neutral-500">Facing:</span> {listing.facing_direction ?? "—"}</div>
            <div><span className="text-neutral-500">Parking:</span> {listing.covered_parking ?? "—"}</div>
          </div>

          {listing.description ? (
            <p className="mt-4 text-sm text-neutral-700">{listing.description}</p>
          ) : null}

          <div className="mt-4 border-t pt-4 text-sm text-neutral-600">
            <p>Posted by {listing.posted_by_name ?? "—"} ({listing.posted_by ?? "—"})</p>
            <p>{listing.posted_by_contact ?? "—"}</p>
          </div>
        </div>
      </div>
    </main>
  );
}