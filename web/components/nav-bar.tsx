"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Home", href: "/", icon: "⚡" },
  { label: "Time", href: "/time", icon: "⏱" },
  { label: "Cost", href: "/cost", icon: "💰" },
  { label: "Features", href: "/features", icon: "🔀" },
];

export default function NavBar({
  onSeed,
  isSeeding,
  health,
}: {
  onSeed?: () => void;
  isSeeding?: boolean;
  health?: "checking" | "healthy" | "offline";
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#030712]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-6 py-3 lg:px-14">
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 shadow-lg shadow-sky-500/20">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">
              Nexus OS
            </p>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">
              SaaS Intelligence
            </p>
          </div>
        </div>

        {/* Tab nav */}
        <nav className="flex flex-1 items-center gap-1">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                }`}
              >
                <span className="text-[11px]">{tab.icon}</span>
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Health pill */}
          {health && (
            <div
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                health === "healthy"
                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                  : health === "offline"
                    ? "border-rose-400/20 bg-rose-500/10 text-rose-300"
                    : "border-slate-400/20 bg-slate-500/10 text-slate-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  health === "healthy"
                    ? "animate-pulse bg-emerald-400"
                    : health === "offline"
                      ? "bg-rose-500"
                      : "animate-pulse bg-slate-400"
                }`}
              />
              {health === "healthy"
                ? "Live"
                : health === "offline"
                  ? "Offline"
                  : "Connecting"}
            </div>
          )}

          {/* Seed button */}
          {onSeed && (
            <button
              type="button"
              onClick={onSeed}
              disabled={isSeeding}
              className="flex items-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSeeding ? (
                <>
                  <svg
                    className="h-3 w-3 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Seeding…
                </>
              ) : (
                <>
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Seed Data
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
