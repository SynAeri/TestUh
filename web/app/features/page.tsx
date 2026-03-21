"use client";

import { useState } from "react";
import NavBar from "@/components/nav-bar";
import AppDetailModal from "@/components/app-detail-modal";
import { MOCK_APPS, type SaaSApp } from "@/lib/mock-data";

const categoryMeta: Record<
  string,
  { label: string; emoji: string; color: string; border: string }
> = {
  documentation: {
    label: "Documentation",
    emoji: "📚",
    color: "text-sky-300",
    border: "border-sky-400/20",
  },
  communication: {
    label: "Communication",
    emoji: "💬",
    color: "text-purple-300",
    border: "border-purple-400/20",
  },
  video: {
    label: "Video",
    emoji: "🎥",
    color: "text-rose-300",
    border: "border-rose-400/20",
  },
  "project-management": {
    label: "Project Mgmt",
    emoji: "📋",
    color: "text-amber-300",
    border: "border-amber-400/20",
  },
};

function OverlapBadge({ feature }: { feature: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-slate-300">
      {feature}
    </span>
  );
}

function OverlapGroupCard({
  apps,
  category,
  onOpen,
}: {
  apps: SaaSApp[];
  category: string;
  onOpen: (app: SaaSApp) => void;
}) {
  const meta = categoryMeta[category] ?? {
    label: category,
    emoji: "📦",
    color: "text-slate-300",
    border: "border-white/10",
  };

  // Collect all shared features across apps in group
  const allFeatures = apps.flatMap((a) => a.overlapping_features);
  const featureCounts = allFeatures.reduce<Record<string, number>>((acc, f) => {
    acc[f] = (acc[f] ?? 0) + 1;
    return acc;
  }, {});
  const sharedFeatures = Object.entries(featureCounts)
    .filter(([, count]) => count >= 2)
    .map(([f]) => f);

  const totalMonthlyCost = apps.reduce((s, a) => s + a.monthly_cost, 0);
  const potentialSavings = apps.reduce(
    (s, a) => s + a.potential_monthly_savings,
    0,
  );

  return (
    <div
      className={`rounded-2xl border ${meta.border} bg-white/3 p-5`}
    >
      {/* Category header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <div>
            <p className={`text-sm font-semibold ${meta.color}`}>
              {meta.label}
            </p>
            <p className="text-[11px] text-slate-500">
              {apps.length} overlapping tools
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-white">
            ${totalMonthlyCost.toLocaleString()}
            <span className="text-[11px] font-normal text-slate-500">/mo</span>
          </p>
          {potentialSavings > 0 && (
            <p className="text-[11px] text-emerald-400">
              Save ${potentialSavings}/mo
            </p>
          )}
        </div>
      </div>

      {/* App pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {apps.map((app) => (
          <button
            key={app.id}
            type="button"
            onClick={() => onOpen(app)}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:border-sky-400/30 hover:bg-sky-400/5"
          >
            <span>{app.logo_emoji}</span>
            {app.name}
          </button>
        ))}
      </div>

      {/* Overlap warning */}
      {sharedFeatures.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-400/15 bg-amber-400/5 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
            {sharedFeatures.length} overlapping feature
            {sharedFeatures.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sharedFeatures.map((f) => (
              <OverlapBadge key={f} feature={f} />
            ))}
          </div>
        </div>
      )}

      {/* Per-app feature breakdown */}
      <div className="space-y-3">
        {apps.map((app) => (
          <div key={app.id} className="rounded-xl border border-white/6 bg-white/3 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm">{app.logo_emoji}</span>
              <p className="text-xs font-semibold text-white">{app.name}</p>
              <div className="ml-auto flex gap-1">
                {app.insight_tags.map((tag) => (
                  <span
                    key={tag}
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${
                      tag === "redundant"
                        ? "bg-rose-500/10 text-rose-300"
                        : tag === "underutilized"
                          ? "bg-amber-500/10 text-amber-300"
                          : tag === "high-cost"
                            ? "bg-orange-500/10 text-orange-300"
                            : tag === "healthy"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {app.overlapping_features.map((f) => (
                <span
                  key={f}
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    sharedFeatures.includes(f)
                      ? "border border-amber-400/20 bg-amber-400/8 text-amber-300"
                      : "border border-white/8 bg-white/4 text-slate-400"
                  }`}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FeaturesPage() {
  const [selectedApp, setSelectedApp] = useState<SaaSApp | null>(null);

  // Group apps by category, only show groups with >1 app (overlap exists)
  const grouped = MOCK_APPS.reduce<Record<string, SaaSApp[]>>((acc, app) => {
    const cat = app.category;
    acc[cat] = [...(acc[cat] ?? []), app];
    return acc;
  }, {});

  const overlapGroups = Object.entries(grouped).filter(
    ([, apps]) => apps.length > 1,
  );
  const soloApps = Object.entries(grouped)
    .filter(([, apps]) => apps.length === 1)
    .map(([, apps]) => apps[0]!);

  const totalOverlappingTools = overlapGroups.reduce(
    (s, [, apps]) => s + apps.length,
    0,
  );
  const totalOverlapCategories = overlapGroups.length;

  return (
    <>
      <NavBar />

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 right-1/3 h-[500px] w-[500px] rounded-full bg-amber-500/4 blur-[140px]" />
      </div>

      <main className="relative mx-auto w-full max-w-[1440px] px-6 py-8 lg:px-14">
        {/* Summary */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: "Total tools",
              value: MOCK_APPS.length,
              accent: "text-white",
              sub: "in your stack",
            },
            {
              label: "Overlap groups",
              value: totalOverlapCategories,
              accent: "text-amber-400",
              sub: "categories with redundancy",
            },
            {
              label: "Overlapping tools",
              value: totalOverlappingTools,
              accent: "text-rose-400",
              sub: "doing the same job",
            },
            {
              label: "Unique tools",
              value: soloApps.length,
              accent: "text-emerald-400",
              sub: "no overlap detected",
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

        {/* Overlap groups */}
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Feature Overlap
          </h3>
          <span className="text-[11px] text-slate-600">
            Amber = shared features · click app to view users
          </span>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {overlapGroups.map(([category, apps]) => (
            <OverlapGroupCard
              key={category}
              apps={apps}
              category={category}
              onOpen={setSelectedApp}
            />
          ))}
        </div>

        {/* Solo apps */}
        {soloApps.length > 0 && (
          <>
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                No Overlap Detected
              </h3>
              <span className="text-[11px] text-slate-600">
                These tools serve unique functions
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {soloApps.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setSelectedApp(app)}
                  className="flex items-center gap-2.5 rounded-2xl border border-emerald-400/15 bg-emerald-400/4 px-4 py-3 text-left transition hover:border-emerald-400/25"
                >
                  <span className="text-xl">{app.logo_emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {app.name}
                    </p>
                    <p className="text-[11px] capitalize text-emerald-400/70">
                      {app.category} · unique
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
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
