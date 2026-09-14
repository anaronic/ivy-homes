"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BASE_URL, apiHeaders } from "@/lib/api";
import { getValidToken, logout } from "@/lib/auth";

type Project = {
  project_id: string;
  apartment_name?: string;
  developer_name?: string;
  locality?: string;
  project_status?: string;
  total_units?: number;
  total_towers?: number;
  total_floors?: number;
  launch_date?: string;
  possession_date?: string;
  rera_number?: string;
  min_area_sqft?: number;
  max_area_sqft?: number;
  total_listings?: number;
  price_min?: number;
  price_max?: number;
  amenities?: string[];
};

function toRupees(value: number): number {
  return value < 10 ? value * 1e7 : value * 1e5;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
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

        const res = await fetch(`${BASE_URL}/v1/projects/${id}`, {
          headers: apiHeaders(token),
        });
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        if (active) setProject(data);
      } catch (err) {
        console.error("Project detail load failed:", err);
        if (active) setError("Unable to load this project.");
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
  if (error || !project) return <main className="p-6 text-red-700">{error || "Not found."}</main>;

  const realMin = typeof project.price_min === "number" ? toRupees(project.price_min) : null;
  const realMax = typeof project.price_max === "number" ? toRupees(project.price_max) : null;

  return (
    <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            onClick={() => router.push("/projects")}
            className="text-sm text-neutral-500 hover:underline"
          >
            ← Back to projects
          </button>
          <div className="flex items-center gap-3">
            <Link href="/listings" className="rounded border border-neutral-300 px-3 py-2 text-sm">
              Listings
            </Link>
            <Link href="/rentals" className="rounded border border-neutral-300 px-3 py-2 text-sm">
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

        <div className="rounded border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            {project.locality}
          </p>
          <h1 className="mt-1 text-2xl font-bold">{project.apartment_name}</h1>
          <p className="mt-1 text-sm text-neutral-600">{project.developer_name}</p>

          {realMin !== null && realMax !== null ? (
            <p className="mt-3 text-xl font-semibold">
              ₹{realMin.toLocaleString("en-IN")} – ₹{realMax.toLocaleString("en-IN")}
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-neutral-700 sm:grid-cols-3">
            <div><span className="text-neutral-500">Status:</span> <span className="capitalize">{project.project_status}</span></div>
            <div><span className="text-neutral-500">Units:</span> {project.total_units ?? "—"}</div>
            <div><span className="text-neutral-500">Towers:</span> {project.total_towers ?? "—"}</div>
            <div><span className="text-neutral-500">Floors:</span> {project.total_floors ?? "—"}</div>
            <div><span className="text-neutral-500">Launch:</span> {project.launch_date ?? "—"}</div>
            <div><span className="text-neutral-500">Possession:</span> {project.possession_date ?? "—"}</div>
            <div><span className="text-neutral-500">Area range:</span> {project.min_area_sqft ?? "—"}–{project.max_area_sqft ?? "—"} sqft</div>
            <div><span className="text-neutral-500">Listings:</span> {project.total_listings ?? "—"}</div>
            <div><span className="text-neutral-500">RERA:</span> {project.rera_number ?? "—"}</div>
          </div>

          {project.amenities?.length ? (
            <div className="mt-4">
              <p className="text-sm text-neutral-500">Amenities</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {project.amenities.map((a) => (
                  <span key={a} className="rounded-full bg-neutral-100 px-3 py-1 text-xs capitalize">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}