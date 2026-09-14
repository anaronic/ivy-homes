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

  if (loading) return <main className="page-shell px-4 py-6 text-slate-700">Loading…</main>;
  if (error || !project) return <main className="page-shell px-4 py-6 text-red-700">{error || "Not found."}</main>;

  const realMin = typeof project.price_min === "number" ? toRupees(project.price_min) : null;
  const realMax = typeof project.price_max === "number" ? toRupees(project.price_max) : null;

  return (
    <main className="page-shell px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => router.push("/projects")}
            className="inline-flex items-center self-start text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to projects
          </button>
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

        <div className="surface-card rounded-[28px] p-5 sm:p-6">
          <p className="section-label">{project.locality}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{project.apartment_name}</h1>
          <p className="mt-1 text-sm text-slate-600">{project.developer_name}</p>

          {realMin !== null && realMax !== null ? (
            <p className="mt-4 text-2xl font-semibold text-slate-900">
              ₹{realMin.toLocaleString("en-IN")} – ₹{realMax.toLocaleString("en-IN")}
            </p>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-700 sm:grid-cols-3">
            <div className="grid-card-metric"><span className="text-slate-500">Status:</span> <span className="capitalize">{project.project_status}</span></div>
            <div className="grid-card-metric"><span className="text-slate-500">Units:</span> {project.total_units ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">Towers:</span> {project.total_towers ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">Floors:</span> {project.total_floors ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">Launch:</span> {project.launch_date ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">Possession:</span> {project.possession_date ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">Area range:</span> {project.min_area_sqft ?? "—"}–{project.max_area_sqft ?? "—"} sqft</div>
            <div className="grid-card-metric"><span className="text-slate-500">Listings:</span> {project.total_listings ?? "—"}</div>
            <div className="grid-card-metric"><span className="text-slate-500">RERA:</span> {project.rera_number ?? "—"}</div>
          </div>

          {project.amenities?.length ? (
            <div className="mt-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Amenities</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {project.amenities.map((a) => (
                  <span key={a} className="badge-soft capitalize">
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