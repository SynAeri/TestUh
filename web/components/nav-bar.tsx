"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIncident } from "@/lib/incident-store";

const tabs = [
  { label: "Overview", href: "/" },
  { label: "Decisions", href: "/decisions" },
  { label: "Incidents", href: "/incidents" },
  { label: "Connections", href: "/connections" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { incident } = useIncident();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur-md shadow-sm shadow-stone-100/60">
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-3 lg:px-10">
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-sky-500 shadow-sm shadow-violet-200">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900 leading-none">Nexus</p>
            <p className="text-[10px] text-stone-400 leading-none mt-0.5">Decision Intelligence</p>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex flex-1 items-center gap-0.5">
          {tabs.map((tab) => {
            const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            const isIncidentTab = tab.href === "/incidents";
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "text-violet-700 bg-violet-50"
                    : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                }`}
              >
                {tab.label}
                {isIncidentTab && incident && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                    1
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Status */}
        {incident ? (
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
            <span className="text-xs font-medium text-rose-600">1 active incident</span>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">All systems operational</span>
          </div>
        )}
      </div>
    </header>
  );
}
