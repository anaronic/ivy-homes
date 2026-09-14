"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { BASE_URL, apiHeaders } from "@/lib/api";
import { getValidToken, logout } from "@/lib/auth";
import { isFavourited, addFavourite, removeFavourite } from "@/lib/favourites";

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
        if (active) {
          setListing(data);
          setSaved(isFavourited(id as string));
        }
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

  function toggleFavourite() {
    if (!id) return;
    if (saved) {
      removeFavourite(id as string);
    } else {
      addFavourite(id as string);
    }
    setSaved(!saved);
  }

  if (loading) return <main className="page-shell px-4 py-6 text-slate-700">Loading…</main>;
  if (error || !listing)
    return <main className="page-shell px-4 py-6 text-red-700">{error || "Not found."}</main>;

  return (
    <>
      <Navbar />
      <main className="page-shell px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => router.push("/listings")}
              className="inline-flex items-center self-start text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to listings
            </button>
          </div>

          <div className="surface-card rounded-[28px] p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="section-label">{listing.locality}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                {listing.apartment_name ?? listing.listing_id}
              </h1>
            </div>
            <button
              onClick={toggleFavourite}
              className={`rounded-full border px-3.5 py-2 text-sm font-semibold ${
                saved
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {saved ? "♥ Saved" : "♡ Save"}
            </button>
          </div>

          <p className="mt-4 text-2xl font-semibold text-slate-900">
            {typeof listing.price === "number"
              ? `₹${listing.price.toLocaleString("en-IN")}`
              : "Price unavailable"}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-700 sm:grid-cols-3">
            <div className="grid-card-metric"><span className="text-slate-500">Type:</span> {listing.property_type ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">BHK:</span> {listing.bedroom ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">Bath:</span> {listing.bathroom ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">Floor:</span> {listing.floor ?? "—"}/{listing.total_floors ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">Carpet area:</span> {listing.carpet_area ?? "—"} sqft</div>
            <div className="grid-card-metric"><span className="text-slate-500">Super area:</span> {listing.super_built_up_area ?? "—"} sqft</div>
            <div className="grid-card-metric"><span className="text-slate-500">Furnishing:</span> {listing.furnishing ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">Facing:</span> {listing.facing_direction ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">Parking:</span> {listing.covered_parking ?? "—"}</div>
          </div>

          {listing.description ? (
            <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-700">
              {listing.description}
            </p>
          ) : null}

          <div className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-600">
            <p>Posted by {listing.posted_by_name ?? "—"} ({listing.posted_by ?? "—"})</p>
            <p className="mt-1">{listing.posted_by_contact ?? "—"}</p>
          </div>
          </div>
        </div>
      </main>
    </>
  );
}
