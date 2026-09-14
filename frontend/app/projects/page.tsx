"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BASE_URL, apiHeaders } from "@/lib/api";
import { getValidToken, logout } from "@/lib/auth";

type Project = {
  project_id: string;
  apartment_name?: string;
  developer_name?: string;
  locality?: string;
  project_status?: string;
  total_units?: number;
  total_floors?: number;
  min_area_sqft?: number;
  max_area_sqft?: number;
  total_listings?: number;
  price_min?: number;
  price_max?: number;
  amenities?: string[];
};

const PAGE_SIZE = 50;
const PAGES_TO_FETCH = 3; // 50 unique out of 150 raw (3x duplication)

// unit determined by magnitude, not field identity - see findings
function toRupees(value: number): number {
  return value < 10 ? value * 1e7 : value * 1e5;
}

export default function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
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
        const unique: Project[] = [];

        for (let page = 1; page <= PAGES_TO_FETCH; page++) {
          const res = await fetch(
            `${BASE_URL}/v1/projects?page=${page}&limit=${PAGE_SIZE}`,
            { headers: apiHeaders(token) }
          );
          if (!res.ok) throw new Error(`Failed: ${res.status}`);
          const data = await res.json();
          const results: Project[] = Array.isArray(data?.results) ? data.results : [];

          for (const p of results) {
            if (p.project_id && !seen.has(p.project_id)) {
              seen.add(p.project_id);
              unique.push(p);
            }
          }
          if (results.length === 0) break;
        }

        if (active) setItems(unique);
      } catch (err) {
        console.error("Projects load failed:", err);
        if (active) setError("Unable to load projects.");
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
            <h1 className="text-3xl font-bold">Projects</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/listings" className="rounded border border-neutral-300 px-3 py-2 text-sm">
              Listings
            </Link>
            <Link href="/rentals" className="rounded border border-neutral-300 px-3 py-2 text-sm">
              Rentals
            </Link>
            <Link href="/insights" className="rounded border border-neutral-300 px-3 py-2 text-sm">
              Insights
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

        {error ? <p className="text-red-700">{error}</p> : null}
        {loading ? (
          <p className="text-neutral-600">Loading projects…</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-neutral-500">{items.length} projects</p>
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => {
                const realMin = typeof item.price_min === "number" ? toRupees(item.price_min) : null;
                const realMax = typeof item.price_max === "number" ? toRupees(item.price_max) : null;

                return (
                  <Link
                    key={item.project_id}
                    href={`/projects/${item.project_id}`}
                    className="block rounded border border-neutral-200 bg-white p-4 shadow-sm hover:border-neutral-400"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      {item.locality}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">{item.apartment_name}</h2>
                    <p className="mt-1 text-sm text-neutral-600">{item.developer_name}</p>
                    <p className="mt-2 text-sm text-neutral-600 capitalize">
                      {item.project_status} · {item.total_units ?? "—"} units
                    </p>
                    <p className="mt-2 text-sm text-neutral-600">
                      {item.min_area_sqft ?? "—"}–{item.max_area_sqft ?? "—"} sqft
                    </p>
                    {realMin !== null && realMax !== null ? (
                      <p className="mt-2 text-lg font-medium">
                        ₹{realMin.toLocaleString("en-IN")} – ₹{realMax.toLocaleString("en-IN")}
                      </p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}