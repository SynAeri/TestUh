"use client";

import { useState } from "react";
import NavBar from "@/components/nav-bar";
import AppDetailModal from "@/components/app-detail-modal";
import { MOCK_APPS, type SaaSApp } from "@/lib/mock-data";

function DonutChart({
  value,
  total,
}: {
  value: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : value / total;
  const isLow = pct < 0.6;
  const color = isLow ? "#f87171" : "#34d399";
  const r = 32;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#1e293b" strokeWidth="9" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
      />
      <text
        x="40"
        y="40"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize="13"
        fontWeight="700"
        fontFamily="var(--font-space-grotesk), sans-serif"
      >
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

function UsageBar({ minutes }: { minutes: number }) {
  const max = 120;
  const pct = Math.min(minutes / max, 1);
  const color =
    pct > 0.7
      ? "bg-emerald-400"
      : pct > 0.35
        ? "bg-amber-400"
        : "bg-rose-500";
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10">
      <div
        className={`h-full rounded-full ${color} transition-all`}
        style={{ width: `${pct * 100}%` }}
      />
    </div>
  );
}

function AppCard({
  app,
  onOpen,
}: {
  app: SaaSApp;
  onOpen: (app: SaaSApp) => void;
}) {
  const removalCount = app.users.filter((u) => u.recommended_for_removal).length;
  const utilizationPct = Math.round((app.active_seats / app.total_seats) * 100);
  const isUnderutilized = utilizationPct < 60;

  return (
    <button
      type="button"
      onClick={() => onOpen(app)}
      className="group w-full rounded-2xl border border-white/8 bg-white/3 p-5 text-left transition-all duration-200 hover:border-sky-400/20 hover:bg-sky-400/3 hover:shadow-lg"
    >
      {/* App header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl">
            {app.logo_emoji}
          </div>
          <div>
            <p className="font-semibold text-white">{app.name}</p>
            <p className="text-xs capitalize text-slate-500">{app.category}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isUnderutilized && (
            <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              Underutilised
            </span>
          )}
          {removalCount > 0 && (
            <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-300">
              {removalCount} to remove
            </span>
          )}
        </div>
      </div>

      {/* Seat donut + stats */}
      <div className="flex items-center gap-5">
        <DonutChart value={app.active_seats} total={app.total_seats} />
        <div className="flex-1 space-y-2.5">
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <p className="text-xs text-slate-500">Seats in use</p>
              <p className="text-sm font-bold text-white">
                {app.active_seats}
                <span className="text-xs font-normal text-slate-500">
                  {" "}/ {app.total_seats}
                </span>
              </p>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${
                  isUnderutilized ? "bg-rose-400" : "bg-emerald-400"
                }`}
                style={{
                  width: `${(app.active_seats / app.total_seats) * 100}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <p className="text-xs text-slate-500">Avg daily usage</p>
              <p className="text-sm font-bold text-white">
                {app.avg_daily_usage_minutes}
                <span className="text-xs font-normal text-slate-500"> min</span>
              </p>
            </div>
            <UsageBar minutes={app.avg_daily_usage_minutes} />
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-4">
        <p className="text-xs text-slate-500">
          {app.users.length} user{app.users.length !== 1 ? "s" : ""}
        </p>
        <p className="text-[11px] text-sky-400/70 transition group-hover:text-sky-400">
          View details →
        </p>
      </div>
    </button>
  );
}

export default function TimePage() {
  const [selectedApp, setSelectedApp] = useState<SaaSApp | null>(null);

  const sorted = [...MOCK_APPS].sort(
    (a, b) => b.avg_daily_usage_minutes - a.avg_daily_usage_minutes,
  );

  const totalActiveUsers = MOCK_APPS.reduce((s, a) => s + a.active_seats, 0);
  const totalSeats = MOCK_APPS.reduce((s, a) => s + a.total_seats, 0);
  const avgUtilization = Math.round((totalActiveUsers / totalSeats) * 100);
  const underutilizedCount = MOCK_APPS.filter(
    (a) => a.active_seats / a.total_seats < 0.6,
  ).length;

  return (
    <>
      <NavBar />

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-60 right-1/4 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-[140px]" />
      </div>

      <main className="relative mx-auto w-full max-w-[1440px] px-6 py-8 lg:px-14">
        {/* Summary */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total tools", value: MOCK_APPS.length, accent: "text-white", sub: "in your stack" },
            { label: "Active users", value: totalActiveUsers, accent: "text-sky-400", sub: `of ${totalSeats} seats` },
            { label: "Avg utilisation", value: `${avgUtilization}%`, accent: avgUtilization < 70 ? "text-amber-400" : "text-emerald-400", sub: "across all tools" },
            { label: "Underutilised", value: underutilizedCount, accent: "text-rose-400", sub: "tools below 60%" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/8 bg-white/3 p-4"
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {s.label}
              </p>
              <p className={`mt-1 text-2xl font-bold ${s.accent}`}>{s.value}</p>
              <p className="mt-0.5 text-[11px] text-slate-600">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            App Usage
          </h3>
          <span className="text-[11px] text-slate-600">
            Sorted by daily usage · click to view users
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((app) => (
            <AppCard key={app.id} app={app} onOpen={setSelectedApp} />
          ))}
        </div>
      </main>

      {selectedApp && (
        <AppDetailModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
        />
      )}
    </>
  );
}
