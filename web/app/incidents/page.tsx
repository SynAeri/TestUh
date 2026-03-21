"use client";

import NavBar from "@/components/nav-bar";
import { useIncident } from "@/lib/incident-store";
import {
  MOCK_DECISIONS,
  getPRById,
  getDeploymentById,
  relativeTime,
} from "@/lib/mock-data";

const SIDEBAR_INCIDENTS = [
  { id: "inc_01", title: "Auth service timeout", pr: "#241", status: "open", time: "2m ago" },
  { id: "inc_02", title: "Payment service degraded", pr: "#239", status: "investigating", time: "1h ago" },
  { id: "inc_03", title: "DB connection pool exhausted", pr: "#237", status: "resolved", time: "3h ago" },
];

const statusConfig: Record<string, { dot: string; label: string; text: string }> = {
  open: { dot: "bg-rose-500", label: "OPEN", text: "text-rose-600" },
  investigating: { dot: "bg-amber-400", label: "INVESTIGATING", text: "text-amber-600" },
  resolved: { dot: "bg-stone-400", label: "RESOLVED", text: "text-stone-400" },
};

function GridBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dot-grid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#d1d5db" fillOpacity="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-violet-50/40" />
    </div>
  );
}

function EmptyState({ onTrigger }: { onTrigger: () => void }) {
  return (
    <div className="relative z-10 flex h-full flex-col items-center justify-center py-32 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200 bg-white shadow-sm">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <p className="mb-1 text-lg font-semibold text-stone-900">No active incidents</p>
      <p className="mb-8 max-w-sm text-sm text-stone-500">All systems operational. Nexus is monitoring 3 integrations.</p>
      <button type="button" onClick={onTrigger}
        className="flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Trigger demo incident
      </button>
    </div>
  );
}

export default function IncidentsPage() {
  const { incident, triggerIncident, resolveIncident } = useIncident();

  const relatedDecisions = incident
    ? incident.related_decision_ids.map((id) => MOCK_DECISIONS.find((d) => d.id === id)).filter(Boolean)
    : [];

  const pr = incident?.related_pr_id ? getPRById(incident.related_pr_id) : null;
  const deploy = incident?.related_deploy_id ? getDeploymentById(incident.related_deploy_id) : null;

  return (
    <>
      <GridBackground />
      <NavBar />

      <main className="relative z-10 mx-auto w-full max-w-[1400px] px-6 py-8 lg:px-10">
        <div className="flex gap-5" style={{ height: "calc(100vh - 120px)" }}>

          {/* ── Sidebar ─────────────────────────────── */}
          <aside className="w-64 shrink-0 flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-stone-900">Incidents</h2>
              <button
                type="button"
                onClick={triggerIncident}
                className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600 shadow-sm transition hover:border-violet-300 hover:text-violet-600"
              >
                + New
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto">
              {SIDEBAR_INCIDENTS.map((inc) => {
                const cfg = statusConfig[inc.status] ?? statusConfig.resolved;
                const isActive = inc.id === "inc_01" && !!incident;
                return (
                  <div
                    key={inc.id}
                    className={`rounded-xl border p-3 cursor-pointer transition ${
                      isActive
                        ? "border-violet-200 bg-white shadow-sm"
                        : "border-stone-200 bg-white/70 hover:bg-white hover:shadow-sm"
                    }`}
                  >
                    <div className={`mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider ${cfg.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${inc.status === "open" ? "animate-pulse" : ""}`} />
                      {cfg.label}
                    </div>
                    <p className={`text-xs font-semibold leading-4 ${inc.status === "resolved" ? "text-stone-400" : "text-stone-900"}`}>
                      {inc.title}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-stone-400">PR {inc.pr} · {inc.time}</p>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* ── Main content ────────────────────────── */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            {!incident ? (
              <EmptyState onTrigger={triggerIncident} />
            ) : (
              <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden flex flex-col h-full">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-4">
                  <div>
                    <h1 className="text-base font-bold text-stone-900">{incident.title}</h1>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {incident.affected_service} · PR #{pr?.number} · Opened {relativeTime(incident.triggered_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={resolveIncident}
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50">
                      Mark resolved
                    </button>
                    <button type="button"
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700">
                      Draft Fix →
                    </button>
                  </div>
                </div>

                {/* Sections */}
                <div className="flex-1 overflow-y-auto divide-y divide-stone-100">

                  {/* AI Session Context */}
                  <div className="px-6 py-5">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-stone-400">AI Session Context</p>
                    <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                      <p className="mb-3 text-sm text-stone-700 leading-6 italic">
                        &quot;{incident.ai_analysis}&quot;
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-violet-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-violet-600">
                          {relatedDecisions.length} decisions logged
                        </span>
                        <span className="rounded-full border border-sky-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-sky-600">
                          {relatedDecisions.flatMap((d) => d?.files_changed ?? []).length} files changed
                        </span>
                        {relatedDecisions.some((d) => d?.impact === "high") && (
                          <span className="rounded-full border border-rose-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-rose-600">
                            1 high-impact decision
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Deployment */}
                  {deploy && (
                    <div className="px-6 py-5">
                      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-stone-400">Deployment</p>
                      <div className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
                        <p className="font-mono text-sm text-stone-700">
                          {deploy.environment} · sha{" "}
                          <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[11px]">{deploy.commit_sha}</span>
                          {" "}· deployed by{" "}
                          <span className="font-semibold">jordan</span>
                        </p>
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600">
                          failed
                        </span>
                      </div>
                      <div className="mt-3 rounded-xl border border-stone-200 bg-stone-900 px-4 py-3 font-mono text-[11px] leading-5">
                        <p className="text-stone-500">[10:23:33] Deployment successful → {deploy.environment}</p>
                        <p className="text-rose-400 mt-1">[12:47:02] ERROR 500 on POST /api/auth/refresh</p>
                        <p className="text-rose-400">[12:47:03] JsonWebTokenError: invalid signature</p>
                        <p className="text-rose-400">[12:47:03] at /src/middleware/auth.ts:18</p>
                      </div>
                    </div>
                  )}

                  {/* Linked PR */}
                  {pr && (
                    <div className="px-6 py-5">
                      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-stone-400">Linked PR</p>
                      <div className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
                        <p className="text-sm text-stone-700">
                          PR <span className="font-semibold">#{pr.number}</span> —{" "}
                          <a href={pr.url} target="_blank" rel="noopener noreferrer"
                            className="text-violet-600 hover:underline">{pr.title}</a>
                        </p>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600">
                          merged
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Fix suggestion */}
                  <div className="px-6 py-5">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-stone-400">AI Fix Suggestion</p>
                    <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4">
                      <pre className="whitespace-pre-wrap font-mono text-xs leading-6 text-stone-600">{incident.ai_fix_suggestion}</pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right panel ─────────────────────────── */}
          {incident && (
            <aside className="w-56 shrink-0 space-y-4">
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-stone-400">Responder</p>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-violet-200 bg-gradient-to-br from-violet-100 to-sky-100 text-xs font-bold text-violet-700">
                    JC
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-900">{incident.suggested_engineer}</p>
                    <p className="text-[10px] text-stone-400">AI suggested</p>
                  </div>
                </div>
                <p className="text-[11px] leading-4 text-stone-500">{incident.suggested_engineer_reason.slice(0, 80)}…</p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-stone-400">Timeline</p>
                <div className="space-y-0">
                  {[
                    { icon: "⚡", label: "AI session", color: "bg-violet-50 border-violet-200 text-violet-500", isLast: false },
                    { icon: "↗", label: `PR #${pr?.number ?? "?"}`, color: "bg-stone-50 border-stone-200 text-stone-400", isLast: false },
                    { icon: "▲", label: "Deployed", color: "bg-emerald-50 border-emerald-200 text-emerald-500", isLast: false },
                    { icon: "🔴", label: "Incident", color: "bg-rose-50 border-rose-200 text-rose-500", isLast: true },
                  ].map((step, i) => (
                    <div key={i} className="flex gap-2.5">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] ${step.color}`}>
                          {step.icon}
                        </div>
                        {!step.isLast && <div className="w-px h-4 bg-stone-200" />}
                      </div>
                      <p className="pt-0.5 pb-3 text-[11px] font-medium text-stone-600">{step.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-stone-400">Actions</p>
                <div className="space-y-1.5">
                  {[
                    { label: "Open PR on GitHub", icon: "↗", color: "text-stone-600" },
                    { label: "Rollback on Vercel", icon: "▲", color: "text-emerald-600" },
                    { label: "View in Linear", icon: "◈", color: "text-violet-600" },
                  ].map((a) => (
                    <button key={a.label} type="button"
                      className={`flex w-full items-center gap-2 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-[11px] font-medium transition hover:bg-white hover:border-stone-200 ${a.color}`}>
                      <span className="font-mono text-xs">{a.icon}</span>{a.label}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>
    </>
  );
}
