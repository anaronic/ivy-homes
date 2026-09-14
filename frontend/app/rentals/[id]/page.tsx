"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

  if (loading) return <main className="page-shell px-4 py-6 text-slate-700">Loading…</main>;
  if (error || !rental) return <main className="page-shell px-4 py-6 text-red-700">{error || "Not found."}</main>;

  return (
    <>
      <Navbar />
      <main className="page-shell px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => router.push("/rentals")}
              className="inline-flex items-center self-start text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to rentals
            </button>
          </div>

          <div className="surface-card rounded-[28px] p-5 sm:p-6">
          <p className="section-label">{rental.locality}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {rental.apartment_name ?? rental.listing_id}
          </h1>

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <p className="text-2xl font-semibold text-slate-900">
              {typeof rental.price === "number"
                ? `₹${rental.price.toLocaleString("en-IN")}/mo`
                : "—"}
            </p>
            {typeof rental.deposit === "number" ? (
              <p className="text-sm text-slate-500">
                Deposit: ₹{rental.deposit.toLocaleString("en-IN")}
              </p>
            ) : null}
            {typeof rental.maintenance === "number" ? (
              <p className="text-sm text-slate-500">
                Maintenance: ₹{rental.maintenance.toLocaleString("en-IN")}/mo
              </p>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-700 sm:grid-cols-3">
            <div className="grid-card-metric"><span className="text-slate-500">Type:</span> {rental.property_type ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">BHK:</span> {rental.bedroom ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">Bath:</span> {rental.bathroom ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">Floor:</span> {rental.floor ?? "—"}/{rental.total_floors ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">Carpet area:</span> {rental.carpet_area ?? "—"} sqft</div>
            <div className="grid-card-metric"><span className="text-slate-500">Super area:</span> {rental.super_builtup_area ?? "—"} sqft</div>
            <div className="grid-card-metric"><span className="text-slate-500">Furnishing:</span> {rental.furnishing ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">Facing:</span> {rental.facing_direction ?? "—"}</div>
          </div>

          {rental.description ? (
            <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-700">{rental.description}</p>
          ) : null}

          <div className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-600">
            <p>Posted by {rental.posted_by_name ?? "—"} ({rental.posted_by ?? "—"})</p>
            <p className="mt-1">{rental.posted_by_contact ?? "—"}</p>
          </div>
          </div>
        </div>
      </main>
    </>
  );
}