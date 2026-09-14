"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BASE_URL, apiHeaders } from "@/lib/api";
import { getValidToken, logout } from "@/lib/auth";

type Rental = {
  listing_id: string;
  apartment_name?: string;
  locality?: string;
  property_type?: string;
  bedroom?: number;
  bathroom?: number;
  floor?: number;
  total_floors?: number;
  furnishing?: string;
  facing_direction?: string;
  price?: number;
  deposit?: number;
  maintenance?: number;
  carpet_area?: number;
  super_builtup_area?: number;
  posted_by?: string;
  posted_by_name?: string;
  posted_by_contact?: string;
  description?: string;
};

export default function RentalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

        const res = await fetch(`${BASE_URL}/v1/rentals/${id}`, {
          headers: apiHeaders(token),
        });
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        if (active) setRental(data);
      } catch (err) {
        console.error("Rental detail load failed:", err);
        if (active) setError("Unable to load this rental.");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      active = false;
    };
  }, [id, router]);

  if (loading) return <main className="p-6">Loading…</main>;
  if (error || !rental) return <main className="p-6 text-red-700">{error || "Not found."}</main>;

  return (
    <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => router.push("/rentals")}
          className="mb-4 text-sm text-neutral-500 hover:underline"
        >
          ← Back to rentals
        </button>

        <div className="rounded border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            {rental.locality}
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            {rental.apartment_name ?? rental.listing_id}
          </h1>

          <div className="mt-2 flex items-baseline gap-4">
            <p className="text-xl font-semibold">
              {typeof rental.price === "number"
                ? `₹${rental.price.toLocaleString("en-IN")}/mo`
                : "—"}
            </p>
            {typeof rental.deposit === "number" ? (
              <p className="text-sm text-neutral-500">
                Deposit: ₹{rental.deposit.toLocaleString("en-IN")}
              </p>
            ) : null}
            {typeof rental.maintenance === "number" ? (
              <p className="text-sm text-neutral-500">
                Maintenance: ₹{rental.maintenance.toLocaleString("en-IN")}/mo
              </p>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-neutral-700 sm:grid-cols-3">
            <div><span className="text-neutral-500">Type:</span> {rental.property_type ?? "—"}</div>
            <div><span className="text-neutral-500">BHK:</span> {rental.bedroom ?? "—"}</div>
            <div><span className="text-neutral-500">Bath:</span> {rental.bathroom ?? "—"}</div>
            <div><span className="text-neutral-500">Floor:</span> {rental.floor ?? "—"}/{rental.total_floors ?? "—"}</div>
            <div><span className="text-neutral-500">Carpet area:</span> {rental.carpet_area ?? "—"} sqft</div>
            <div><span className="text-neutral-500">Super area:</span> {rental.super_builtup_area ?? "—"} sqft</div>
            <div><span className="text-neutral-500">Furnishing:</span> {rental.furnishing ?? "—"}</div>
            <div><span className="text-neutral-500">Facing:</span> {rental.facing_direction ?? "—"}</div>
          </div>

          {rental.description ? (
            <p className="mt-4 text-sm text-neutral-700">{rental.description}</p>
          ) : null}

          <div className="mt-4 border-t pt-4 text-sm text-neutral-600">
            <p>Posted by {rental.posted_by_name ?? "—"} ({rental.posted_by ?? "—"})</p>
            <p>{rental.posted_by_contact ?? "—"}</p>
          </div>
        </div>
      </div>
    </main>
  );
}