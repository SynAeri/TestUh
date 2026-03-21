"use client";

import NavBar from "@/components/nav-bar";
import { useIncident } from "@/lib/incident-store";
import {
  MOCK_DECISIONS,
  MOCK_SESSIONS,
  MOCK_TICKETS,
  ENGINEERS,
  getPRById,
  getDeploymentById,
  relativeTime,
} from "@/lib/mock-data";

function EmptyState({ onTrigger }: { onTrigger: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <p className="mb-1 text-lg font-semibold text-stone-900">No active incidents</p>
      <p className="mb-8 max-w-sm text-sm text-stone-500">All systems operational. Nexus is monitoring 3 integrations with context on 4 recent decisions.</p>
      <button type="button" onClick={onTrigger}
        className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Trigger demo incident
      </button>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-stone-400">{children}</p>
  );
}

export default function IncidentsPage() {
  const { incident, triggerIncident, resolveIncident } = useIncident();

  if (!incident) {
    return (
      <>
        <NavBar />
        <main className="mx-auto w-full max-w-[1400px] px-6 py-8 lg:px-10">
          <EmptyState onTrigger={triggerIncident} />
        </main>
      </>
    );
  }

  const relatedDecisions = incident.related_decision_ids
    .map((id) => MOCK_DECISIONS.find((d) => d.id === id))
    .filter(Boolean);

  const rootSession = relatedDecisions[0]
    ? MOCK_SESSIONS.find((s) => s.id === relatedDecisions[0]!.session_id)
    : null;
  const rootEngineer = rootSession ? ENGINEERS[rootSession.engineer] : null;
  const pr = incident.related_pr_id ? getPRById(incident.related_pr_id) : null;
  const deploy = incident.related_deploy_id ? getDeploymentById(incident.related_deploy_id) : null;
  const linkedTickets = MOCK_TICKETS.filter((t) =>
    incident.related_decision_ids.some((id) => t.decision_ids.includes(id)),
  );

  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-[1400px] px-6 py-8 lg:px-10">

        {/* Incident banner */}
        <div className="fade-up mb-6 flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white shadow-sm">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
            </div>
            <div>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-rose-300 bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600">Critical</span>
                <span className="rounded-full border border-rose-200 bg-rose-100 px-2.5 py-0.5 text-[10px] font-medium text-rose-600">Active</span>
                <span className="font-mono text-[10px] text-stone-400">#{incident.id} · triggered {relativeTime(incident.triggered_at)}</span>
              </div>
              <h1 className="text-lg font-bold text-stone-900">{incident.title}</h1>
              <p className="text-xs text-stone-500">{incident.affected_service}</p>
            </div>
          </div>
          <button type="button" onClick={resolveIncident}
            className="shrink-0 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50">
            Mark resolved
          </button>
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* LEFT COLUMN */}
          <div className="space-y-5">

            {/* Summary */}
            <div className="fade-up rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" style={{ animationDelay: "60ms" }}>
              <SectionLabel>Summary</SectionLabel>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-sky-500">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                </div>
                <p className="text-xs font-semibold text-stone-700">AI Root Cause Analysis</p>
                <span className="ml-auto rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] text-violet-600">Nexus · decision context</span>
              </div>
              <p className="text-sm leading-6 text-stone-600">{incident.ai_analysis}</p>
            </div>

            {/* Pull Request */}
            {pr && (
              <div className="fade-up rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" style={{ animationDelay: "120ms" }}>
                <SectionLabel>Pull Request</SectionLabel>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-[11px] text-stone-400">#{pr.number}</span>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Merged</span>
                    </div>
                    <p className="text-sm font-semibold text-stone-900">{pr.title}</p>
                    <p className="text-xs text-stone-500">{pr.repo} · by {ENGINEERS[pr.author]?.name ?? pr.author}</p>
                  </div>
                  <a href={pr.url} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-stone-300 transition">
                    Open on GitHub →
                  </a>
                </div>
                {/* Decisions inside this PR */}
                <div className="rounded-xl border border-stone-100 bg-stone-50 p-3.5 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Decisions captured in this PR</p>
                  {relatedDecisions.map((d) => d && (
                    <div key={d.id} className="flex items-start gap-2">
                      <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        d.impact === "high" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                      }`}>{d.impact}</span>
                      <div>
                        <p className="text-xs font-medium text-stone-700">{d.summary}</p>
                        <p className="text-[11px] text-stone-400 leading-4 mt-0.5">{d.reasoning.slice(0, 100)}…</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deployment Logs */}
            {deploy && (
              <div className="fade-up rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" style={{ animationDelay: "180ms" }}>
                <SectionLabel>Deployment Logs</SectionLabel>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 font-mono text-sm text-stone-600">▲</div>
                    <div>
                      <p className="text-sm font-semibold text-stone-900">Vercel · {deploy.environment}</p>
                      <p className="font-mono text-[10px] text-stone-400">{deploy.repo}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700">Success</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Commit", value: deploy.commit_sha },
                    { label: "Deployed at", value: new Date(deploy.deployed_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) },
                    { label: "Time before incident", value: "~2.5h" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-stone-100 bg-stone-50 p-2.5">
                      <p className="text-[10px] text-stone-400">{s.label}</p>
                      <p className="font-mono text-xs font-semibold text-stone-700 mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>
                {/* Simulated log lines */}
                <div className="rounded-xl border border-stone-200 bg-stone-900 p-3 font-mono text-[11px] leading-5">
                  <p className="text-stone-500">[10:23:01] Building acme/api-server@a4f9c2e...</p>
                  <p className="text-stone-400">[10:23:14] Installing dependencies</p>
                  <p className="text-stone-400">[10:23:28] Running TypeScript compiler</p>
                  <p className="text-stone-400">[10:23:31] Build complete</p>
                  <p className="text-emerald-400">[10:23:33] Deployment successful → production</p>
                  <p className="text-rose-400 mt-1">[12:47:02] ERROR 500 on POST /api/auth/refresh</p>
                  <p className="text-rose-400">[12:47:03] JsonWebTokenError: invalid signature</p>
                  <p className="text-rose-400">[12:47:03] at /src/middleware/auth.ts:18</p>
                </div>
              </div>
            )}

            {/* Fix suggestion */}
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                <p className="text-sm font-semibold text-stone-700">AI Fix Suggestion</p>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-xs leading-6 text-stone-600">{incident.ai_fix_suggestion}</pre>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-5">

            {/* Linked tickets */}
            {linkedTickets.length > 0 && (
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <SectionLabel>Linked Tickets</SectionLabel>
                <div className="space-y-2">
                  {linkedTickets.map((ticket) => (
                    <a key={ticket.id} href={ticket.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-3 rounded-xl border border-stone-100 bg-stone-50 p-3 transition hover:border-violet-200 hover:bg-violet-50">
                      <span className="mt-0.5 font-mono text-sm text-violet-500">◈</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[10px] font-semibold text-violet-600">{ticket.number}</span>
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 capitalize">{ticket.status}</span>
                        </div>
                        <p className="text-xs text-stone-700 leading-4">{ticket.title}</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">{ENGINEERS[ticket.assignee]?.name} · Linear</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested engineer */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <SectionLabel>Suggested Responder</SectionLabel>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-gradient-to-br from-violet-100 to-sky-100 text-sm font-bold text-stone-600">
                  JC
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900">{incident.suggested_engineer}</p>
                  <p className="text-xs text-stone-400">{ENGINEERS["james.chen"]?.role}</p>
                </div>
                <span className="ml-auto rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-600">AI suggested</span>
              </div>
              <p className="text-xs leading-5 text-stone-500">{incident.suggested_engineer_reason}</p>
            </div>

            {/* Context chain */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <SectionLabel>Context Timeline</SectionLabel>
              <div className="space-y-0">
                {[
                  { icon: "⚡", label: rootSession ? `AI session · ${rootSession.agent}` : "AI Session", sub: rootEngineer?.name ?? "", time: rootSession ? new Date(rootSession.started_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) : "", color: "border-violet-200 bg-violet-50 text-violet-600" },
                  { icon: "↗", label: pr ? `PR #${pr.number} merged` : "Pull Request", sub: pr?.title ?? "", time: pr?.merged_at ? new Date(pr.merged_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) : "", color: "border-stone-200 bg-stone-50 text-stone-500" },
                  { icon: "▲", label: "Deployed to production", sub: deploy ? deploy.commit_sha : "", time: deploy ? new Date(deploy.deployed_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) : "", color: "border-emerald-200 bg-emerald-50 text-emerald-600" },
                  { icon: "🔴", label: "Incident triggered", sub: incident.title, time: new Date(incident.triggered_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }), color: "border-rose-200 bg-rose-50 text-rose-600", isLast: true },
                ].map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-mono ${step.color}`}>{step.icon}</div>
                      {!step.isLast && <div className="w-px flex-1 bg-stone-200 my-1" />}
                    </div>
                    <div className={`pb-4 pt-0.5 ${step.isLast ? "" : ""}`}>
                      <p className="text-xs font-semibold text-stone-800">{step.label}</p>
                      <p className="text-[11px] text-stone-400 truncate max-w-[220px]">{step.sub}</p>
                      <p className="font-mono text-[10px] text-stone-300">{step.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <SectionLabel>Quick Actions</SectionLabel>
              <div className="space-y-2">
                {[
                  { label: "Open PR #47 on GitHub", icon: "↗", color: "text-stone-600 hover:text-stone-800" },
                  { label: "Rollback via Vercel", icon: "▲", color: "text-emerald-600 hover:text-emerald-700" },
                  { label: "View LIN-247 in Linear", icon: "◈", color: "text-violet-600 hover:text-violet-700" },
                ].map((a) => (
                  <button key={a.label} type="button"
                    className={`flex w-full items-center gap-2.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs font-medium transition hover:border-stone-300 hover:bg-white ${a.color}`}>
                    <span className="font-mono">{a.icon}</span>{a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
