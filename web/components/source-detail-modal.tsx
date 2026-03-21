"use client";

const sourceTypeConfig: Record<
  string,
  { emoji: string; color: string; label: string; bg: string }
> = {
  slack: {
    emoji: "💬",
    color: "text-purple-300",
    label: "Slack",
    bg: "bg-purple-500/10 border-purple-400/20",
  },
  pdf: {
    emoji: "📄",
    color: "text-rose-300",
    label: "PDF",
    bg: "bg-rose-500/10 border-rose-400/20",
  },
  video: {
    emoji: "🎬",
    color: "text-blue-300",
    label: "Video",
    bg: "bg-blue-500/10 border-blue-400/20",
  },
  doc: {
    emoji: "📝",
    color: "text-emerald-300",
    label: "Doc",
    bg: "bg-emerald-500/10 border-emerald-400/20",
  },
};

type Source = {
  id: string;
  source_type: string;
  snippet: string;
  metadata: Record<string, unknown>;
  relevance_score: number;
};

export default function SourceDetailModal({
  source,
  onClose,
}: {
  source: Source;
  onClose: () => void;
}) {
  const cfg = sourceTypeConfig[source.source_type] ?? {
    emoji: "📁",
    color: "text-slate-300",
    label: source.source_type,
    bg: "bg-white/5 border-white/10",
  };

  const meta = source.metadata;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f1e] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/8 p-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl ${cfg.bg}`}
            >
              {cfg.emoji}
            </div>
            <div>
              <p className={`text-sm font-semibold ${cfg.color}`}>
                {cfg.label} Source
              </p>
              <p className="font-mono text-[10px] text-slate-600">{source.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-medium text-slate-300">
              {Math.round(source.relevance_score * 100)}% match
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 p-1.5 text-slate-500 transition hover:text-white"
            >
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Metadata */}
        {Object.keys(meta).length > 0 && (
          <div className="border-b border-white/8 px-5 py-4">
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Metadata
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(meta)
                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-white/8 bg-white/3 px-3 py-2">
                    <p className="text-[10px] text-slate-500 capitalize">
                      {k.replace(/_/g, " ")}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-medium text-slate-200">
                      {String(v)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Content
          </p>
          <div className="rounded-xl border border-white/8 bg-slate-950/60 p-4">
            <p className="text-sm leading-6 text-slate-300 whitespace-pre-wrap">
              {source.snippet}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
