'use client';

import { useEffect, useRef, useState } from 'react';

const API_BASE = 'https://unflattering-elinor-distinctively.ngrok-free.dev';

interface Incident {
  incident_id: string;
  title: string;
  symptoms: string;
  impacted_service: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  created_at: string;
}
interface Context {
  summary: string;
  decisions: string[];
  assumptions: string[];
  files_changed: string[];
  intended_outcome: string;
  session_timestamp: string;
}
interface PR {
  pr_id: string; title: string; status: string; author: string;
  created_at: string; merged_at: string | null;
}
interface Deployment {
  deployment_id: string; environment: string; service_name: string;
  timestamp: string; deployed_by: string; commit_sha: string;
}
interface IncidentDetail {
  incident_id: string; title: string; symptoms: string; impacted_service: string;
  severity: string; status: string; created_at: string;
  deployment?: Deployment; related_pr?: PR; coding_context?: Context;
}
interface FixDraft {
  incident_id: string; analysis: string; probable_cause: string;
  proposed_fix: string; patch_notes: string; review_state: string; draft_id: string;
}

// ─── Palette (templatemonster #532627 — Dark Navy + Electric Blue) ───
const C = {
  bg:      '#18202e',   // deep navy page bg
  surface: '#1f2d40',   // card surface  (#2d394b lightened slightly inward)
  raised:  '#263548',   // raised element
  border:  '#2e4060',   // subtle border
  rim:     '#3a5070',   // stronger divider
  txt:     '#e8f4ff',   // cool near-white (slight blue tint)
  sub:     '#9cc9f5',   // site's exact light-blue secondary text
  dim:     '#5c7a99',   // dimmed / placeholder
  // accents
  green:   '#00d4aa',   // teal-green for resolved
  purple:  '#7c72fa',   // soft violet
  blue:    '#00a3ff',   // site's exact bright blue — primary accent
  orange:  '#fb923c',   // warning / high sev
  pink:    '#e879f9',   // vibrant pink
  red:     '#f87171',   // error / open
  yellow:  '#fbbf24',   // amber / medium sev
};

// ─── Chip helper ─────────────────────────────────────────────
const chip = (color: string, alpha = 0.18) =>
  ({ bg: `${color}${Math.round(alpha * 255).toString(16).padStart(2,'0')}`,
     border: `${color}44`, color });

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
  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full tracking-wide"
    style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
    {label}
  </span>
);

const dotColor = (s: string) =>
  s === 'open' ? C.red : s === 'investigating' ? C.yellow : C.green;

// ─── Severity → left-border accent (Firebase-style) ─────────
const accentColor = (s: string) =>
  ({ low: C.blue, medium: C.yellow, high: C.orange, critical: C.red }[s] ?? C.dim);

// ─── Shared style helpers ────────────────────────────────────
const card  = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 };
const panel = { background: C.raised,  border: `1px solid ${C.border}`, borderRadius: 8  };

export default function MainDashboard() {
  const [incidents,        setIncidents]        = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [fix,              setFix]              = useState<FixDraft | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [showContextModal, setShowContextModal] = useState(false);
  const [draftingFix,      setDraftingFix]      = useState(false);
  const [assigningReview,  setAssigningReview]  = useState(false);
  const [activeTab, setActiveTab] = useState<'overview'|'decisions'|'incidents'|'connections'>('incidents');
  const [loadingIncident,  setLoadingIncident]  = useState(false);
  const [loadingIncidentId,setLoadingIncidentId]= useState<string|null>(null);
  const [contextTranscript,setContextTranscript]= useState('');
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const navContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { loadDashboardData(); }, []);

  useEffect(() => {
    const btn = tabButtonRefs.current[activeTab];
    const nav = navContainerRef.current;
    if (!btn || !nav) return;
    const bRect = btn.getBoundingClientRect();
    const nRect = nav.getBoundingClientRect();
    setIndicator({ left: bRect.left - nRect.left, width: bRect.width, ready: true });
  }, [activeTab]);

  const loadDashboardData = async () => {
    try {
      const data = await fetch(`${API_BASE}/api/incidents`,
        { headers:{ 'ngrok-skip-browser-warning':'true' } }).then(r=>r.json());
      setIncidents(data);
      if (data.length > 0) loadIncidentDetails(data[0].incident_id);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  };

  const loadIncidentDetails = async (id: string) => {
    setLoadingIncident(true); setLoadingIncidentId(id);
    setFix(null); setSelectedIncident(null);
    try {
      const data = await fetch(`${API_BASE}/api/incidents/${id}`,
        { headers:{ 'ngrok-skip-browser-warning':'true' } }).then(r=>r.json());
      setSelectedIncident(data); draftFix(id);
    } catch(e){ console.error(e); }
    finally { setLoadingIncident(false); setLoadingIncidentId(null); }
  };

  const draftFix = async (incidentId?: string) => {
    const id = incidentId ?? selectedIncident?.incident_id;
    if (!id) return;
    setDraftingFix(true);
    try {
      setFix(await fetch(`${API_BASE}/api/fix/draft`,{
        method:'POST',
        headers:{'Content-Type':'application/json','ngrok-skip-browser-warning':'true'},
        body: JSON.stringify({ incident_id: id }),
      }).then(r=>r.json()));
    } catch(e){ console.error(e); } finally { setDraftingFix(false); }
  };

  const assignForReview = async () => {
    if (!fix) return; setAssigningReview(true);
    try {
      await fetch(`${API_BASE}/api/reviews/assign`,{
        method:'POST',
        headers:{'Content-Type':'application/json','ngrok-skip-browser-warning':'true'},
        body: JSON.stringify({ draft_id: fix.draft_id, reviewer:'senior-engineer@company.com', comment:'AI-drafted fix ready for review' }),
      });
      setFix({ ...fix, review_state:'in_review' });
    } catch(e){ console.error(e); } finally { setAssigningReview(false); }
  };

  const saveContext = async () => {
    try {
      const data = await fetch(`${API_BASE}/api/context`,{
        method:'POST',
        headers:{'Content-Type':'application/json','ngrok-skip-browser-warning':'true'},
        body: JSON.stringify({ transcript: contextTranscript }),
      }).then(r=>r.json());
      setShowContextModal(false); setContextTranscript('');
      alert(`Context saved: ${data.context_id}`);
    } catch(e){ console.error(e); }
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', background: C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {[C.purple, C.green, C.blue].map((col,i)=>(
          <div key={col} style={{ width:8, height:8, borderRadius:'50%', background:col,
            animation:`bounce 1s ${i*0.15}s infinite alternate` }} />
        ))}
        <span style={{ color: C.sub, fontSize:14, marginLeft:8 }}>Loading OpenBox…</span>
      </div>
      <style>{`@keyframes bounce{from{transform:translateY(0)}to{transform:translateY(-8px)}}`}</style>
    </div>
  );

  const openCount          = incidents.filter(i=>i.status==='open').length;
  const resolvedCount      = incidents.filter(i=>i.status==='resolved').length;
  const investigatingCount = incidents.filter(i=>i.status==='investigating').length;

  const tabs = [
    { id:'overview'    as const, label:'Overview'    },
    { id:'decisions'   as const, label:'Decisions'   },
    { id:'incidents'   as const, label:'Incidents',  count: openCount },
    { id:'connections' as const, label:'Connections' },
  ];

  // ── GRID BG with subtle radial gradient ──────────────────
  const gridBg = {
    backgroundImage: `
      linear-gradient(${C.border}55 1px, transparent 1px),
      linear-gradient(90deg, ${C.border}55 1px, transparent 1px),
      radial-gradient(ellipse at 70% 0%, #1a3d6e 0%, #18202e 45%, #0e161f 100%)
    `,
    backgroundSize: '44px 44px, 44px 44px, 100% 100%',
  };

  return (
    <div style={{ minHeight:'100vh', ...gridBg, color: C.txt, fontFamily:'inherit' }}>

      {/* ───── HEADER ───── */}
      <header style={{
        position:'sticky', top:0, zIndex:30,
        background:`${C.surface}f0`, backdropFilter:'blur(20px)',
        borderBottom:`1px solid ${C.border}`,
        boxShadow:`0 1px 0 0 ${C.rim}, 0 4px 24px rgba(0,0,0,0.35)`,
      }}>
        <div style={{ padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {/* Logo + nav */}
          <div style={{ display:'flex', alignItems:'center', gap:32 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <img src="/openbox.jpg" alt="OpenBox" style={{ height:40, width:'auto', mixBlendMode:'screen',
  WebkitMaskImage:'radial-gradient(ellipse 85% 85% at center, black 40%, transparent 100%)',
  maskImage:'radial-gradient(ellipse 85% 85% at center, black 40%, transparent 100%)' }} />
              <div style={{ fontSize:10, color: C.dim, textTransform:'uppercase', letterSpacing:'0.08em' }}>Incident Intelligence</div>
            </div>

            {/* Tabs — elastic sliding pill */}
            <div ref={navContainerRef} style={{ position:'relative', display:'flex', gap:2 }}>
              {/* sliding background pill */}
              {indicator.ready && (
                <div style={{
                  position:'absolute', top:0, height:'100%', borderRadius:7, pointerEvents:'none',
                  background:`${C.blue}18`, border:`1px solid ${C.blue}40`,
                  transform:`translateX(${indicator.left}px)`,
                  width: indicator.width,
                  transition:'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), width 0.45s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
              )}
              {tabs.map(t => {
                const active = activeTab === t.id;
                return (
                  <button key={t.id}
                    ref={el => { tabButtonRefs.current[t.id] = el; }}
                    onClick={()=>setActiveTab(t.id)}
                    style={{
                      position:'relative', zIndex:1,
                      padding:'6px 14px', borderRadius:7, fontSize:13, fontWeight:500,
                      display:'flex', alignItems:'center', gap:6, cursor:'pointer',
                      background:'transparent', border:'1px solid transparent',
                      color: active ? C.blue : C.sub,
                      transition:'color 0.2s',
                    }}>
                    {t.label}
                    {t.count !== undefined && t.count > 0 && (
                      <span style={{ background: C.red, color:'#fff', fontSize:10, fontWeight:700,
                        width:16, height:16, borderRadius:'50%', display:'inline-flex',
                        alignItems:'center', justifyContent:'center',
                        transition:'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                        transform: active ? 'scale(1.15)' : 'scale(1)',
                      }}>{t.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {openCount > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 14px',
              borderRadius:999, background:`${C.red}18`, border:`1px solid ${C.red}44`,
              color: C.red, fontSize:12, fontWeight:600 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background: C.red,
                boxShadow:`0 0 6px ${C.red}`, animation:'pulse 1.5s infinite' }} />
              {openCount} active incident{openCount!==1?'s':''}
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
            </div>
          )}
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════
          OVERVIEW
      ══════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes tabEnter {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .tab-content { animation: tabEnter 0.35s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {activeTab === 'overview' && (
        <div key="overview" className="tab-content" style={{ maxWidth:1100, margin:'0 auto', padding:'36px 24px' }}>
          <div style={{ marginBottom:28 }}>
            <h1 style={{ fontSize:26, fontWeight:700, color: C.txt, letterSpacing:'-0.02em', margin:0 }}>Overview</h1>
            <p style={{ color: C.sub, fontSize:13, marginTop:4 }}>Real-time incident intelligence dashboard</p>
          </div>

          {/* Stat cards — Firebase-style with colored top border */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:20 }}>
            {[
              { label:'Total Incidents', val: incidents.length, color: C.purple, icon:'📊' },
              { label:'Open',            val: openCount,          color: C.red,    icon:'🔴' },
              { label:'Investigating',   val: investigatingCount, color: C.yellow, icon:'🔍' },
              { label:'Resolved',        val: resolvedCount,      color: C.green,  icon:'✅' },
            ].map(s=>(
              <div key={s.label} style={{ ...card, padding:'20px 20px 16px', overflow:'hidden', position:'relative' }}>
                {/* colored top bar (Firebase pattern) */}
                <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background: s.color, borderRadius:'8px 8px 0 0' }} />
                <div style={{ fontSize:11, fontWeight:600, color: C.sub, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>{s.label}</div>
                <div style={{ fontSize:36, fontWeight:800, color: s.color, lineHeight:1 }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* MTTR cards — Supabase-style with gradient orb */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20 }}>
            {[
              { icon:'⚡', label:'Context Reconstruction', val:'0 min',   vs:'30–60 min', grad:`${C.purple},${C.blue}` },
              { icon:'🎯', label:'Root Cause ID',          val:'~3 sec',  vs:'1–2 hours', grad:`${C.blue},${C.green}` },
              { icon:'🚀', label:'Total MTTR',             val:'~15 min', vs:'2–4 hours', grad:`${C.green},${C.pink}` },
            ].map(m=>(
              <div key={m.label} style={{ ...card, padding:20, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%',
                  background:`linear-gradient(135deg,${m.grad})`, opacity:0.12 }} />
                <div style={{ fontSize:22, marginBottom:10 }}>{m.icon}</div>
                <div style={{ fontSize:11, fontWeight:600, color: C.sub, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>{m.label}</div>
                <div style={{ fontSize:24, fontWeight:800, color: C.txt, letterSpacing:'-0.02em' }}>{m.val}</div>
                <div style={{ fontSize:11, color: C.green, fontWeight:600, marginTop:6 }}>↓ vs {m.vs} traditional</div>
              </div>
            ))}
          </div>

          {/* Recent incidents table — Linear/Supabase style */}
          <div style={{ ...card, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:600, fontSize:14, color: C.txt }}>Recent Incidents</div>
              <button onClick={()=>setActiveTab('incidents')}
                style={{ fontSize:12, color: C.purple, background:'none', border:'none', cursor:'pointer', fontWeight:500 }}>
                View all →
              </button>
            </div>
            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:12, padding:'8px 20px',
              borderBottom:`1px solid ${C.border}`, background: C.raised }}>
              {['Incident','Severity','Status'].map(h=>(
                <div key={h} style={{ fontSize:11, fontWeight:600, color: C.dim, textTransform:'uppercase', letterSpacing:'0.07em' }}>{h}</div>
              ))}
            </div>
            {incidents.slice(0,6).map((inc,i)=>(
              <div key={inc.incident_id}
                onClick={()=>{ setActiveTab('incidents'); loadIncidentDetails(inc.incident_id); }}
                style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:12, padding:'12px 20px',
                  alignItems:'center', cursor:'pointer', transition:'background 0.1s',
                  borderBottom: i<5 ? `1px solid ${C.border}` : 'none',
                  borderLeft:`3px solid ${accentColor(inc.severity)}` }}
                onMouseEnter={e=>(e.currentTarget.style.background=`${C.purple}08`)}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color: C.txt }}>{inc.title}</div>
                  <div style={{ fontSize:11, color: C.dim, marginTop:2, fontFamily:'monospace' }}>
                    {inc.incident_id.slice(0,28)} · {new Date(inc.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Chip label={inc.severity} c={SEV[inc.severity]??SEV.low} />
                <Chip label={inc.status}   c={STAT[inc.status]??STAT.resolved} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          DECISIONS
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'decisions' && (
        <div key="decisions" className="tab-content" style={{ maxWidth:900, margin:'0 auto', padding:'36px 24px' }}>
          <div style={{ marginBottom:28 }}>
            <h1 style={{ fontSize:26, fontWeight:700, color: C.txt, letterSpacing:'-0.02em', margin:0 }}>Engineering Decisions</h1>
            <p style={{ color: C.sub, fontSize:13, marginTop:4 }}>AI-captured decisions, assumptions, and intent from coding sessions</p>
          </div>

          {selectedIncident?.coding_context ? (
            <>
              {/* Session banner — Supabase info callout style */}
              <div style={{ marginBottom:20, padding:'16px 20px', borderRadius:10,
                background:`${C.purple}12`, border:`1px solid ${C.purple}44`,
                display:'flex', gap:16, alignItems:'flex-start' }}>
                <div style={{ width:36, height:36, borderRadius:8, background:`linear-gradient(135deg,${C.purple},${C.blue})`,
                  display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, color:'#fff', flexShrink:0 }}>AI</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:600, color: C.purple, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Active Session Context</div>
                  <div style={{ fontSize:13, color: C.txt, fontStyle:'italic', lineHeight:1.5 }}>"{selectedIncident.coding_context.summary}"</div>
                  <div style={{ display:'flex', gap:16, marginTop:8 }}>
                    {[`${selectedIncident.coding_context.decisions.length} decisions`,
                      `${selectedIncident.coding_context.files_changed.length} files`,
                      `${selectedIncident.coding_context.assumptions.length} assumptions`
                    ].map(l=><span key={l} style={{ fontSize:11, color: C.sub }}>{l}</span>)}
                  </div>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
                {/* Decisions */}
                <div style={{ ...card, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`,
                    display:'flex', alignItems:'center', gap:8, background:`${C.blue}08` }}>
                    <span style={{ fontSize:13 }}>📋</span>
                    <span style={{ fontSize:13, fontWeight:600, color: C.blue }}>Key Decisions</span>
                    <span style={{ marginLeft:'auto', fontSize:11, padding:'1px 8px', borderRadius:999,
                      background:`${C.blue}20`, color: C.blue }}>{selectedIncident.coding_context.decisions.length}</span>
                  </div>
                  <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
                    {selectedIncident.coding_context.decisions.map((d,i)=>(
                      <div key={i} style={{ display:'flex', gap:10 }}>
                        <div style={{ width:20, height:20, borderRadius:'50%', background:`linear-gradient(135deg,${C.purple},${C.blue})`,
                          color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{i+1}</div>
                        <p style={{ fontSize:13, color: C.txt, lineHeight:1.5, margin:0 }}>{d}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assumptions */}
                <div style={{ ...card, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`,
                    display:'flex', alignItems:'center', gap:8, background:`${C.red}08` }}>
                    <span style={{ fontSize:13 }}>⚠️</span>
                    <span style={{ fontSize:13, fontWeight:600, color: C.red }}>Assumptions</span>
                    <span style={{ marginLeft:'auto', fontSize:11, padding:'1px 8px', borderRadius:999,
                      background:`${C.red}20`, color: C.red }}>{selectedIncident.coding_context.assumptions.length}</span>
                  </div>
                  <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
                    {selectedIncident.coding_context.assumptions.map((a,i)=>(
                      <div key={i} style={{ display:'flex', gap:10 }}>
                        <div style={{ width:20, height:20, borderRadius:'50%', background:`${C.red}25`,
                          color: C.red, fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>!</div>
                        <p style={{ fontSize:13, color: C.txt, lineHeight:1.5, margin:0 }}>{a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Files — monospace pills */}
              <div style={{ ...card, overflow:'hidden', marginBottom:16 }}>
                <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:13 }}>📁</span>
                  <span style={{ fontSize:13, fontWeight:600, color: C.txt }}>Files Changed</span>
                  <span style={{ marginLeft:'auto', fontSize:11, padding:'1px 8px', borderRadius:999,
                    background:`${C.green}20`, color: C.green }}>{selectedIncident.coding_context.files_changed.length}</span>
                </div>
                <div style={{ padding:16, display:'flex', flexWrap:'wrap', gap:8 }}>
                  {selectedIncident.coding_context.files_changed.map((f,i)=>(
                    <span key={i} style={{ fontFamily:'monospace', fontSize:12, padding:'4px 10px', borderRadius:6,
                      background: C.raised, color: C.green, border:`1px solid ${C.border}` }}>{f}</span>
                  ))}
                </div>
              </div>

              {selectedIncident.coding_context.intended_outcome && (
                <div style={{ ...card, padding:20, borderLeft:`3px solid ${C.green}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:14 }}>🎯</span>
                    <span style={{ fontSize:13, fontWeight:600, color: C.green }}>Intended Outcome</span>
                  </div>
                  <p style={{ fontSize:13, color: C.txt, lineHeight:1.6, margin:0 }}>{selectedIncident.coding_context.intended_outcome}</p>
                </div>
              )}
            </>
          ) : (
            <div style={{ ...card, padding:80, textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🧠</div>
              <p style={{ fontSize:13, color: C.sub, marginBottom:20 }}>Select an incident to view its AI-captured decisions.</p>
              <button onClick={()=>setActiveTab('incidents')}
                style={{ padding:'9px 20px', borderRadius:8, fontSize:13, fontWeight:600, color:'#fff', cursor:'pointer',
                  background:`linear-gradient(135deg,${C.purple},${C.blue})`, border:'none' }}>
                Browse Incidents →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          INCIDENTS
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'incidents' && (
        <div key="incidents" className="tab-content" style={{ display:'flex', minHeight:'calc(100vh - 56px)' }}>

          {/* Discord-style channel list sidebar */}
          <div style={{ width:260, flexShrink:0, background: C.surface, borderRight:`1px solid ${C.border}`, overflowY:'auto' }}>
            <div style={{ padding:'16px 12px 8px' }}>
              <div style={{ fontSize:11, fontWeight:700, color: C.dim, textTransform:'uppercase',
                letterSpacing:'0.1em', padding:'0 8px', marginBottom:4 }}>Incidents</div>
              <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                {incidents.map(inc=>{
                  const active = selectedIncident?.incident_id===inc.incident_id || loadingIncidentId===inc.incident_id;
                  return (
                    <button key={inc.incident_id} onClick={()=>loadIncidentDetails(inc.incident_id)}
                      style={{ width:'100%', textAlign:'left', padding:'7px 10px', borderRadius:6, cursor:'pointer',
                        border:'none', transition:'background 0.1s', display:'flex', alignItems:'flex-start', gap:8,
                        background: active ? `${C.purple}20` : 'transparent' }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background: dotColor(inc.status),
                        flexShrink:0, marginTop:5 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight: active?600:400, color: active? C.txt : C.sub,
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{inc.title}</div>
                        <div style={{ fontSize:10, color: C.dim, fontFamily:'monospace', marginTop:2,
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {inc.incident_id}
                        </div>
                        <div style={{ fontSize:10, color: C.dim, marginTop:1 }}>
                          {new Date(inc.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ padding:'8px 12px 16px', borderTop:`1px solid ${C.border}`, marginTop:8 }}>
              <button onClick={()=>setShowContextModal(true)}
                style={{ width:'100%', padding:'8px 12px', borderRadius:7, fontSize:13, fontWeight:500,
                  cursor:'pointer', color: C.green, background:`${C.green}14`,
                  border:`1px solid ${C.green}30` }}>
                + Save AI Context
              </button>
            </div>
          </div>

          {/* Center content */}
          <div style={{ flex:1, minWidth:0, padding:'28px 28px', overflowY:'auto' }}>
            {loadingIncident ? (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[60,40,30,120,96,80].map((h,i)=>(
                  <div key={i} style={{ height:h, borderRadius:8, background: C.surface,
                    animation:'shimmer 1.5s infinite', width: i===1?'45%':i===2?'30%':'100%' }} />
                ))}
                <style>{`@keyframes shimmer{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
              </div>
            ) : selectedIncident ? (
              <>
                {/* Title + chips */}
                <div style={{ marginBottom:24 }}>
                  <h1 style={{ fontSize:22, fontWeight:700, color: C.txt, margin:'0 0 6px', letterSpacing:'-0.02em' }}>
                    {selectedIncident.title}
                  </h1>
                  <div style={{ fontSize:12, color: C.dim, fontFamily:'monospace', marginBottom:10 }}>
                    {selectedIncident.impacted_service} · PR #{selectedIncident.related_pr?.pr_id} · {new Date(selectedIncident.created_at).toLocaleDateString()}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <Chip label={selectedIncident.severity.toUpperCase()} c={SEV[selectedIncident.severity]??SEV.low} />
                    <Chip label={selectedIncident.status} c={STAT[selectedIncident.status]??STAT.resolved} />
                  </div>
                </div>

                {/* AI Context callout */}
                {selectedIncident.coding_context && (
                  <div style={{ marginBottom:16, padding:'14px 18px', borderRadius:8,
                    background:`${C.purple}10`, border:`1px solid ${C.purple}35`, borderLeft:`3px solid ${C.purple}` }}>
                    <div style={{ fontSize:11, fontWeight:600, color: C.purple, textTransform:'uppercase',
                      letterSpacing:'0.08em', marginBottom:6 }}>AI Session Context</div>
                    <p style={{ fontSize:13, color: C.txt, margin:'0 0 8px', fontStyle:'italic', lineHeight:1.5 }}>
                      "{selectedIncident.coding_context.summary}"
                    </p>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:10,
                      padding:'4px 10px', borderRadius:6, background: C.raised, border:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:10, fontWeight:700, color: C.dim, textTransform:'uppercase', letterSpacing:'0.07em' }}>ID</span>
                      <span style={{ fontFamily:'monospace', fontSize:11, color: C.sub, userSelect:'all' }}>
                        {selectedIncident.incident_id}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {[
                        `${selectedIncident.coding_context.decisions.length} decisions`,
                        `${selectedIncident.coding_context.files_changed.length} files changed`,
                        `${selectedIncident.coding_context.assumptions.length} assumptions`,
                      ].map(l=>(
                        <span key={l} style={{ fontSize:11, padding:'2px 10px', borderRadius:999,
                          background:`${C.purple}20`, color: C.purple, border:`1px solid ${C.purple}35` }}>{l}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deployment log */}
                {selectedIncident.deployment && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:11, fontWeight:600, color: C.dim, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Deployment</div>
                    <div style={{ borderRadius:8, padding:'12px 16px', fontFamily:'monospace', fontSize:12,
                      background:'#111a27', border:`1px solid ${C.border}` }}>
                      <div style={{ color: C.dim, marginBottom:4 }}>
                        [{new Date(selectedIncident.deployment.timestamp).toLocaleTimeString()}] Deployment successful → {selectedIncident.deployment.environment}
                      </div>
                      <div style={{ color: C.red }}>
                        [{new Date(selectedIncident.created_at).toLocaleTimeString()}] ERROR {selectedIncident.symptoms}
                      </div>
                    </div>
                  </div>
                )}

                {/* PR */}
                {selectedIncident.related_pr && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:11, fontWeight:600, color: C.dim, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Linked PR</div>
                    <div style={{ ...panel, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, color: C.blue }}>
                          PR #{selectedIncident.related_pr.pr_id} — {selectedIncident.related_pr.title}
                        </div>
                        <div style={{ fontSize:11, color: C.dim, marginTop:2 }}>by {selectedIncident.related_pr.author}</div>
                      </div>
                      <Chip label={selectedIncident.related_pr.status} c={STAT[selectedIncident.related_pr.status]??STAT.resolved} />
                    </div>
                  </div>
                )}

                {/* AI Fix loading */}
                {draftingFix && !fix && (
                  <div style={{ ...card, overflow:'hidden', marginBottom:16 }}>
                    <div style={{ padding:'10px 16px', borderBottom:`1px solid ${C.border}`, background: C.raised }}>
                      <div style={{ fontSize:13, color: C.sub, animation:'pulse 1.5s infinite' }}>AI is analyzing…</div>
                    </div>
                    <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
                      {['75%','100%','85%'].map((w,i)=>(
                        <div key={i} style={{ height:14, borderRadius:4, background: C.raised, width:w, animation:'shimmer 1.5s infinite' }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Fix result */}
                {fix && (
                  <div style={{ ...card, overflow:'hidden', marginBottom:16 }}>
                    <div style={{ padding:'12px 18px', borderBottom:`1px solid ${C.border}`,
                      background:`${C.purple}0c`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background: C.purple,
                          boxShadow:`0 0 8px ${C.purple}` }} />
                        <span style={{ fontSize:14, fontWeight:600, color: C.txt }}>AI-Drafted Fix</span>
                      </div>
                      <Chip label={fix.review_state} c={chip(C.purple)} />
                    </div>
                    <div style={{ padding:20, display:'flex', flexDirection:'column', gap:18 }}>
                      {[
                        { label:'Analysis',       content: fix.analysis,       color: C.txt },
                        { label:'Probable Cause', content: fix.probable_cause, color: C.red,
                          bg:`${C.red}10`, border:`${C.red}30` },
                        { label:'Proposed Fix',   content: fix.proposed_fix,   color: C.txt },
                      ].map(({ label, content, color, bg, border })=>(
                        <div key={label}>
                          <div style={{ fontSize:11, fontWeight:600, color: C.dim, textTransform:'uppercase',
                            letterSpacing:'0.08em', marginBottom:6 }}>{label}</div>
                          <div style={{ fontSize:13, lineHeight:1.6, color,
                            ...(bg ? { background:bg, border:`1px solid ${border}`, borderRadius:8, padding:'10px 14px' } : {}) }}>
                            {content}
                          </div>
                        </div>
                      ))}
                      <div>
                        <div style={{ fontSize:11, fontWeight:600, color: C.dim, textTransform:'uppercase',
                          letterSpacing:'0.08em', marginBottom:6 }}>Patch Notes</div>
                        <pre style={{ fontFamily:'monospace', fontSize:12, lineHeight:1.6, color: C.green,
                          background:'#111a27', border:`1px solid ${C.border}`, borderRadius:8,
                          padding:'12px 16px', margin:0, overflowX:'auto', whiteSpace:'pre-wrap' }}>
                          {fix.patch_notes}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {fix && (
                  <button onClick={assignForReview}
                    disabled={assigningReview || fix.review_state==='in_review'}
                    style={{ width:'100%', padding:'11px 0', borderRadius:8, fontSize:14, fontWeight:600,
                      color:'#fff', cursor: fix.review_state==='in_review'?'default':'pointer',
                      background: `linear-gradient(135deg,${C.purple},${C.blue})`,
                      border:'none', opacity: fix.review_state==='in_review'?0.65:1,
                      boxShadow:`0 0 20px ${C.purple}40` }}>
                    {assigningReview ? 'Assigning…' : fix.review_state==='in_review' ? '✓ Assigned for Review' : 'Assign for Review'}
                  </button>
                )}
              </>
            ) : (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:12 }}>
                <div style={{ fontSize:40 }}>🔍</div>
                <p style={{ color: C.sub, fontSize:14 }}>Select an incident to view details</p>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ width:240, flexShrink:0, background: C.surface, borderLeft:`1px solid ${C.border}`, padding:16, overflowY:'auto' }}>
            {selectedIncident && (
              <>
                <Section label="Responder">
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:`linear-gradient(135deg,${C.purple},${C.blue})`,
                      display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, color:'#fff', flexShrink:0 }}>
                      {selectedIncident.related_pr?.author?.[0]?.toUpperCase() ?? 'AI'}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color: C.txt }}>{selectedIncident.related_pr?.author ?? 'AI Suggested'}</div>
                      <div style={{ fontSize:11, color: C.dim }}>AI suggested</div>
                    </div>
                  </div>
                  {selectedIncident.coding_context && (
                    <div style={{ fontSize:11, color: C.sub, padding:'8px 10px', borderRadius:6,
                      background: C.raised, border:`1px solid ${C.border}`, lineHeight:1.5 }}>
                      Authored {selectedIncident.related_pr?.title} — has full session context.
                    </div>
                  )}
                </Section>

                <Section label="Timeline">
                  {[
                    { label:'AI session', date: selectedIncident.coding_context ? new Date(selectedIncident.coding_context.session_timestamp).toLocaleDateString() : '—', color: C.purple },
                    { label:`PR #${selectedIncident.related_pr?.pr_id??'—'}`, date: selectedIncident.related_pr ? new Date(selectedIncident.related_pr.created_at).toLocaleDateString() : '—', color: C.blue },
                    { label:'Deployed', date: selectedIncident.deployment ? new Date(selectedIncident.deployment.timestamp).toLocaleDateString() : '—', color: C.green },
                    { label:'Incident', date: new Date(selectedIncident.created_at).toLocaleDateString(), color: C.red },
                  ].map((t,i,arr)=>(
                    <div key={t.label} style={{ display:'flex', gap:10, alignItems:'flex-start',
                      paddingBottom: i<arr.length-1?12:0, marginBottom: i<arr.length-1?12:0,
                      borderBottom: i<arr.length-1?`1px dashed ${C.border}`:'' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background: t.color,
                        flexShrink:0, marginTop:4, boxShadow:`0 0 6px ${t.color}` }} />
                      <div>
                        <div style={{ fontSize:12, fontWeight:500, color: C.txt }}>{t.label}</div>
                        <div style={{ fontSize:11, color: C.dim }}>{t.date}</div>
                      </div>
                    </div>
                  ))}
                </Section>

                <Section label="Actions">
                  {['Open PR on GitHub','Rollback on Vercel'].map(a=>(
                    <button key={a} style={{ display:'block', width:'100%', textAlign:'left', padding:'7px 10px',
                      borderRadius:6, fontSize:12, color: C.blue, background:'none', border:'none', cursor:'pointer',
                      transition:'background 0.1s' }}
                      onMouseEnter={e=>(e.currentTarget.style.background=`${C.blue}12`)}
                      onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                      → {a}
                    </button>
                  ))}
                </Section>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          CONNECTIONS
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'connections' && (
        <div key="connections" className="tab-content" style={{ maxWidth:1080, margin:'0 auto', padding:'36px 24px' }}>
          <div style={{ marginBottom:28 }}>
            <h1 style={{ fontSize:26, fontWeight:700, color: C.txt, letterSpacing:'-0.02em', margin:0 }}>Connections</h1>
            <p style={{ color: C.sub, fontSize:13, marginTop:4 }}>Causal chain from AI session → PR → deployment → incident</p>
          </div>

          {selectedIncident ? (
            <>
              {/* Chain diagram */}
              <div style={{ ...card, padding:'24px 28px', marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:600, color: C.dim, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:20 }}>Causal Chain</div>
                <div style={{ display:'flex', alignItems:'stretch', gap:0 }}>
                  {[
                    { label:'AI Session', color: C.purple, bg:`${C.purple}10`, border:`${C.purple}40`,
                      body: selectedIncident.coding_context
                        ? <><p style={{ fontSize:12, fontWeight:500, color: C.txt, margin:'0 0 4px', lineHeight:1.4 }}>{selectedIncident.coding_context.summary.slice(0,80)}…</p>
                            <p style={{ fontSize:11, color: C.dim, margin:'0 0 8px' }}>{new Date(selectedIncident.coding_context.session_timestamp).toLocaleDateString()}</p>
                            <Chip label={`${selectedIncident.coding_context.decisions.length} decisions`} c={chip(C.purple,0.2)} /></>
                        : <span style={{ fontSize:12, color: C.dim }}>No session</span> },
                    { label:'Pull Request', color: C.blue, bg:`${C.blue}10`, border:`${C.blue}40`,
                      body: selectedIncident.related_pr
                        ? <><p style={{ fontSize:12, fontWeight:500, color: C.txt, margin:'0 0 2px' }}>PR #{selectedIncident.related_pr.pr_id}</p>
                            <p style={{ fontSize:11, color: C.sub, margin:'0 0 8px' }}>{selectedIncident.related_pr.title}</p>
                            <Chip label={selectedIncident.related_pr.status} c={chip(C.blue,0.2)} /></>
                        : <span style={{ fontSize:12, color: C.dim }}>No PR</span> },
                    { label:'Deployment', color: C.green, bg:`${C.green}10`, border:`${C.green}40`,
                      body: selectedIncident.deployment
                        ? <><p style={{ fontSize:12, fontWeight:500, color: C.txt, margin:'0 0 2px' }}>→ {selectedIncident.deployment.environment}</p>
                            <p style={{ fontSize:11, fontFamily:'monospace', color: C.sub, margin:'0 0 8px' }}>{selectedIncident.deployment.commit_sha.slice(0,8)}</p>
                            <p style={{ fontSize:11, color: C.dim, margin:0 }}>{new Date(selectedIncident.deployment.timestamp).toLocaleDateString()}</p></>
                        : <span style={{ fontSize:12, color: C.dim }}>No deployment</span> },
                    { label:'Incident', color: C.red, bg:`${C.red}10`, border:`${C.red}40`,
                      body: <><p style={{ fontSize:12, fontWeight:500, color: C.txt, margin:'0 0 4px', lineHeight:1.4 }}>{selectedIncident.title}</p>
                              <p style={{ fontSize:11, color: C.dim, margin:'0 0 8px' }}>{new Date(selectedIncident.created_at).toLocaleDateString()}</p>
                              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                                <Chip label={selectedIncident.severity} c={SEV[selectedIncident.severity]??SEV.low} />
                                <Chip label={selectedIncident.status}   c={STAT[selectedIncident.status]??STAT.resolved} />
                              </div></> },
                  ].map((node,i,arr)=>(
                    <div key={node.label} style={{ display:'flex', flex:1, alignItems:'center' }}>
                      <div style={{ flex:1, padding:'14px 16px', borderRadius:10,
                        background: node.bg, border:`1px solid ${node.border}`,
                        borderLeft:`3px solid ${node.color}` }}>
                        <div style={{ fontSize:10, fontWeight:700, color: node.color, textTransform:'uppercase',
                          letterSpacing:'0.1em', marginBottom:8 }}>{node.label}</div>
                        {node.body}
                      </div>
                      {i<arr.length-1 && (
                        <div style={{ padding:'0 10px', color: C.rim, fontSize:18, flexShrink:0 }}>→</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* All chains — table style */}
              <div style={{ ...card, overflow:'hidden' }}>
                <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontWeight:600, fontSize:14, color: C.txt }}>All Incident Chains</div>
                  <div style={{ fontSize:12, color: C.dim }}>Click to preview chain above</div>
                </div>
                {incidents.map((inc,i)=>{
                  const active = selectedIncident?.incident_id===inc.incident_id;
                  return (
                    <div key={inc.incident_id} onClick={()=>loadIncidentDetails(inc.incident_id)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', cursor:'pointer',
                        borderBottom: i<incidents.length-1?`1px solid ${C.border}`:'none',
                        borderLeft:`3px solid ${accentColor(inc.severity)}`,
                        background: active?`${C.purple}0a`:'transparent', transition:'background 0.1s' }}
                      onMouseEnter={e=>{ if(!active) e.currentTarget.style.background=`${C.purple}06`; }}
                      onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='transparent'; }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background: dotColor(inc.status), flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:500, color: C.txt, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inc.title}</div>
                        <div style={{ fontSize:11, color: C.dim, fontFamily:'monospace', marginTop:1 }}>{inc.incident_id}</div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                        {[{l:'session',C:C.purple},{l:'PR',C:C.blue},{l:'deploy',C:C.green},{l:'incident',C:C.red}].map((ch,ci)=>(
                          <span key={ch.l} style={{ display:'flex', alignItems:'center', gap:4 }}>
                            {ci>0 && <span style={{ color: C.rim, fontSize:12 }}>→</span>}
                            <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999,
                              background:`${ch.C}18`, color: ch.C, border:`1px solid ${ch.C}33` }}>{ch.l}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ ...card, padding:80, textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔗</div>
              <p style={{ fontSize:13, color: C.sub, marginBottom:20 }}>Select an incident to visualize its connection chain.</p>
              <button onClick={()=>setActiveTab('incidents')}
                style={{ padding:'9px 20px', borderRadius:8, fontSize:13, fontWeight:600, color:'#fff',
                  background:`linear-gradient(135deg,${C.purple},${C.blue})`, border:'none', cursor:'pointer' }}>
                Browse Incidents →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ CONTEXT MODAL ═══ */}
      {showContextModal && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16,
          background:'rgba(6,8,16,0.85)', backdropFilter:'blur(8px)' }}>
          <div style={{ background: C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:28, maxWidth:480, width:'100%',
            boxShadow:`0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px ${C.purple}20` }}>
            <h3 style={{ fontSize:17, fontWeight:700, color: C.txt, margin:'0 0 4px' }}>Save AI Coding Context</h3>
            <p style={{ fontSize:12, color: C.sub, margin:'0 0 20px' }}>AI will extract decisions, assumptions, and file changes</p>
            <textarea value={contextTranscript} onChange={e=>setContextTranscript(e.target.value)}
              style={{ width:'100%', padding:'10px 14px', borderRadius:8, fontFamily:'monospace', fontSize:12,
                background: C.raised, color: C.txt, border:`1px solid ${C.border}`, resize:'vertical',
                minHeight:160, outline:'none', lineHeight:1.6, boxSizing:'border-box' }}
              placeholder="Paste your Claude coding session notes here…" />
            <div style={{ display:'flex', gap:10, marginTop:18 }}>
              <button onClick={saveContext} disabled={!contextTranscript.trim()}
                style={{ flex:1, padding:'10px 0', borderRadius:8, fontSize:13, fontWeight:600, color:'#fff',
                  background:`linear-gradient(135deg,${C.purple},${C.blue})`, border:'none', cursor:'pointer',
                  opacity: contextTranscript.trim()?1:0.45 }}>
                Save Context
              </button>
              <button onClick={()=>setShowContextModal(false)}
                style={{ padding:'10px 20px', borderRadius:8, fontSize:13, fontWeight:500, color: C.sub,
                  background: C.raised, border:`1px solid ${C.border}`, cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar section helper ───────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em',
        color:'#555b70', marginBottom:10 }}>{label}</div>
      {children}
    </div>
  );
}
