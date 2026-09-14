"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

const navItems = [
  { label: "Listings", href: "/listings" },
  { label: "Rentals", href: "/rentals" },
  { label: "Projects", href: "/projects" },
  { label: "Insights", href: "/insights" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/listings") {
      return pathname === "/listings" || pathname.startsWith("/listings/");
    }
    if (href === "/rentals") {
      return pathname === "/rentals" || pathname.startsWith("/rentals/");
    }
    if (href === "/projects") {
      return pathname === "/projects" || pathname.startsWith("/projects/");
    }
    if (href === "/insights") {
      return pathname === "/insights" || pathname.startsWith("/insights/");
    }
    return false;
  };

  const isSavedActive = pathname === "/favourites" || pathname.startsWith("/favourites/");

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-indigo-500 to-violet-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
              IH
            </div>
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-300">Ivy Homes</p>
              <p className="text-sm font-medium text-white">Property hub</p>
            </div>
          </div>

          <nav className="flex w-full max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.18)] lg:w-auto lg:justify-end lg:overflow-visible">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive(item.href)
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-200 hover:bg-white/8 hover:text-white"
                }`}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/favourites"
              className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                isSavedActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-200 hover:bg-white/8 hover:text-white"
              }`}
            >
              Saved
            </Link>

            <button
              type="button"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-white/10 bg-slate-100 px-3.5 py-2 text-sm font-semibold text-slate-900 transition-colors duration-200 hover:bg-white"
            >
              Log out
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
