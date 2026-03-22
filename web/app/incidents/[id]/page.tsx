'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

const API_BASE = 'https://unflattering-elinor-distinctively.ngrok-free.dev';

// ─── Palette (matches page.tsx) ──────────────────────────────
const C = {
  bg:      '#18202e',
  surface: '#1f2d40',
  raised:  '#263548',
  border:  '#2e4060',
  rim:     '#3a5070',
  txt:     '#e8f4ff',
  sub:     '#9cc9f5',
  dim:     '#5c7a99',
  green:   '#00d4aa',
  purple:  '#7c72fa',
  blue:    '#00a3ff',
  orange:  '#fb923c',
  pink:    '#e879f9',
  red:     '#f87171',
  yellow:  '#fbbf24',
};

const chip = (color: string, alpha = 0.18) => ({
  bg: `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`,
  border: `${color}44`, color,
});

const SEV: Record<string, ReturnType<typeof chip>> = {
  low:      chip(C.blue),
  medium:   chip(C.yellow),
  high:     chip(C.orange),
  critical: chip(C.red, 0.25),
};
const STAT: Record<string, ReturnType<typeof chip>> = {
  open:          chip(C.red),
  investigating: chip(C.yellow),
  resolved:      chip(C.green),
};

const Chip = ({ label, c }: { label: string; c: ReturnType<typeof chip> }) => (
  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
    background: c.bg, color: c.color, border: `1px solid ${c.border}`, letterSpacing: '0.04em' }}>
    {label}
  </span>
);

const card  = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 };

const gridBg = {
  backgroundImage: `
    linear-gradient(${C.border}55 1px, transparent 1px),
    linear-gradient(90deg, ${C.border}55 1px, transparent 1px),
    radial-gradient(ellipse at 70% 0%, #1a3d6e 0%, #18202e 45%, #0e161f 100%)
  `,
  backgroundSize: '44px 44px, 44px 44px, 100% 100%',
};

// ─── Interfaces ───────────────────────────────────────────────
interface CodingContext {
  summary: string;
  decisions: string[];
  assumptions: string[];
  files_changed: string[];
  intended_outcome: string;
  session_timestamp: string;
}
interface PR {
  pr_id: string; title: string; description: string; author: string;
  commit_sha: string; status: string; created_at: string; merged_at: string | null;
}
interface Deployment {
  deployment_id: string; commit_sha: string; environment: string;
  service_name: string; timestamp: string; status: string; deployed_by: string;
}
interface Incident {
  incident_id: string; title: string; symptoms: string; impacted_service: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  created_at: string;
  deployment?: Deployment; related_pr?: PR; coding_context?: CodingContext;
}
interface FixDraft {
  incident_id: string; analysis: string; probable_cause: string;
  proposed_fix: string; patch_notes: string; review_state: string; draft_id: string;
}

// ─── Transcript modal ─────────────────────────────────────────
function TranscriptModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [mode, setMode]         = useState<'raw' | 'refined'>('raw');
  const [transcript, setTranscript] = useState<any>(null);
  const [refined, setRefined]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE}/transcripts/${sessionId}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        setTranscript(await r.json());
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [sessionId]);

  const loadRefined = async () => {
    if (refined) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/transcripts/${sessionId}/refined`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      setRefined(await r.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  const switchMode = (m: 'raw' | 'refined') => {
    setMode(m);
    if (m === 'refined') loadRefined();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 16, background: 'rgba(10,16,28,0.85)', backdropFilter: 'blur(8px)' }}>
      <div style={{ ...card, width: '100%', maxWidth: 760, maxHeight: '82vh', display: 'flex',
        flexDirection: 'column', boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px ${C.blue}20` }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.txt }}>Session Transcript</div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontFamily: 'monospace' }}>{sessionId}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {(['raw', 'refined'] as const).map(m => (
              <button key={m} onClick={() => switchMode(m)}
                style={{ padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  background: mode === m ? `${C.blue}20` : 'transparent',
                  color: mode === m ? C.blue : C.sub,
                  border: mode === m ? `1px solid ${C.blue}40` : `1px solid ${C.border}`,
                  transition: 'all 0.15s' }}>
                {m === 'raw' ? 'Raw Logs' : 'Refined'}
              </button>
            ))}
            <button onClick={onClose}
              style={{ marginLeft: 8, width: 28, height: 28, borderRadius: '50%', border: `1px solid ${C.border}`,
                background: C.raised, color: C.sub, cursor: 'pointer', fontSize: 16, display: 'flex',
                alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[80, 60, 90, 70, 50].map((w, i) => (
                <div key={i} style={{ height: 14, borderRadius: 4, background: C.raised,
                  width: `${w}%`, animation: 'shimmer 1.5s infinite' }} />
              ))}
              <style>{`@keyframes shimmer{0%,100%{opacity:0.4}50%{opacity:0.9}}`}</style>
            </div>
          ) : mode === 'raw' && transcript ? (
            transcript.messages?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {transcript.messages.map((msg: any, i: number) => (
                  <div key={i} style={{ padding: '12px 16px', borderRadius: 8,
                    background: msg.role === 'user' ? `${C.blue}12` : C.raised,
                    borderLeft: `3px solid ${msg.role === 'user' ? C.blue : C.dim}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: msg.role === 'user' ? C.blue : C.dim,
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                      {msg.role} · {new Date(msg.timestamp).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 13, color: C.txt, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.content}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: C.sub }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                <div style={{ fontSize: 13 }}>No transcript available for this session.</div>
              </div>
            )
          ) : mode === 'refined' && refined ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: `${C.green}12`,
                border: `1px solid ${C.green}30`, fontSize: 11, color: C.green }}>
                Generated: {new Date(refined.generated_at).toLocaleString()}{refined.cached && ' · Cached'}
              </div>
              <div style={{ fontSize: 13, color: C.txt, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {refined.refined_content}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: C.dim, padding: '60px 0', fontSize: 13 }}>No data</div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={onClose}
            style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: C.raised, color: C.sub, border: `1px solid ${C.border}` }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: incidentId } = use(params);
  const [incident,       setIncident]       = useState<Incident | null>(null);
  const [fix,            setFix]            = useState<FixDraft | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [draftingFix,    setDraftingFix]    = useState(false);
  const [assigningReview,setAssigningReview]= useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/incidents/${incidentId}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        const data = await r.json();
        setIncident(data);
        draftFix(data.incident_id);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [incidentId]);

  const draftFix = async (id: string) => {
    setDraftingFix(true);
    try {
      const r = await fetch(`${API_BASE}/api/fix/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ incident_id: id }),
      });
      setFix(await r.json());
    } catch(e) { console.error(e); }
    finally { setDraftingFix(false); }
  };

  const assignForReview = async () => {
    if (!fix) return;
    setAssigningReview(true);
    try {
      await fetch(`${API_BASE}/api/reviews/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ draft_id: fix.draft_id, reviewer: 'senior-engineer@company.com',
          comment: 'AI-drafted fix ready for review' }),
      });
      setFix({ ...fix, review_state: 'in_review' });
    } catch(e) { console.error(e); }
    finally { setAssigningReview(false); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', ...gridBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {[C.blue, C.purple, C.green].map((col, i) => (
          <div key={col} style={{ width: 8, height: 8, borderRadius: '50%', background: col,
            animation: `bounce 1s ${i * 0.15}s infinite alternate` }} />
        ))}
        <span style={{ color: C.sub, fontSize: 14, marginLeft: 8 }}>Loading incident…</span>
      </div>
      <style>{`@keyframes bounce{from{transform:translateY(0)}to{transform:translateY(-8px)}}`}</style>
    </div>
  );

  if (!incident) return (
    <div style={{ minHeight: '100vh', ...gridBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...card, padding: '40px 60px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
        <div style={{ color: C.sub, fontSize: 14 }}>Incident not found</div>
        <Link href="/" style={{ display: 'inline-block', marginTop: 20, fontSize: 13, color: C.blue }}>← Back to dashboard</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', ...gridBg, color: C.txt, fontFamily: 'inherit' }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes shimmer{0%,100%{opacity:0.4}50%{opacity:0.9}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── Header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 30,
        background: `${C.surface}f0`, backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.border}`,
        boxShadow: `0 1px 0 0 ${C.rim}, 0 4px 24px rgba(0,0,0,0.35)` }}>
        <div style={{ padding: '0 28px', height: 56, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Logo */}
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'linear-gradient(135deg,#1f2d40 0%,#00a3ff 100%)',
                boxShadow: '0 0 16px rgba(0,163,255,0.45)', fontWeight: 800, fontSize: 14, color: '#fff' }}>N</div>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.txt, letterSpacing: '-0.01em' }}>Whitebox</span>
            </Link>

            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.dim }}>
              <span>/</span>
              <Link href="/" style={{ color: C.sub, textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = C.txt)}
                onMouseLeave={e => (e.currentTarget.style.color = C.sub)}>
                Incidents
              </Link>
              <span>/</span>
              <span style={{ color: C.txt, fontFamily: 'monospace', fontSize: 12 }}>
                {incident.incident_id.slice(0, 24)}…
              </span>
            </div>
          </div>

          {/* Status pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Chip label={incident.severity.toUpperCase()} c={SEV[incident.severity] ?? SEV.low} />
            <Chip label={incident.status} c={STAT[incident.status] ?? STAT.resolved} />
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px',
        animation: 'fadeUp 0.35s cubic-bezier(0.22,1,0.36,1) both' }}>

        {/* Title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: C.txt, letterSpacing: '-0.02em',
            margin: '0 0 12px', lineHeight: 1.25 }}>{incident.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Incident ID badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 6, background: C.raised,
              border: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase',
                letterSpacing: '0.08em' }}>ID</span>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.sub, userSelect: 'all' }}>
                {incident.incident_id}
              </span>
            </div>
            <span style={{ fontSize: 11, color: C.dim }}>{incident.impacted_service}</span>
            <span style={{ fontSize: 11, color: C.dim }}>·</span>
            <span style={{ fontSize: 11, color: C.dim }}>{new Date(incident.created_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Incident details */}
        <div style={{ ...card, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: 16 }}>Incident Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { label: 'Symptoms',        val: incident.symptoms },
              { label: 'Impacted Service', val: incident.impacted_service },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, textTransform: 'uppercase',
                  letterSpacing: '0.07em', marginBottom: 6 }}>{f.label}</div>
                <div style={{ fontSize: 13, color: C.txt, lineHeight: 1.6 }}>{f.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        {incident.deployment && incident.related_pr && (
          <div style={{ ...card, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase',
              letterSpacing: '0.1em', marginBottom: 16 }}>Timeline</div>
            <div style={{ position: 'relative', paddingLeft: 28 }}>
              <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2,
                background: `linear-gradient(to bottom, ${C.blue}, ${C.green}, ${C.red})`, borderRadius: 1 }} />
              {[
                { label: 'PR Merged', sub: `${incident.related_pr.pr_id}: ${incident.related_pr.title}`,
                  date: incident.related_pr.merged_at ? new Date(incident.related_pr.merged_at).toLocaleString() : '—',
                  color: C.blue },
                { label: `Deployed → ${incident.deployment.environment}`,
                  sub: incident.deployment.commit_sha,
                  date: new Date(incident.deployment.timestamp).toLocaleString(), color: C.green, mono: true },
                { label: 'Incident Triggered', sub: incident.title,
                  date: new Date(incident.created_at).toLocaleString(), color: C.red },
              ].map((t, i, arr) => (
                <div key={t.label} style={{ display: 'flex', gap: 16, position: 'relative',
                  paddingBottom: i < arr.length - 1 ? 20 : 0 }}>
                  <div style={{ position: 'absolute', left: -21, top: 3, width: 10, height: 10,
                    borderRadius: '50%', background: t.color, border: `2px solid ${C.bg}`,
                    boxShadow: `0 0 8px ${t.color}` }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.txt, marginBottom: 2 }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: C.sub, marginBottom: 2,
                      fontFamily: t.mono ? 'monospace' : 'inherit' }}>{t.sub}</div>
                    <div style={{ fontSize: 11, color: C.dim }}>{t.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Coding Context */}
        {incident.coding_context && (
          <div style={{ marginBottom: 16, padding: '20px 24px', borderRadius: 10,
            background: `${C.blue}0e`, border: `1px solid ${C.blue}35`,
            borderLeft: `3px solid ${C.blue}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8,
                  background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 11, color: '#fff', flexShrink: 0 }}>AI</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>AI Coding Context</div>
                  <div style={{ fontSize: 11, color: C.dim }}>Captured from developer session</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  background: `${C.blue}22`, color: C.blue, border: `1px solid ${C.blue}40`,
                  textTransform: 'uppercase', letterSpacing: '0.06em' }}>THE MAGIC</span>
              </div>
              <button onClick={() => setShowTranscript(true)}
                style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  background: `${C.blue}18`, color: C.blue, border: `1px solid ${C.blue}35`,
                  transition: 'background 0.15s' }}>
                View Transcript
              </button>
            </div>

            <div style={{ fontSize: 13, color: C.txt, fontStyle: 'italic', lineHeight: 1.6,
              marginBottom: 12, padding: '12px 16px', borderRadius: 8, background: `${C.blue}08`,
              border: `1px solid ${C.border}` }}>
              "{incident.coding_context.summary}"
            </div>

            {/* Session ID badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
              padding: '7px 14px', borderRadius: 7, background: C.raised, border: `1px solid ${C.border}`,
              width: 'fit-content' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase',
                letterSpacing: '0.08em' }}>Session ID</span>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.sub }}>
                {incident.coding_context.session_timestamp}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Decisions */}
              <div style={{ background: C.raised, borderRadius: 8, overflow: 'hidden',
                border: `1px solid ${C.border}` }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12 }}>📋</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.blue }}>Key Decisions</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 7px', borderRadius: 999,
                    background: `${C.blue}20`, color: C.blue }}>{incident.coding_context.decisions.length}</span>
                </div>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {incident.coding_context.decisions.map((d, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%',
                        background: `linear-gradient(135deg,${C.blue},${C.purple})`,
                        color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                      <p style={{ fontSize: 12, color: C.txt, lineHeight: 1.5, margin: 0 }}>{d}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assumptions */}
              <div style={{ background: C.raised, borderRadius: 8, overflow: 'hidden',
                border: `1px solid ${C.border}` }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12 }}>⚠️</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.red }}>Assumptions</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 7px', borderRadius: 999,
                    background: `${C.red}20`, color: C.red }}>{incident.coding_context.assumptions.length}</span>
                </div>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {incident.coding_context.assumptions.map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: `${C.red}25`,
                        color: C.red, fontSize: 10, fontWeight: 800, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>!</div>
                      <p style={{ fontSize: 12, color: C.txt, lineHeight: 1.5, margin: 0 }}>{a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Files changed */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, textTransform: 'uppercase',
                letterSpacing: '0.07em', marginBottom: 8 }}>Files Changed</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {incident.coding_context.files_changed.map((f, i) => (
                  <span key={i} style={{ fontFamily: 'monospace', fontSize: 12, padding: '3px 10px',
                    borderRadius: 6, background: C.raised, color: C.green,
                    border: `1px solid ${C.border}` }}>{f}</span>
                ))}
              </div>
            </div>

            {incident.coding_context.intended_outcome && (
              <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8,
                background: `${C.green}0e`, border: `1px solid ${C.green}30`,
                borderLeft: `3px solid ${C.green}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.green, textTransform: 'uppercase',
                  letterSpacing: '0.07em', marginBottom: 6 }}>Intended Outcome</div>
                <p style={{ fontSize: 13, color: C.txt, lineHeight: 1.6, margin: 0 }}>
                  {incident.coding_context.intended_outcome}
                </p>
              </div>
            )}
          </div>
        )}


        {/* AI Fix — loading skeleton */}
        {draftingFix && !fix && (
          <div style={{ ...card, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`,
              background: `${C.purple}0c`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.purple,
                boxShadow: `0 0 8px ${C.purple}`, animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 13, color: C.sub, animation: 'pulse 1.5s infinite' }}>AI is analyzing…</span>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[['100%', 14], ['75%', 14], ['90%', 14], ['100%', 80], ['60%', 14], ['100%', 60]].map(([w, h], i) => (
                <div key={i} style={{ height: h as number, borderRadius: 6, background: C.raised,
                  width: w as string, animation: 'shimmer 1.5s infinite' }} />
              ))}
            </div>
          </div>
        )}

        {/* AI Fix result */}
        {fix && (
          <div style={{ ...card, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`,
              background: `${C.purple}0c`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.purple,
                  boxShadow: `0 0 8px ${C.purple}` }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: C.txt }}>AI-Drafted Fix</span>
              </div>
              <Chip label={fix.review_state} c={chip(C.purple)} />
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { label: 'Analysis',       content: fix.analysis,       color: C.txt },
                { label: 'Probable Cause', content: fix.probable_cause, color: C.red,
                  bg: `${C.red}10`, border: `${C.red}30` },
                { label: 'Proposed Fix',   content: fix.proposed_fix,   color: C.txt },
              ].map(({ label, content, color, bg, border }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase',
                    letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color,
                    ...(bg ? { background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '10px 14px' } : {}) }}>
                    {content}
                  </div>
                </div>
              ))}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase',
                  letterSpacing: '0.1em', marginBottom: 8 }}>Patch Notes</div>
                <pre style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7, color: C.green,
                  background: '#111a27', border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: '14px 18px', margin: 0, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                  {fix.patch_notes}
                </pre>
              </div>

              <button onClick={assignForReview}
                disabled={assigningReview || fix.review_state === 'in_review'}
                style={{ width: '100%', padding: '11px 0', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  color: '#fff', border: 'none',
                  cursor: fix.review_state === 'in_review' ? 'default' : 'pointer',
                  background: `linear-gradient(135deg,${C.purple},${C.blue})`,
                  opacity: fix.review_state === 'in_review' ? 0.65 : 1,
                  boxShadow: `0 0 20px ${C.purple}40` }}>
                {assigningReview ? 'Assigning…' : fix.review_state === 'in_review' ? '✓ Assigned for Review' : 'Assign for Review'}
              </button>
            </div>
          </div>
        )}

        {/* Footer stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 8 }}>
          {[
            { label: 'Context Reconstruction', val: '0 min',   vs: 'vs 30–60 min', color: C.blue   },
            { label: 'Root Cause ID',           val: fix ? '~3 sec' : '—', vs: 'vs 1–2 hours', color: C.purple },
            { label: 'Total MTTR',              val: '~15 min', vs: 'vs 2–4 hours', color: C.green  },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding: '16px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.color }} />
              <div style={{ fontSize: 10, fontWeight: 600, color: C.dim, textTransform: 'uppercase',
                letterSpacing: '0.07em', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: C.green, fontWeight: 600, marginTop: 4 }}>↓ {s.vs}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Transcript modal */}
      {showTranscript && incident.coding_context && (
        <TranscriptModal
          sessionId={incident.coding_context.session_timestamp}
          onClose={() => setShowTranscript(false)}
        />
      )}
    </div>
  );
}
