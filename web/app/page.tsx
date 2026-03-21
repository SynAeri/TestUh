"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavBar from "@/components/nav-bar";
import { useIncident } from "@/lib/incident-store";
import {
  MOCK_SESSIONS,
  MOCK_TICKETS,
  ENGINEERS,
  getPRById,
  getDeploymentById,
  relativeTime,
  type AISession,
} from "@/lib/mock-data";

const agentConfig: Record<string, { label: string; color: string; bg: string }> = {
  claude: { label: "Claude", color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
  codex: { label: "Codex", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  cursor: { label: "Cursor", color: "text-sky-700", bg: "bg-sky-50 border-sky-200" },
  copilot: { label: "Copilot", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
};

function SessionCard({ session, index }: { session: AISession; index: number }) {
  const agent = agentConfig[session.agent] ?? agentConfig.claude;
  const engineer = ENGINEERS[session.engineer];
  const pr = session.pr_id ? getPRById(session.pr_id) : null;
  const deploy = pr?.deploy_id ? getDeploymentById(pr.deploy_id) : null;
  const durationMins = Math.round(
    (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60_000,
  );
  return (
    <div
      className="fade-up rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-sky-100 text-[10px] font-bold text-stone-600 border border-stone-200">
            {engineer?.avatar_initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900">{engineer?.name ?? session.engineer}</p>
            <p className="font-mono text-[10px] text-stone-400">{session.repo} · {session.branch}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${agent.bg} ${agent.color}`}>
            {agent.label}
          </span>
          <span className="text-[11px] text-stone-400">{relativeTime(session.started_at)}</span>
        </div>
      </div>

      <div className="mb-3 space-y-1.5">
        {session.decisions.map((d) => (
          <div key={d.id} className="flex items-start gap-2">
            <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
              d.impact === "high" ? "bg-rose-100 text-rose-600" :
              d.impact === "medium" ? "bg-amber-100 text-amber-600" :
              "bg-stone-100 text-stone-500"
            }`}>
              {d.impact}
            </span>
            <p className="text-xs text-stone-600 leading-5">{d.summary}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-stone-100 pt-3">
        {pr && (
          <a href={pr.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[10px] text-stone-600 hover:border-stone-300 transition">
            ↗ PR #{pr.number}
          </a>
        )}
        {session.decisions[0]?.ticket_id && (() => {
          const ticket = MOCK_TICKETS.find(t => t.id === session.decisions[0]?.ticket_id);
          return ticket ? (
            <a href={ticket.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-mono text-[10px] text-violet-600 hover:border-violet-300 transition">
              ◈ {ticket.number}
            </a>
          ) : null;
        })()}
        {deploy && (
          <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] text-emerald-600">
            ▲ {deploy.environment} · {deploy.commit_sha}
          </span>
        )}
        <span className="ml-auto text-[10px] text-stone-400">{durationMins}m · {session.decisions.length} decision{session.decisions.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

function SlackNotification({ onView }: { onView: () => void }) {
  return (
    <div className="fade-in rounded-2xl border border-stone-200 bg-white p-4 shadow-md">
      {/* Slack chrome */}
      <div className="mb-3 flex items-center gap-2 border-b border-stone-100 pb-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#4A154B]">
          <svg width="13" height="13" viewBox="0 0 54 54" fill="none">
            <path d="M19.712 0C17.304 0 15.357 1.958 15.357 4.381s1.947 4.381 4.355 4.381h4.355V4.381C23.067 1.958 21.12 0 19.712 0zm0 11.683H7.069C4.66 11.683 2.714 13.641 2.714 16.064s1.947 4.381 4.355 4.381h12.643c2.408 0 4.355-1.958 4.355-4.381-.01-2.423-1.957-4.381-4.355-4.381zM54 16.064c0-2.423-1.947-4.381-4.355-4.381s-4.355 1.958-4.355 4.381v4.381h4.355C52.053 20.445 54 18.487 54 16.064zm-11.683 0v-12.67C42.317 1.958 40.37 0 37.962 0s-4.355 1.958-4.355 4.381v12.683c0 2.423 1.947 4.381 4.355 4.381s4.355-1.958 4.355-4.381zM37.962 54c2.408 0 4.355-1.958 4.355-4.381s-1.947-4.381-4.355-4.381h-4.355v4.381C33.607 52.042 35.554 54 37.962 54zm0-11.683h12.643C52.053 42.317 54 40.359 54 37.936s-1.947-4.381-4.355-4.381H37.962c-2.408 0-4.355 1.958-4.355 4.381-.01 2.423 1.947 4.381 4.355 4.381zM0 37.936c0 2.423 1.947 4.381 4.355 4.381s4.355-1.958 4.355-4.381v-4.381H4.355C1.947 33.555 0 35.513 0 37.936zm11.683 0v12.683C11.683 52.042 13.63 54 16.038 54s4.355-1.958 4.355-4.381V37.936c0-2.423-1.947-4.381-4.355-4.381-2.398-.01-4.355 1.958-4.355 4.381z" fill="white"/>
          </svg>
        </div>
        <span className="text-xs font-semibold text-stone-700">Slack — #incidents</span>
        <span className="ml-auto text-[10px] text-stone-400">just now</span>
      </div>

      {/* Nexus bot message */}
      <div className="flex gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-sky-500">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-xs font-bold text-stone-900">Nexus</span>
            <span className="text-[10px] text-stone-400">App</span>
          </div>

          <div className="rounded-xl border-l-4 border-rose-500 bg-rose-50 p-3">
            <p className="mb-1 text-xs font-bold text-rose-700">🔴 Production incident detected</p>
            <p className="mb-2 text-xs text-stone-600">
              <span className="font-mono font-semibold">Auth service</span> is returning 500 errors on{" "}
              <span className="font-mono">POST /api/auth/refresh</span>
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <span className="rounded bg-white border border-stone-200 px-2 py-0.5 font-mono text-[10px] text-stone-600">
                ↗ PR #47 linked
              </span>
              <span className="rounded bg-white border border-stone-200 px-2 py-0.5 font-mono text-[10px] text-stone-600">
                ▲ Deployed 2h ago
              </span>
              <span className="rounded bg-white border border-stone-200 px-2 py-0.5 font-mono text-[10px] text-stone-600">
                ◈ LIN-247 found
              </span>
            </div>
            <p className="mb-3 text-xs text-stone-500 italic">
              "JWT migration session found 2.5h before incident. Likely missing JWT_SECRET in production."
            </p>
            <button
              type="button"
              onClick={onView}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700"
            >
              View incident in Nexus →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IncidentPanel() {
  const { incident, triggerIncident } = useIncident();
  const [showSlack, setShowSlack] = useState(false);
  const router = useRouter();

  function handleTrigger() {
    triggerIncident();
    setShowSlack(true);
  }

  function handleViewIncident() {
    router.push("/incidents");
  }

  if (!incident && !showSlack) {
    return (
      <div className="fade-up flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-8 py-12 text-center shadow-sm" style={{ animationDelay: "100ms" }}>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <p className="mb-1 text-sm font-semibold text-stone-900">All systems operational</p>
        <p className="mb-6 text-xs text-stone-500">No active incidents. Nexus is monitoring 3 integrations and has context on 4 decisions.</p>
        <button
          type="button"
          onClick={handleTrigger}
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 hover:border-rose-300"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Simulate production incident
        </button>
        <p className="mt-3 text-[10px] text-stone-400">Triggers a Slack notification to the team</p>
      </div>
    );
  }

  if (showSlack || incident) {
    return (
      <div className="space-y-3">
        <div className="fade-in flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-xs text-emerald-700 font-medium">Slack notification sent to <span className="font-semibold">#incidents</span></p>
        </div>
        <SlackNotification onView={handleViewIncident} />
      </div>
    );
  }

  return null;
}

export default function OverviewPage() {
  const { incident } = useIncident();

  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-[1400px] px-6 py-8 lg:px-10">
        {/* Metric strip */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Sessions captured", value: MOCK_SESSIONS.length, accent: "text-stone-900", sub: "today" },
            { label: "Decisions logged", value: 4, accent: "text-violet-600", sub: "with full reasoning" },
            { label: "Integrations", value: 3, accent: "text-sky-600", sub: "connected" },
            { label: "Active incidents", value: incident ? 1 : 0, accent: incident ? "text-rose-600" : "text-emerald-600", sub: incident ? "needs attention" : "all clear" },
          ].map((s, i) => (
            <div
              key={s.label}
              className="fade-up rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.accent}`}>{s.value}</p>
              <p className="mt-0.5 text-[11px] text-stone-400">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          {/* Sessions */}
          <section>
            <div className="mb-4 flex items-baseline justify-between fade-in">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">Recent AI Sessions</h3>
              <Link href="/decisions" className="text-[11px] text-violet-600 hover:text-violet-700 transition">View all decisions →</Link>
            </div>
            <div className="space-y-3">
              {MOCK_SESSIONS.map((s, i) => <SessionCard key={s.id} session={s} index={i} />)}
            </div>
          </section>

          {/* Incident simulation */}
          <section>
            <div className="mb-4 flex items-baseline justify-between fade-in" style={{ animationDelay: "50ms" }}>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">Incident Response</h3>
              {incident && <span className="flex items-center gap-1 text-[11px] text-rose-500 font-medium"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />Live</span>}
            </div>
            <IncidentPanel />
          </section>
        </div>
      </main>
    </>
  );
}
