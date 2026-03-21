"use client";

import NavBar from "@/components/nav-bar";
import { MOCK_PRS, MOCK_TICKETS, MOCK_DEPLOYMENTS, MOCK_DECISIONS } from "@/lib/mock-data";

type Integration = {
  id: string;
  name: string;
  icon: string;
  status: "connected" | "partial" | "disconnected";
  description: string;
  stats: { label: string; value: string | number }[];
  lastSync: string;
  color: string;
  borderColor: string;
  valueColor: string;
};

const INTEGRATIONS: Integration[] = [
  {
    id: "github",
    name: "GitHub",
    icon: "↗",
    status: "connected",
    description: "Pull requests are automatically linked to AI decisions at merge time. Decision context is stored as PR metadata.",
    stats: [
      { label: "PRs linked", value: MOCK_PRS.length },
      { label: "Repos tracked", value: 1 },
      { label: "Decisions traced", value: MOCK_DECISIONS.filter(d => d.pr_id).length },
    ],
    lastSync: "2 min ago",
    color: "text-stone-700",
    borderColor: "border-stone-200",
    valueColor: "text-stone-900",
  },
  {
    id: "linear",
    name: "Linear",
    icon: "◈",
    status: "connected",
    description: "Tickets are connected to AI sessions so every decision has a traceable business reason. Incident context surfaces linked tickets automatically.",
    stats: [
      { label: "Tickets linked", value: MOCK_TICKETS.length },
      { label: "Projects", value: 1 },
      { label: "Decisions traced", value: MOCK_DECISIONS.filter(d => d.ticket_id).length },
    ],
    lastSync: "5 min ago",
    color: "text-violet-700",
    borderColor: "border-violet-200",
    valueColor: "text-violet-700",
  },
  {
    id: "vercel",
    name: "Vercel",
    icon: "▲",
    status: "connected",
    description: "Deployments are correlated with PRs and their decision history. When an incident fires, Nexus can trace it back to the exact deploy and the AI session that caused it.",
    stats: [
      { label: "Deployments", value: MOCK_DEPLOYMENTS.length },
      { label: "Environments", value: 1 },
      { label: "Linked to PRs", value: MOCK_DEPLOYMENTS.filter(d => d.pr_id).length },
    ],
    lastSync: "1 min ago",
    color: "text-emerald-700",
    borderColor: "border-emerald-200",
    valueColor: "text-emerald-700",
  },
  {
    id: "jira",
    name: "Jira",
    icon: "◈",
    status: "disconnected",
    description: "Connect Jira to link sprint tickets to AI coding decisions. Supports project-level context scoping and issue type filtering.",
    stats: [],
    lastSync: "Never",
    color: "text-stone-400",
    borderColor: "border-stone-200",
    valueColor: "text-stone-400",
  },
  {
    id: "pagerduty",
    name: "PagerDuty",
    icon: "⚠",
    status: "disconnected",
    description: "Auto-create PagerDuty incidents when anomalies are detected. Push AI analysis and fix suggestions directly to the incident timeline.",
    stats: [],
    lastSync: "Never",
    color: "text-stone-400",
    borderColor: "border-stone-200",
    valueColor: "text-stone-400",
  },
  {
    id: "datadog",
    name: "Datadog",
    icon: "◉",
    status: "disconnected",
    description: "Correlate deployment decisions with Datadog metrics and alerts. Surface which AI decision preceded a spike in error rate or latency.",
    stats: [],
    lastSync: "Never",
    color: "text-stone-400",
    borderColor: "border-stone-200",
    valueColor: "text-stone-400",
  },
];

const statusConfig = {
  connected: { label: "Connected", dot: "bg-emerald-500 animate-pulse", text: "text-emerald-700", badge: "bg-emerald-50 border-emerald-200" },
  partial: { label: "Partial", dot: "bg-amber-500", text: "text-amber-700", badge: "bg-amber-50 border-amber-200" },
  disconnected: { label: "Not connected", dot: "bg-stone-300", text: "text-stone-500", badge: "bg-stone-50 border-stone-200" },
};

function IntegrationCard({ integration, index }: { integration: Integration; index: number }) {
  const status = statusConfig[integration.status];
  const isConnected = integration.status === "connected";

  return (
    <div
      className={`fade-up rounded-2xl border p-5 shadow-sm transition-shadow ${
        isConnected
          ? `${integration.borderColor} bg-white hover:shadow-md`
          : "border-stone-200 bg-white opacity-60"
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg font-mono ${
            isConnected
              ? `${integration.borderColor} bg-stone-50 ${integration.color}`
              : "border-stone-200 bg-stone-50 text-stone-400"
          }`}>
            {integration.icon}
          </div>
          <div>
            <p className={`font-semibold ${isConnected ? "text-stone-900" : "text-stone-400"}`}>
              {integration.name}
            </p>
            <p className="text-[10px] text-stone-400">Last sync: {integration.lastSync}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${status.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          <span className={`text-[11px] font-medium ${status.text}`}>{status.label}</span>
        </div>
      </div>

      <p className="mb-4 text-xs leading-5 text-stone-500">{integration.description}</p>

      {isConnected && integration.stats.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {integration.stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-stone-100 bg-stone-50 p-2.5 text-center">
              <p className={`text-base font-bold ${integration.valueColor}`}>{s.value}</p>
              <p className="text-[10px] text-stone-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium transition ${
          isConnected
            ? "border border-stone-200 bg-stone-50 text-stone-500 hover:text-stone-700 hover:border-stone-300"
            : "border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100"
        }`}
      >
        {isConnected ? "Configure" : "Connect"}
      </button>
    </div>
  );
}

export default function ConnectionsPage() {
  const connected = INTEGRATIONS.filter((i) => i.status === "connected");
  const disconnected = INTEGRATIONS.filter((i) => i.status !== "connected");

  return (
    <>
      <NavBar />

      <main className="mx-auto w-full max-w-[1400px] px-6 py-8 lg:px-10">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          {[
            { label: "Connected", value: connected.length, accent: "text-emerald-600", sub: "integrations active" },
            { label: "Decisions traced", value: MOCK_DECISIONS.length, accent: "text-violet-600", sub: "with full context" },
            { label: "Artifacts linked", value: MOCK_PRS.length + MOCK_TICKETS.length + MOCK_DEPLOYMENTS.length, accent: "text-sky-600", sub: "PRs · tickets · deploys" },
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

        {/* Active integrations */}
        <div className="mb-3 fade-in">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
            Active Integrations
          </h3>
        </div>
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {connected.map((i, idx) => <IntegrationCard key={i.id} integration={i} index={idx} />)}
        </div>

        {/* Available integrations */}
        <div className="mb-3 fade-in" style={{ animationDelay: "180ms" }}>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
            Available Integrations
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {disconnected.map((i, idx) => <IntegrationCard key={i.id} integration={i} index={idx + connected.length} />)}
        </div>

        {/* How it works */}
        <div className="mt-10 fade-up rounded-2xl border border-stone-200 bg-white p-6 shadow-sm" style={{ animationDelay: "200ms" }}>
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-widest text-stone-400">
            How the context chain works
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {[
              { icon: "⚡", label: "AI Session", sub: "Claude / Codex", color: "border-violet-200 bg-violet-50 text-violet-700" },
              { icon: "→", label: "", sub: "", color: "border-transparent bg-transparent text-stone-300" },
              { icon: "◈", label: "Decision", sub: "with reasoning", color: "border-sky-200 bg-sky-50 text-sky-700" },
              { icon: "→", label: "", sub: "", color: "border-transparent bg-transparent text-stone-300" },
              { icon: "↗", label: "Pull Request", sub: "GitHub", color: "border-stone-200 bg-stone-50 text-stone-700" },
              { icon: "→", label: "", sub: "", color: "border-transparent bg-transparent text-stone-300" },
              { icon: "▲", label: "Deployment", sub: "Vercel", color: "border-emerald-200 bg-emerald-50 text-emerald-700" },
              { icon: "→", label: "", sub: "", color: "border-transparent bg-transparent text-stone-300" },
              { icon: "🔴", label: "Incident", sub: "auto-traced", color: "border-rose-200 bg-rose-50 text-rose-700" },
            ].map((step, i) => (
              step.label ? (
                <div key={i} className={`flex flex-col items-center rounded-xl border px-3 py-2.5 ${step.color}`}>
                  <span className="mb-0.5 text-base">{step.icon}</span>
                  <p className="text-[11px] font-semibold">{step.label}</p>
                  <p className="text-[10px] opacity-60">{step.sub}</p>
                </div>
              ) : (
                <span key={i} className={`text-lg font-thin ${step.color}`}>{step.icon}</span>
              )
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
