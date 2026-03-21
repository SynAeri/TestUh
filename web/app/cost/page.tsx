"use client";

import { useState } from "react";
import NavBar from "@/components/nav-bar";
import AppDetailModal from "@/components/app-detail-modal";
import {
  MOCK_APPS,
  getTotalMonthlyCost,
  getTotalAnnualCost,
  getTotalMonthlySavings,
  type SaaSApp,
} from "@/lib/mock-data";

const pricingBadge: Record<string, { label: string; style: string }> = {
  "per-seat": {
    label: "Per seat",
    style: "bg-sky-500/10 text-sky-300 border-sky-400/20",
  },
  enterprise: {
    label: "Enterprise",
    style: "bg-violet-500/10 text-violet-300 border-violet-400/20",
  },
  "flat-rate": {
    label: "Flat rate",
    style: "bg-slate-500/10 text-slate-300 border-slate-400/20",
  },
};

function CostBar({
  value,
  max,
  savings,
}: {
  value: number;
  max: number;
  savings: number;
}) {
  const totalPct = (value / max) * 100;
  const savingsPct = (savings / max) * 100;
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/8">
      <div
        className="absolute left-0 h-full rounded-full bg-sky-500/60"
        style={{ width: `${totalPct}%` }}
      />
      {savings > 0 && (
        <div
          className="absolute h-full rounded-full bg-emerald-400/80"
          style={{
            left: `${totalPct - savingsPct}%`,
            width: `${savingsPct}%`,
          }}
        />
      )}
    </div>
  );
}

function AppCostCard({
  app,
  maxCost,
  onOpen,
}: {
  app: SaaSApp;
  maxCost: number;
  onOpen: (app: SaaSApp) => void;
}) {
  const badge = pricingBadge[app.pricing_model];
  const costPerActiveSeat =
    app.active_seats > 0
      ? Math.round(app.monthly_cost / app.active_seats)
      : 0;
  const isFree = app.monthly_cost === 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(app)}
      className="group w-full rounded-2xl border border-white/8 bg-white/3 p-5 text-left transition-all hover:border-sky-400/20 hover:bg-sky-400/3"
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg">
            {app.logo_emoji}
          </div>
          <div>
            <p className="font-semibold text-white">{app.name}</p>
            <span
              className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.style}`}
            >
              {badge.label}
            </span>
          </div>
        </div>
        <div className="text-right">
          {isFree ? (
            <p className="text-lg font-bold text-emerald-400">Free</p>
          ) : (
            <>
              <p className="text-lg font-bold text-white">
                ${app.monthly_cost.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500">/month</p>
            </>
          )}
        </div>
      </div>

      {/* Cost bar */}
      {!isFree && (
        <div className="mb-4">
          <CostBar
            value={app.monthly_cost}
            max={maxCost}
            savings={app.potential_monthly_savings}
          />
          {app.potential_monthly_savings > 0 && (
            <p className="mt-1.5 text-[11px] text-emerald-400">
              ↓ Save ${app.potential_monthly_savings}/mo by removing unused seats
            </p>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/6 bg-white/3 p-2.5 text-center">
          <p className="text-base font-bold text-white">
            ${(app.annual_cost / 1000).toFixed(1)}k
          </p>
          <p className="text-[10px] text-slate-500">Annual</p>
        </div>
        <div className="rounded-xl border border-white/6 bg-white/3 p-2.5 text-center">
          <p className="text-base font-bold text-white">
            {app.total_seats}
          </p>
          <p className="text-[10px] text-slate-500">Seats</p>
        </div>
        <div className="rounded-xl border border-white/6 bg-white/3 p-2.5 text-center">
          <p className="text-base font-bold text-white">
            {isFree ? "—" : `$${costPerActiveSeat}`}
          </p>
          <p className="text-[10px] text-slate-500">Per active</p>
        </div>
      </div>

      {/* Renewal */}
      <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3">
        <p className="text-[11px] text-slate-600">
          Renews{" "}
          {new Date(app.renewal_date).toLocaleDateString("en-AU", {
            month: "short",
            year: "numeric",
          })}
        </p>
        <p className="text-[11px] text-sky-400/70 transition group-hover:text-sky-400">
          View users →
        </p>
      </div>
    </button>
  );
}

export default function CostPage() {
  const [selectedApp, setSelectedApp] = useState<SaaSApp | null>(null);

  const totalMonthly = getTotalMonthlyCost(MOCK_APPS);
  const totalAnnual = getTotalAnnualCost(MOCK_APPS);
  const totalSavings = getTotalMonthlySavings(MOCK_APPS);
  const maxCost = Math.max(...MOCK_APPS.map((a) => a.monthly_cost));

  const sorted = [...MOCK_APPS].sort((a, b) => b.monthly_cost - a.monthly_cost);

  const upcomingRenewals = MOCK_APPS.filter((a) => {
    const days =
      (new Date(a.renewal_date).getTime() - Date.now()) / 86_400_000;
    return days > 0 && days < 90;
  }).sort(
    (a, b) =>
      new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime(),
  );

  return (
    <>
      <NavBar />

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-0 h-[500px] w-[500px] rounded-full bg-emerald-500/4 blur-[140px]" />
      </div>

      <main className="relative mx-auto w-full max-w-[1440px] px-6 py-8 lg:px-14">
        {/* Summary */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: "Monthly spend",
              value: `$${totalMonthly.toLocaleString()}`,
              accent: "text-white",
              sub: "all tools combined",
            },
            {
              label: "Annual spend",
              value: `$${(totalAnnual / 1000).toFixed(1)}k`,
              accent: "text-white",
              sub: "projected",
            },
            {
              label: "Monthly savings",
              value: `$${totalSavings.toLocaleString()}`,
              accent: "text-emerald-400",
              sub: "available now",
            },
            {
              label: "Annual savings",
              value: `$${((totalSavings * 12) / 1000).toFixed(0)}k`,
              accent: "text-emerald-400",
              sub: "if actioned today",
            },
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

        {/* Upcoming renewals banner */}
        {upcomingRenewals.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-amber-400">
              Upcoming renewals · next 90 days
            </p>
            <div className="flex flex-wrap gap-3">
              {upcomingRenewals.map((app) => {
                const days = Math.round(
                  (new Date(app.renewal_date).getTime() - Date.now()) /
                    86_400_000,
                );
                return (
                  <div
                    key={app.id}
                    className="flex items-center gap-2 rounded-xl border border-amber-400/15 bg-amber-400/5 px-3 py-2"
                  >
                    <span>{app.logo_emoji}</span>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {app.name}
                      </p>
                      <p className="text-[10px] text-amber-400/70">
                        {days}d · ${app.annual_cost.toLocaleString()}/yr
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Cost Breakdown
          </h3>
          <span className="text-[11px] text-slate-600">
            Green bar = recoverable savings · click to view users
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((app) => (
            <AppCostCard
              key={app.id}
              app={app}
              maxCost={maxCost}
              onOpen={setSelectedApp}
            />
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
