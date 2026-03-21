// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type AgentType = "claude" | "codex" | "cursor" | "copilot";
export type Impact = "low" | "medium" | "high";
export type IncidentSeverity = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "active" | "investigating" | "resolved";
export type TicketSource = "linear" | "jira";
export type TicketStatus = "todo" | "in-progress" | "done";
export type PRStatus = "open" | "merged" | "closed";
export type DeployStatus = "success" | "failed" | "building";
export type Environment = "production" | "preview" | "development";

export type Decision = {
  id: string;
  session_id: string;
  summary: string;
  reasoning: string;
  files_changed: string[];
  impact: Impact;
  timestamp: string;
  pr_id?: string;
  ticket_id?: string;
  deploy_id?: string;
};

export type AISession = {
  id: string;
  agent: AgentType;
  repo: string;
  branch: string;
  engineer: string;
  started_at: string;
  ended_at: string;
  decisions: Decision[];
  pr_id?: string;
};

export type PR = {
  id: string;
  number: number;
  title: string;
  repo: string;
  author: string;
  status: PRStatus;
  merged_at?: string;
  url: string;
  decision_ids: string[];
  deploy_id?: string;
};

export type Ticket = {
  id: string;
  source: TicketSource;
  number: string;
  title: string;
  status: TicketStatus;
  assignee: string;
  url: string;
  decision_ids: string[];
};

export type Deployment = {
  id: string;
  repo: string;
  environment: Environment;
  status: DeployStatus;
  deployed_at: string;
  url: string;
  pr_id?: string;
  commit_sha: string;
};

export type Incident = {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  triggered_at: string;
  resolved_at?: string;
  affected_service: string;
  related_decision_ids: string[];
  related_pr_id?: string;
  related_deploy_id?: string;
  ai_analysis: string;
  ai_fix_suggestion: string;
  suggested_engineer: string;
  suggested_engineer_reason: string;
};

export type Engineer = {
  id: string;
  name: string;
  avatar_initials: string;
  role: string;
};

// ─────────────────────────────────────────────────────────────────
// Engineers
// ─────────────────────────────────────────────────────────────────

export const ENGINEERS: Record<string, Engineer> = {
  "james.chen": { id: "james.chen", name: "James Chen", avatar_initials: "JC", role: "Senior Engineer" },
  "priya.sharma": { id: "priya.sharma", name: "Priya Sharma", avatar_initials: "PS", role: "Engineer" },
  "marcus.lee": { id: "marcus.lee", name: "Marcus Lee", avatar_initials: "ML", role: "Staff Engineer" },
};

// ─────────────────────────────────────────────────────────────────
// Decisions (flat list, referenced by sessions)
// ─────────────────────────────────────────────────────────────────

export const MOCK_DECISIONS: Decision[] = [
  {
    id: "dec_01",
    session_id: "sess_01",
    summary: "Migrated auth middleware from session-based to JWT",
    reasoning:
      "Session store in Redis was a single point of failure and didn't support mobile token refresh. JWT allows stateless verification and refresh token rotation without a Redis dependency, which also eliminates the 3 Redis-related auth incidents we had in Q1.",
    files_changed: [
      "src/middleware/auth.ts",
      "src/services/token.ts",
      "src/routes/auth.ts",
    ],
    impact: "high",
    timestamp: "2026-03-21T08:31:00Z",
    pr_id: "pr_47",
    ticket_id: "ticket_lin247",
    deploy_id: "deploy_01",
  },
  {
    id: "dec_02",
    session_id: "sess_01",
    summary: "Removed Redis session store dependency from the auth flow",
    reasoning:
      "With JWT in place, the Redis session store is no longer needed for auth. Removing it reduces infrastructure cost by ~$400/mo and eliminates the dependency that caused cascading failures when Redis had latency spikes.",
    files_changed: [
      "src/config/redis.ts",
      "src/middleware/session.ts",
      "docker-compose.yml",
    ],
    impact: "medium",
    timestamp: "2026-03-21T08:47:00Z",
    pr_id: "pr_47",
    ticket_id: "ticket_lin247",
    deploy_id: "deploy_01",
  },
  {
    id: "dec_03",
    session_id: "sess_02",
    summary: "Added exponential backoff with jitter to the API rate limiter",
    reasoning:
      "Fixed-interval rate limiting was causing a thundering herd on client retries — when the limit reset, all blocked clients would retry simultaneously. Exponential backoff with jitter spreads retries and prevents cascading failures under load.",
    files_changed: ["src/middleware/rateLimiter.ts", "src/config/limits.ts"],
    impact: "low",
    timestamp: "2026-03-20T14:08:00Z",
    pr_id: "pr_45",
    ticket_id: "ticket_lin231",
    deploy_id: "deploy_02",
  },
  {
    id: "dec_04",
    session_id: "sess_03",
    summary: "Increased DB connection pool size from 10 to 50",
    reasoning:
      "Profiling showed pool exhaustion at >200 rps — requests were queuing waiting for a connection. Increased to 50 to match the DB server's max_connections allocation for this service. Added pool monitoring to alert at 80% utilisation.",
    files_changed: ["src/config/database.ts", "src/services/db.ts"],
    impact: "medium",
    timestamp: "2026-03-19T09:52:00Z",
    pr_id: "pr_44",
    ticket_id: "ticket_lin228",
    deploy_id: "deploy_03",
  },
];

// ─────────────────────────────────────────────────────────────────
// Sessions
// ─────────────────────────────────────────────────────────────────

export const MOCK_SESSIONS: AISession[] = [
  {
    id: "sess_01",
    agent: "claude",
    repo: "acme/api-server",
    branch: "feat/jwt-auth",
    engineer: "james.chen",
    started_at: "2026-03-21T08:14:00Z",
    ended_at: "2026-03-21T09:03:00Z",
    pr_id: "pr_47",
    decisions: MOCK_DECISIONS.filter((d) => d.session_id === "sess_01"),
  },
  {
    id: "sess_02",
    agent: "claude",
    repo: "acme/api-server",
    branch: "fix/rate-limiter",
    engineer: "priya.sharma",
    started_at: "2026-03-20T13:45:00Z",
    ended_at: "2026-03-20T14:22:00Z",
    pr_id: "pr_45",
    decisions: MOCK_DECISIONS.filter((d) => d.session_id === "sess_02"),
  },
  {
    id: "sess_03",
    agent: "codex",
    repo: "acme/api-server",
    branch: "perf/db-pool",
    engineer: "marcus.lee",
    started_at: "2026-03-19T09:30:00Z",
    ended_at: "2026-03-19T10:15:00Z",
    pr_id: "pr_44",
    decisions: MOCK_DECISIONS.filter((d) => d.session_id === "sess_03"),
  },
];

// ─────────────────────────────────────────────────────────────────
// PRs
// ─────────────────────────────────────────────────────────────────

export const MOCK_PRS: PR[] = [
  {
    id: "pr_47",
    number: 47,
    title: "feat: migrate auth middleware to JWT",
    repo: "acme/api-server",
    author: "james.chen",
    status: "merged",
    merged_at: "2026-03-21T09:47:00Z",
    url: "https://github.com/acme/api-server/pull/47",
    decision_ids: ["dec_01", "dec_02"],
    deploy_id: "deploy_01",
  },
  {
    id: "pr_45",
    number: 45,
    title: "fix: exponential backoff for rate limiter",
    repo: "acme/api-server",
    author: "priya.sharma",
    status: "merged",
    merged_at: "2026-03-20T15:00:00Z",
    url: "https://github.com/acme/api-server/pull/45",
    decision_ids: ["dec_03"],
    deploy_id: "deploy_02",
  },
  {
    id: "pr_44",
    number: 44,
    title: "perf: increase DB connection pool",
    repo: "acme/api-server",
    author: "marcus.lee",
    status: "merged",
    merged_at: "2026-03-19T11:00:00Z",
    url: "https://github.com/acme/api-server/pull/44",
    decision_ids: ["dec_04"],
    deploy_id: "deploy_03",
  },
];

// ─────────────────────────────────────────────────────────────────
// Tickets
// ─────────────────────────────────────────────────────────────────

export const MOCK_TICKETS: Ticket[] = [
  {
    id: "ticket_lin247",
    source: "linear",
    number: "LIN-247",
    title: "Support token refresh for mobile clients",
    status: "done",
    assignee: "james.chen",
    url: "https://linear.app/acme/issue/LIN-247",
    decision_ids: ["dec_01", "dec_02"],
  },
  {
    id: "ticket_lin231",
    source: "linear",
    number: "LIN-231",
    title: "Fix rate limiting causing false positives under load",
    status: "done",
    assignee: "priya.sharma",
    url: "https://linear.app/acme/issue/LIN-231",
    decision_ids: ["dec_03"],
  },
  {
    id: "ticket_lin228",
    source: "linear",
    number: "LIN-228",
    title: "DB connection timeouts under peak load",
    status: "done",
    assignee: "marcus.lee",
    url: "https://linear.app/acme/issue/LIN-228",
    decision_ids: ["dec_04"],
  },
];

// ─────────────────────────────────────────────────────────────────
// Deployments
// ─────────────────────────────────────────────────────────────────

export const MOCK_DEPLOYMENTS: Deployment[] = [
  {
    id: "deploy_01",
    repo: "acme/api-server",
    environment: "production",
    status: "success",
    deployed_at: "2026-03-21T10:23:00Z",
    url: "https://api-server.vercel.app",
    pr_id: "pr_47",
    commit_sha: "a4f9c2e",
  },
  {
    id: "deploy_02",
    repo: "acme/api-server",
    environment: "production",
    status: "success",
    deployed_at: "2026-03-20T15:30:00Z",
    url: "https://api-server.vercel.app",
    pr_id: "pr_45",
    commit_sha: "b7d1a3f",
  },
  {
    id: "deploy_03",
    repo: "acme/api-server",
    environment: "production",
    status: "success",
    deployed_at: "2026-03-19T11:45:00Z",
    url: "https://api-server.vercel.app",
    pr_id: "pr_44",
    commit_sha: "c2e8f4b",
  },
];

// ─────────────────────────────────────────────────────────────────
// The pre-scripted incident (triggered by button in demo)
// ─────────────────────────────────────────────────────────────────

export const THE_INCIDENT: Incident = {
  id: "inc_01",
  title: "Auth service: 500 errors on POST /api/auth/refresh",
  severity: "critical",
  status: "active",
  triggered_at: new Date().toISOString(), // live timestamp when triggered
  affected_service: "acme/api-server · /api/auth",
  related_decision_ids: ["dec_01", "dec_02"],
  related_pr_id: "pr_47",
  related_deploy_id: "deploy_01",
  ai_analysis:
    "Based on decision context captured in session sess_01 (08:14 UTC today), the auth middleware was refactored from session-based to JWT. PR #47 was deployed to production at 10:23 UTC — approximately 2.5 hours before this incident. Error logs show 'JsonWebTokenError: invalid signature' on token verification, which is consistent with a missing or mismatched JWT_SECRET in the production environment. The Redis session store was also removed in the same PR, meaning there is no fallback auth path.",
  ai_fix_suggestion:
    "1. Check Vercel production env vars — verify JWT_SECRET is set and matches the value in staging.\n2. If missing: add the secret and trigger an instant redeploy via Vercel dashboard.\n3. If present: confirm the signing algorithm in src/services/token.ts (line 34) matches the verification config in src/middleware/auth.ts (line 18) — the session used HS256, confirm JWT is not using RS256.\n4. Rollback option: use Vercel instant rollback to commit b7d1a3f (pre-JWT) to restore service immediately while the root cause is investigated.",
  suggested_engineer: "James Chen",
  suggested_engineer_reason:
    "Authored the JWT migration in session sess_01 and has full context of the token signing changes. Originally scoped this work in LIN-247 and is best positioned to identify the environment config gap.",
};

// ─────────────────────────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────────────────────────

export function getDecisionById(id: string) {
  return MOCK_DECISIONS.find((d) => d.id === id);
}

export function getPRById(id: string) {
  return MOCK_PRS.find((p) => p.id === id);
}

export function getTicketByDecisionId(decisionId: string) {
  return MOCK_TICKETS.find((t) => t.decision_ids.includes(decisionId));
}

export function getDeploymentById(id: string) {
  return MOCK_DEPLOYMENTS.find((d) => d.id === id);
}

export function getSessionById(id: string) {
  return MOCK_SESSIONS.find((s) => s.id === id);
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
