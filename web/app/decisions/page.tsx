"use client";

import { useState } from "react";
import NavBar from "@/components/nav-bar";
import {
  MOCK_DECISIONS,
  MOCK_SESSIONS,
  MOCK_TICKETS,
  ENGINEERS,
  getPRById,
  getDeploymentById,
  relativeTime,
  type Decision,
} from "@/lib/mock-data";

const agentConfig: Record<string, { label: string; color: string; bg: string }> = {
  claude: { label: "Claude", color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
  codex: { label: "Codex", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  cursor: { label: "Cursor", color: "text-sky-700", bg: "bg-sky-50 border-sky-200" },
  copilot: { label: "Copilot", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
};

function DecisionCard({ decision, index }: { decision: Decision; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const session = MOCK_SESSIONS.find((s) => s.id === decision.session_id);
  const engineer = session ? ENGINEERS[session.engineer] : null;
  const agent = session ? (agentConfig[session.agent] ?? agentConfig.claude) : agentConfig.claude;
  const pr = decision.pr_id ? getPRById(decision.pr_id) : null;
  const deploy = decision.deploy_id ? getDeploymentById(decision.deploy_id) : null;
  const ticket = decision.ticket_id ? MOCK_TICKETS.find((t) => t.id === decision.ticket_id) : null;

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className={`absolute left-0 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border ${
        decision.impact === "high"
          ? "border-rose-200 bg-rose-50"
          : decision.impact === "medium"
            ? "border-amber-200 bg-amber-50"
            : "border-stone-200 bg-stone-100"
      }`}>
        <span className={`h-2 w-2 rounded-full ${
          decision.impact === "high" ? "bg-rose-500" :
          decision.impact === "medium" ? "bg-amber-500" : "bg-stone-400"
        }`} />
      </div>

      <div
        className="fade-up rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        style={{ animationDelay: `${index * 70}ms` }}
      >
        {/* Top row */}
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {engineer && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-gradient-to-br from-violet-100 to-sky-100 text-[9px] font-bold text-stone-600">
                {engineer.avatar_initials}
              </div>
            )}
            <span className="text-xs font-medium text-stone-700">{engineer?.name}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${agent.bg} ${agent.color}`}>
              {agent.label}
            </span>
            {session && (
              <span className="font-mono text-[10px] text-stone-400">{session.repo} · {session.branch}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
              decision.impact === "high" ? "bg-rose-100 text-rose-600" :
              decision.impact === "medium" ? "bg-amber-100 text-amber-600" :
              "bg-stone-100 text-stone-500"
            }`}>
              {decision.impact} impact
            </span>
            <span className="text-[11px] text-stone-400">{relativeTime(decision.timestamp)}</span>
          </div>
        </div>

        {/* Decision summary */}
        <p className="mb-3 text-sm font-semibold text-stone-900">{decision.summary}</p>

        {/* Reasoning — collapsible */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mb-3 flex w-full items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-3 text-left transition hover:border-violet-300 hover:bg-violet-100/50"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="#7c3aed"
            className="mt-0.5 shrink-0 opacity-70"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-violet-600">
              AI Reasoning
            </p>
            <p className={`text-xs leading-5 text-stone-600 ${expanded ? "" : "line-clamp-2"}`}>
              {decision.reasoning}
            </p>
            {!expanded && (
              <p className="mt-1 text-[10px] text-violet-500/70">Click to expand →</p>
            )}
          </div>
        </button>

        {/* Files changed */}
        {expanded && (
          <div className="mb-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
              Files changed · {decision.files_changed.length}
            </p>
            <div className="space-y-1">
              {decision.files_changed.map((f) => (
                <p key={f} className="font-mono text-[11px] text-stone-500">
                  <span className="text-stone-400">·</span> {f}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Artifact chain */}
        <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
          <span className="text-[10px] text-stone-400">Linked to:</span>
          {ticket && (
            <a href={ticket.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-mono text-[10px] text-violet-600 hover:border-violet-300 transition">
              ◈ {ticket.number}
            </a>
          )}
          {pr && (
            <a href={pr.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[10px] text-stone-600 hover:border-stone-300 transition">
              ↗ PR #{pr.number}
            </a>
          )}
          {deploy && (
            <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] text-emerald-600">
              ▲ {deploy.environment} · {deploy.commit_sha}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DecisionsPage() {
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const filtered = filter === "all"
    ? MOCK_DECISIONS
    : MOCK_DECISIONS.filter((d) => d.impact === filter);

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <>
      <NavBar />

      <main className="mx-auto w-full max-w-[1400px] px-6 py-8 lg:px-10">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { label: "Total decisions", value: MOCK_DECISIONS.length, accent: "text-stone-900" },
            { label: "High impact", value: MOCK_DECISIONS.filter(d => d.impact === "high").length, accent: "text-rose-600" },
            { label: "Medium impact", value: MOCK_DECISIONS.filter(d => d.impact === "medium").length, accent: "text-amber-600" },
            { label: "With ticket", value: MOCK_DECISIONS.filter(d => d.ticket_id).length, accent: "text-violet-600" },
            { label: "With PR", value: MOCK_DECISIONS.filter(d => d.pr_id).length, accent: "text-stone-700" },
            { label: "Deployed", value: MOCK_DECISIONS.filter(d => d.deploy_id).length, accent: "text-emerald-600" },
          ].map((s, i) => (
            <div
              key={s.label}
              className="fade-up rounded-xl border border-stone-200 bg-white p-3 text-center shadow-sm"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <p className={`text-xl font-bold ${s.accent}`}>{s.value}</p>
              <p className="text-[10px] text-stone-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="mb-6 flex items-center gap-2 fade-in">
          <span className="text-[11px] text-stone-400">Filter by impact:</span>
          {(["all", "high", "medium", "low"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                filter === f
                  ? "bg-stone-900 text-white"
                  : "text-stone-500 hover:text-stone-700 hover:bg-stone-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="relative space-y-4">
          {/* Vertical line */}
          <div className="absolute left-2 top-0 bottom-0 w-px bg-stone-200" />

          {sorted.map((decision, i) => (
            <DecisionCard key={decision.id} decision={decision} index={i} />
          ))}
        </div>
      </main>
    </>
  );
}
