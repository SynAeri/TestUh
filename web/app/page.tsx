"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/nav-bar";
import SourceDetailModal from "@/components/source-detail-modal";
import {
  MOCK_APPS,
  getTotalAnnualCost,
  getTotalMonthlySavings,
  getUsersForRemoval,
} from "@/lib/mock-data";

const fallbackApiBaseUrl =
  "https://unflattering-elinor-distinctively.ngrok-free.dev";
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? fallbackApiBaseUrl;

type Severity = "info" | "warning" | "critical";
type Insight = {
  metric: string;
  value: string;
  description: string;
  severity: Severity;
};
type InsightsResponse = { insights: Insight[]; generated_at: string };
type SourceCitation = {
  id: string;
  source_type: string;
  snippet: string;
  metadata: Record<string, unknown>;
  relevance_score: number;
};
type QueryResponse = { answer: string; query: string; sources: SourceCitation[] };

const severityConfig: Record<
  Severity,
  { bar: string; badge: string; card: string; label: string }
> = {
  critical: {
    bar: "bg-rose-500",
    badge: "bg-rose-500/10 text-rose-300 border-rose-400/20",
    card: "border-rose-400/20 bg-rose-400/3 hover:border-rose-400/35",
    label: "Priority",
  },
  warning: {
    bar: "bg-amber-400",
    badge: "bg-amber-500/10 text-amber-300 border-amber-400/20",
    card: "border-amber-400/15 bg-amber-400/3 hover:border-amber-400/30",
    label: "Watchlist",
  },
  info: {
    bar: "bg-sky-400",
    badge: "bg-sky-500/10 text-sky-300 border-sky-400/20",
    card: "border-white/8 bg-white/3 hover:border-sky-400/20",
    label: "Info",
  },
};

const sourceTypeConfig: Record<string, { emoji: string; color: string; label: string }> = {
  slack: { emoji: "💬", color: "text-purple-300", label: "Slack" },
  pdf: { emoji: "📄", color: "text-rose-300", label: "PDF" },
  video: { emoji: "🎬", color: "text-blue-300", label: "Video" },
  doc: { emoji: "📝", color: "text-emerald-300", label: "Doc" },
};

export default function HomePage() {
  const [health, setHealth] = useState<"checking" | "healthy" | "offline">("checking");
  const [insights, setInsights] = useState<Insight[]>([]);
  const [generatedAt, setGeneratedAt] = useState("");
  const [insightsError, setInsightsError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const [query, setQuery] = useState("What are the main documentation tool risks?");
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);
  const [queryError, setQueryError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SourceCitation | null>(null);

  const totalAnnualCost = getTotalAnnualCost(MOCK_APPS);
  const totalMonthlySavings = getTotalMonthlySavings(MOCK_APPS);
  const removalCandidates = getUsersForRemoval(MOCK_APPS);

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
      if (!insightsRes.ok) throw new Error(`Insights failed: ${insightsRes.status}`);
      const data = (await insightsRes.json()) as InsightsResponse;
      setInsights(data.insights);
      setGeneratedAt(data.generated_at);
      setInsightsError("");
    } catch {
      setHealth("offline");
      setInsightsError("Backend unreachable. Displaying cached signals.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSeed() {
    setIsSeeding(true);
    try {
      await fetch(`${apiBaseUrl}/ingest/mock`, { method: "POST" });
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
      void loadDashboard();
    } catch {
      // silent
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleSearch() {
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
            : `Query failed: ${res.status}`,
        );
      }
      setQueryResult(payload as QueryResponse);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const criticalCount = insights.filter((i) => i.severity === "critical").length;
  const warningCount = insights.filter((i) => i.severity === "warning").length;

  return (
    <>
      <NavBar onSeed={handleSeed} isSeeding={isSeeding} health={health} />

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-60 left-1/4 h-[600px] w-[600px] rounded-full bg-sky-500/6 blur-[140px]" />
        <div className="absolute top-1/2 right-0 h-[400px] w-[400px] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <main className="relative mx-auto w-full max-w-[1440px] px-6 py-8 lg:px-14">
        {/* Summary bar */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryCard
            label="Annual SaaS spend"
            value={`$${(totalAnnualCost / 1000).toFixed(0)}k`}
            sub="across 6 tools"
            accent="text-white"
          />
          <SummaryCard
            label="Potential savings"
            value={`$${((totalMonthlySavings * 12) / 1000).toFixed(0)}k/yr`}
            sub="from optimisation"
            accent="text-emerald-400"
          />
          <SummaryCard
            label="Removal candidates"
            value={removalCandidates.length}
            sub="unused seats"
            accent="text-rose-400"
          />
          <SummaryCard
            label="Active signals"
            value={insights.length || "—"}
            sub={`${criticalCount} critical · ${warningCount} watchlist`}
            accent="text-amber-400"
          />
        </div>

        {seedSuccess && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-300">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Mock data seeded successfully. Dashboard updated.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Signal feed */}
          <section>
            <SectionHeader
              title="Signals & Recommendations"
              sub={`${insights.length} active`}
            />

            {insightsError && (
              <div className="mb-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-300">
                {insightsError}
              </div>
            )}

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-2xl border border-white/6 bg-white/3"
                  />
                ))}
              </div>
            ) : insights.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-white/3 p-10 text-center">
                <p className="text-sm text-slate-500">No signals yet.</p>
                <p className="mt-1 text-xs text-slate-600">
                  Click "Seed Data" to load mock insights.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {[
                  ...insights.filter((i) => i.severity === "critical"),
                  ...insights.filter((i) => i.severity === "warning"),
                  ...insights.filter((i) => i.severity === "info"),
                ].map((insight, idx) => {
                  const cfg = severityConfig[insight.severity];
                  return (
                    <article
                      key={`${insight.metric}-${idx}`}
                      className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 ${cfg.card}`}
                    >
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

          {/* Semantic search */}
          <section>
            <SectionHeader title="Knowledge Search" sub="RAG · Claude AI" />

            <div className="rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-sm">
              <p className="mb-4 text-xs text-slate-500">
                Ask anything about your company's data — Slack, PDFs, docs, and
                video transcripts.
              </p>

              <form onSubmit={(e) => { e.preventDefault(); void handleSearch(); }} className="space-y-3">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-400/40 focus:bg-slate-950"
                  placeholder="What are the biggest documentation risks?"
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
                      Searching…
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
                        Claude's Answer
                      </span>
                    </div>
                    <p className="text-xs leading-6 text-slate-200 whitespace-pre-wrap">
                      {queryResult.answer}
                    </p>
                  </div>

                  {queryResult.sources.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        Sources · {queryResult.sources.length}
                      </p>
                      <div className="space-y-2">
                        {queryResult.sources.map((source) => {
                          const src = sourceTypeConfig[source.source_type] ?? {
                            emoji: "📁",
                            color: "text-slate-300",
                            label: source.source_type,
                          };
                          return (
                            <button
                              key={source.id}
                              type="button"
                              onClick={() => setSelectedSource(source)}
                              className="w-full rounded-xl border border-white/8 bg-white/3 p-3.5 text-left transition hover:border-sky-400/20 hover:bg-sky-400/3"
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
                              <p className="text-xs leading-5 text-slate-400 line-clamp-2">
                                {source.snippet}
                              </p>
                              <p className="mt-1.5 text-[10px] text-sky-400/60">
                                Click to view full source →
                              </p>
                            </button>
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

        <footer className="mt-12 border-t border-white/6 pt-6 text-center">
          <p className="text-[11px] text-slate-600">
            Nexus OS · SaaS Intelligence Platform ·{" "}
            <span className="font-mono text-slate-500">
              {apiBaseUrl.replace("https://", "")}
            </span>
            {generatedAt && (
              <>
                {" "}
                · Last refresh{" "}
                {new Intl.DateTimeFormat("en-AU", {
                  timeStyle: "short",
                }).format(new Date(generatedAt))}
              </>
            )}
          </p>
        </footer>
      </main>

      {selectedSource && (
        <SourceDetailModal
          source={selectedSource}
          onClose={() => setSelectedSource(null)}
        />
      )}
    </>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-4 backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-600">{sub}</p>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {title}
      </h3>
      {sub && <span className="text-[11px] text-slate-600">{sub}</span>}
    </div>
  );
}
