"use client";

import { FormEvent, useEffect, useState } from "react";

const fallbackApiBaseUrl =
  "https://unflattering-elinor-distinctively.ngrok-free.dev";
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  fallbackApiBaseUrl;

type Severity = "info" | "warning" | "critical";

type Insight = {
  metric: string;
  value: string;
  description: string;
  severity: Severity;
};

type InsightsResponse = {
  insights: Insight[];
  generated_at: string;
};

type SourceCitation = {
  id: string;
  source_type: string;
  snippet: string;
  metadata: Record<string, unknown>;
  relevance_score: number;
};

type QueryResponse = {
  answer: string;
  query: string;
  sources: SourceCitation[];
};

const severityConfig: Record<
  Severity,
  { bar: string; badge: string; card: string; label: string; dot: string }
> = {
  info: {
    bar: "bg-sky-400",
    badge: "bg-sky-500/10 text-sky-300 border-sky-400/20",
    card: "border-white/8 bg-white/3 hover:border-sky-400/20 hover:bg-sky-400/3",
    label: "Info",
    dot: "bg-sky-400",
  },
  warning: {
    bar: "bg-amber-400",
    badge: "bg-amber-500/10 text-amber-300 border-amber-400/20",
    card: "border-amber-400/15 bg-amber-400/3 hover:border-amber-400/30",
    label: "Watchlist",
    dot: "bg-amber-400",
  },
  critical: {
    bar: "bg-rose-500",
    badge: "bg-rose-500/10 text-rose-300 border-rose-400/20",
    card: "border-rose-400/20 bg-rose-400/3 hover:border-rose-400/35",
    label: "Priority",
    dot: "bg-rose-500",
  },
};

const sourceTypeConfig: Record<
  string,
  { emoji: string; color: string; label: string }
> = {
  slack: { emoji: "💬", color: "text-purple-300", label: "Slack" },
  pdf: { emoji: "📄", color: "text-rose-300", label: "PDF" },
  video: { emoji: "🎬", color: "text-blue-300", label: "Video" },
  doc: { emoji: "📝", color: "text-emerald-300", label: "Doc" },
};

export default function Home() {
  const [health, setHealth] = useState<"checking" | "healthy" | "offline">(
    "checking",
  );
  const [insights, setInsights] = useState<Insight[]>([]);
  const [generatedAt, setGeneratedAt] = useState("");
  const [insightsError, setInsightsError] = useState("");
  const [query, setQuery] = useState("What are the main operational risks?");
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);
  const [queryError, setQueryError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    setIsLoading(true);
    try {
      const [healthRes, insightsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/health`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/insights`, { cache: "no-store" }),
      ]);

      setHealth(healthRes.ok ? "healthy" : "offline");

      if (!insightsRes.ok) {
        throw new Error(`Insights request failed with ${insightsRes.status}`);
      }

      const data = (await insightsRes.json()) as InsightsResponse;
      setInsights(data.insights);
      setGeneratedAt(data.generated_at);
      setInsightsError("");
    } catch (err) {
      setHealth("offline");
      setInsightsError(
        err instanceof Error
          ? err.message
          : "The backend did not respond as expected.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setQueryError("");
    setQueryResult(null);

    try {
      const res = await fetch(`${apiBaseUrl}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 4 }),
      });

      const payload = (await res.json()) as QueryResponse | { detail?: string };

      if (!res.ok) {
        throw new Error(
          "detail" in payload && payload.detail
            ? payload.detail
            : `Query failed with ${res.status}`,
        );
      }

      setQueryResult(payload as QueryResponse);
    } catch (err) {
      setQueryResult(null);
      setQueryError(
        err instanceof Error
          ? err.message
          : "The search request failed. Check the backend and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const criticalCount = insights.filter((i) => i.severity === "critical").length;
  const warningCount = insights.filter((i) => i.severity === "warning").length;
  const infoCount = insights.filter((i) => i.severity === "info").length;

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-60 left-1/4 h-[700px] w-[700px] rounded-full bg-sky-500/7 blur-[140px]" />
        <div className="absolute top-1/2 right-0 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-sky-400/4 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-[1440px] px-6 py-8 lg:px-14">
        {/* ── Header ── */}
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 shadow-lg shadow-sky-500/25">
              <svg
                width="16"
                height="16"
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
              <p className="text-sm font-semibold text-white">Nexus OS</p>
              <p className="text-[11px] text-slate-500">Enterprise Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusPill health={health} />
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs text-slate-400 transition hover:border-sky-400/30 hover:text-white"
            >
              <RefreshIcon spinning={isLoading} />
              Refresh
            </button>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="mb-8 rounded-3xl border border-white/8 bg-gradient-to-br from-white/4 to-transparent p-8 backdrop-blur-sm lg:p-10">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/8 px-3 py-1 text-[11px] text-sky-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
            Live workspace intelligence
          </span>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-5xl leading-[1.15]">
            Turn scattered company knowledge into{" "}
            <span className="bg-gradient-to-r from-sky-300 via-sky-200 to-violet-300 bg-clip-text text-transparent">
              signals your team can act on
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
            Nexus OS ingests data from Slack, PDFs, video transcripts, and docs
            — surfacing optimization insights and enabling semantic search
            across your entire enterprise knowledge base.
          </p>

          {/* Stat pills */}
          <div className="mt-8 flex flex-wrap gap-3">
            <StatPill label="Total signals" value={insights.length} color="slate" />
            <StatPill label="Priority" value={criticalCount} color="rose" />
            <StatPill label="Watchlist" value={warningCount} color="amber" />
            <StatPill label="Info" value={infoCount} color="sky" />
            {generatedAt && (
              <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-1.5">
                <span className="text-[11px] text-slate-500">
                  Last refresh: {formatTimestamp(generatedAt)}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── Main content grid ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* ── Insights feed ── */}
          <section>
            <SectionHeader
              title="Signals Feed"
              subtitle={`${insights.length} active signals`}
            />

            {insightsError ? (
              <ErrorCard message={insightsError} title="Backend unreachable" />
            ) : isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-2xl border border-white/6 bg-white/3"
                  />
                ))}
              </div>
            ) : insights.length === 0 ? (
              <EmptyState message="No signals yet. Trigger a mock ingestion from the backend to populate data." />
            ) : (
              <div className="space-y-2.5">
                {insights.map((insight, idx) => {
                  const cfg = severityConfig[insight.severity];
                  return (
                    <article
                      key={`${insight.metric}-${idx}`}
                      className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 ${cfg.card}`}
                    >
                      {/* Severity bar */}
                      <div
                        className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl ${cfg.bar}`}
                      />
                      <div className="pl-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <span
                              className={`mb-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${cfg.badge}`}
                            >
                              {cfg.label}
                            </span>
                            <h4 className="text-sm font-semibold text-white">
                              {insight.metric}
                            </h4>
                          </div>
                          <p className="shrink-0 text-sm font-bold text-white">
                            {insight.value}
                          </p>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-400">
                          {insight.description}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Query workspace ── */}
          <section>
            <SectionHeader
              title="Semantic Search"
              subtitle="RAG-powered Q&A"
            />

            <div className="rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-sm">
              <div className="mb-1 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-violet-500">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="white"
                    stroke="none"
                  >
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-white">
                  Ask your knowledge layer
                </p>
              </div>
              <p className="mb-5 text-xs text-slate-500">
                Ask anything about your company data — powered by Claude AI
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-400/40 focus:bg-slate-950"
                  placeholder="What are the biggest documentation risks across tools?"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !query.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-sky-400 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:from-sky-400 hover:to-sky-300 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 disabled:shadow-none"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
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
                      Searching knowledge base…
                    </>
                  ) : (
                    <>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                      Run Semantic Search
                    </>
                  )}
                </button>
              </form>

              {queryError && (
                <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4">
                  <p className="text-xs font-semibold text-rose-300">
                    Query failed
                  </p>
                  <p className="mt-1 text-xs text-rose-400/70">{queryError}</p>
                </div>
              )}

              {queryResult && (
                <div className="mt-5 space-y-3">
                  {/* Answer */}
                  <div className="rounded-xl border border-sky-400/15 bg-gradient-to-br from-sky-400/5 to-violet-400/3 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-violet-400">
                        <svg
                          width="9"
                          height="9"
                          viewBox="0 0 24 24"
                          fill="white"
                        >
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                        Claude&apos;s Answer
                      </span>
                    </div>
                    <p className="text-xs leading-6 text-slate-200 whitespace-pre-wrap">
                      {queryResult.answer}
                    </p>
                  </div>

                  {/* Sources */}
                  {queryResult.sources.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        Sources · {queryResult.sources.length}
                      </p>
                      <div className="space-y-2">
                        {queryResult.sources.map((source) => {
                          const src =
                            sourceTypeConfig[source.source_type] ?? {
                              emoji: "📁",
                              color: "text-slate-300",
                              label: source.source_type,
                            };
                          return (
                            <div
                              key={source.id}
                              className="rounded-xl border border-white/8 bg-white/3 p-3.5"
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{src.emoji}</span>
                                  <span
                                    className={`text-[11px] font-medium capitalize ${src.color}`}
                                  >
                                    {src.label}
                                  </span>
                                </div>
                                <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-slate-400">
                                  {Math.round(source.relevance_score * 100)}%
                                  match
                                </span>
                              </div>
                              <p className="text-xs leading-5 text-slate-400">
                                {source.snippet}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── Footer ── */}
        <footer className="mt-12 border-t border-white/6 pt-6 text-center">
          <p className="text-[11px] text-slate-600">
            Nexus OS · Enterprise Intelligence Layer · Connected to{" "}
            <span className="font-mono text-slate-500">
              {apiBaseUrl.replace("https://", "")}
            </span>
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StatusPill({
  health,
}: {
  health: "checking" | "healthy" | "offline";
}) {
  const cfg = {
    checking: {
      style: "bg-slate-500/10 border-slate-400/20 text-slate-400",
      dot: "bg-slate-400 animate-pulse",
      label: "Connecting",
    },
    healthy: {
      style: "bg-emerald-500/10 border-emerald-400/20 text-emerald-300",
      dot: "bg-emerald-400 animate-pulse",
      label: "Live",
    },
    offline: {
      style: "bg-rose-500/10 border-rose-400/20 text-rose-300",
      dot: "bg-rose-500",
      label: "Offline",
    },
  }[health];

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${cfg.style}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      Backend {cfg.label}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {title}
      </h3>
      {subtitle && (
        <span className="text-[11px] text-slate-600">{subtitle}</span>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    slate: "text-slate-300",
    rose: "text-rose-300",
    amber: "text-amber-300",
    sky: "text-sky-300",
  };
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-1.5">
      <span className={`text-sm font-bold ${colorMap[color] ?? "text-white"}`}>
        {value}
      </span>
      <span className="text-[11px] text-slate-500">{label}</span>
    </div>
  );
}

function ErrorCard({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-rose-400 text-sm">⚠</span>
        <div>
          <p className="text-sm font-semibold text-rose-200">{title}</p>
          <p className="mt-1 text-xs text-rose-400/70">{message}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/2 p-8 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? "animate-spin" : ""}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}
