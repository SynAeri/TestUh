"use client";

import { useState } from "react";
import { type SaaSApp, type AppUser, generateRemovalEmail } from "@/lib/mock-data";

function DonutChart({
  value,
  total,
  color,
}: {
  value: number;
  total: number;
  color: string;
}) {
  const pct = total === 0 ? 0 : value / total;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="36" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="600">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

function EmailPreview({ user, app }: { user: AppUser; app: SaaSApp }) {
  const [copied, setCopied] = useState(false);
  const email = generateRemovalEmail(user, app);

  function handleCopy() {
    void navigator.clipboard.writeText(
      `Subject: ${email.subject}\n\n${email.body}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-4 rounded-xl border border-sky-400/20 bg-slate-950/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-violet-400">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">
            Generated Removal Email
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-400 transition hover:text-white"
        >
          {copied ? (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <p className="mb-3 rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-[11px] font-medium text-slate-300">
        <span className="text-slate-500">To: </span>{user.email}
        <br />
        <span className="text-slate-500">Subject: </span>{email.subject}
      </p>
      <pre className="whitespace-pre-wrap text-[11px] leading-5 text-slate-400 font-mono">
        {email.body}
      </pre>
    </div>
  );
}

function UserRow({
  user,
  app,
}: {
  user: AppUser;
  app: SaaSApp;
}) {
  const [showEmail, setShowEmail] = useState(false);
  const lastActive = new Date(user.last_active).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const daysSince = Math.floor(
    (Date.now() - new Date(user.last_active).getTime()) / 86_400_000,
  );

  return (
    <div
      className={`rounded-xl border p-3.5 transition-all ${
        user.recommended_for_removal
          ? "border-rose-400/20 bg-rose-400/4"
          : "border-white/8 bg-white/3"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${user.recommended_for_removal ? "bg-rose-500/20 text-rose-300" : "bg-white/10 text-slate-300"}`}>
            {user.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-[11px] text-slate-500">{user.department} · {user.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {user.recommended_for_removal && (
            <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-300">
              Remove
            </span>
          )}
          <div className="text-right">
            <p className="text-xs font-semibold text-white">
              {user.daily_usage_minutes}m/day
            </p>
            <p className="text-[11px] text-slate-500">{lastActive}</p>
          </div>
        </div>
      </div>

      {user.recommended_for_removal && (
        <>
          <p className="mt-2.5 pl-11 text-[11px] leading-5 text-rose-400/80">
            {user.removal_reason}
          </p>
          <div className="mt-2.5 pl-11 flex items-center justify-between">
            <p className="text-[11px] text-slate-500">
              {daysSince} days since last active · ${user.seat_cost_monthly}/mo
            </p>
            <button
              type="button"
              onClick={() => setShowEmail(!showEmail)}
              className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 transition"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              {showEmail ? "Hide email" : "Draft removal email"}
            </button>
          </div>
          {showEmail && <EmailPreview user={user} app={app} />}
        </>
      )}
    </div>
  );
}

export default function AppDetailModal({
  app,
  onClose,
}: {
  app: SaaSApp;
  onClose: () => void;
}) {
  const removalCandidates = app.users.filter((u) => u.recommended_for_removal);
  const monthlySavingsFromRemovals = removalCandidates.reduce(
    (s, u) => s + u.seat_cost_monthly,
    0,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f1e] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/8 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
              {app.logo_emoji}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{app.name}</h2>
              <p className="text-xs text-slate-500 capitalize">
                {app.category} · {app.pricing_model}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-1.5 text-slate-500 transition hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-0 border-b border-white/8">
          {[
            { label: "Monthly cost", value: `$${app.monthly_cost.toLocaleString()}` },
            { label: "Total seats", value: app.total_seats },
            { label: "Active seats", value: app.active_seats },
            { label: "Potential savings", value: `$${app.potential_monthly_savings}/mo`, highlight: app.potential_monthly_savings > 0 },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`px-4 py-3 ${i < 3 ? "border-r border-white/8" : ""}`}
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {stat.label}
              </p>
              <p className={`mt-0.5 text-base font-bold ${stat.highlight ? "text-emerald-400" : "text-white"}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Seat utilisation */}
        <div className="flex items-center gap-4 border-b border-white/8 px-6 py-4">
          <DonutChart
            value={app.active_seats}
            total={app.total_seats}
            color={app.active_seats / app.total_seats < 0.6 ? "#f87171" : "#34d399"}
          />
          <div>
            <p className="text-sm font-semibold text-white">
              {app.active_seats} / {app.total_seats} seats in use
            </p>
            <p className="text-xs text-slate-500">
              {app.total_seats - app.active_seats} unused ·{" "}
              {Math.round((app.active_seats / app.total_seats) * 100)}% utilisation
            </p>
            {removalCandidates.length > 0 && (
              <p className="mt-1 text-xs text-rose-400">
                {removalCandidates.length} user{removalCandidates.length > 1 ? "s" : ""} recommended for removal · saves ${monthlySavingsFromRemovals}/mo
              </p>
            )}
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Users · {app.users.length}
          </p>
          <div className="space-y-2">
            {/* Removal candidates first */}
            {[
              ...app.users.filter((u) => u.recommended_for_removal),
              ...app.users.filter((u) => !u.recommended_for_removal),
            ].map((user) => (
              <UserRow key={user.id} user={user} app={app} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
