// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type PricingModel = "per-seat" | "enterprise" | "flat-rate";
export type AppCategory =
  | "documentation"
  | "communication"
  | "project-management"
  | "design"
  | "analytics"
  | "video";
export type InsightTag =
  | "redundant"
  | "underutilized"
  | "high-cost"
  | "security-risk"
  | "healthy";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  department: string;
  last_active: string; // ISO date
  daily_usage_minutes: number;
  seat_cost_monthly: number;
  recommended_for_removal: boolean;
  removal_reason: string;
};

export type SaaSApp = {
  id: string;
  name: string;
  category: AppCategory;
  logo_emoji: string;
  color: string; // tailwind bg color class for accent
  monthly_cost: number;
  annual_cost: number;
  pricing_model: PricingModel;
  total_seats: number;
  active_seats: number;
  avg_daily_usage_minutes: number;
  overlapping_with: string[]; // app IDs
  overlapping_features: string[];
  insight_tags: InsightTag[];
  users: AppUser[];
  renewal_date: string; // ISO date
  potential_monthly_savings: number;
};

// ─────────────────────────────────────────────────────────────────
// Backend data model (for handoff to backend team)
// ─────────────────────────────────────────────────────────────────
//
// POST /apps                → list of SaaSApp objects
// GET  /apps/:id            → single SaaSApp
// GET  /apps/:id/users      → AppUser[]
// POST /removal-email       → RemovalEmail (generate via Claude)
//
// type RemovalEmail = {
//   app_id: string;
//   user_id: string;
//   to_email: string;
//   to_name: string;
//   app_name: string;
//   reason: string;
//   last_active_date: string;       // ISO
//   subscription_end_date: string;  // ISO (next billing cycle)
//   estimated_monthly_savings: number;
//   generated_at: string;           // ISO
// }
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────

export const MOCK_APPS: SaaSApp[] = [
  {
    id: "notion",
    name: "Notion",
    category: "documentation",
    logo_emoji: "📝",
    color: "bg-slate-400",
    monthly_cost: 900,
    annual_cost: 10800,
    pricing_model: "per-seat",
    total_seats: 45,
    active_seats: 28,
    avg_daily_usage_minutes: 34,
    overlapping_with: ["confluence", "googledocs"],
    overlapping_features: [
      "Document creation",
      "Team wikis",
      "Knowledge base",
      "Templates",
      "Comments & collaboration",
    ],
    insight_tags: ["redundant", "underutilized"],
    renewal_date: "2025-06-01",
    potential_monthly_savings: 340,
    users: [
      {
        id: "u1",
        name: "James Okafor",
        email: "james.okafor@company.com",
        department: "Engineering",
        last_active: "2025-03-01",
        daily_usage_minutes: 5,
        seat_cost_monthly: 20,
        recommended_for_removal: true,
        removal_reason:
          "Last active 20 days ago. Average session under 5 min. Team migrated to Confluence for all engineering docs.",
      },
      {
        id: "u2",
        name: "Priya Sharma",
        email: "priya.sharma@company.com",
        department: "Marketing",
        last_active: "2025-03-18",
        daily_usage_minutes: 42,
        seat_cost_monthly: 20,
        recommended_for_removal: false,
        removal_reason: "",
      },
      {
        id: "u3",
        name: "Lena Fischer",
        email: "lena.fischer@company.com",
        department: "Design",
        last_active: "2025-03-20",
        daily_usage_minutes: 61,
        seat_cost_monthly: 20,
        recommended_for_removal: false,
        removal_reason: "",
      },
      {
        id: "u4",
        name: "Tom Nguyen",
        email: "tom.nguyen@company.com",
        department: "Sales",
        last_active: "2025-01-12",
        daily_usage_minutes: 2,
        seat_cost_monthly: 20,
        recommended_for_removal: true,
        removal_reason:
          "No meaningful activity since January. Sales team primarily uses Google Docs for proposals.",
      },
      {
        id: "u5",
        name: "Sara Al-Rashid",
        email: "sara.alrashid@company.com",
        department: "Operations",
        last_active: "2025-02-28",
        daily_usage_minutes: 8,
        seat_cost_monthly: 20,
        recommended_for_removal: true,
        removal_reason:
          "Usage dropped 90% over 60 days. Operations runbooks have been moved to Confluence.",
      },
      {
        id: "u6",
        name: "Chris Booth",
        email: "chris.booth@company.com",
        department: "Product",
        last_active: "2025-03-19",
        daily_usage_minutes: 55,
        seat_cost_monthly: 20,
        recommended_for_removal: false,
        removal_reason: "",
      },
    ],
  },
  {
    id: "confluence",
    name: "Confluence",
    category: "documentation",
    logo_emoji: "📚",
    color: "bg-blue-500",
    monthly_cost: 750,
    annual_cost: 9000,
    pricing_model: "per-seat",
    total_seats: 50,
    active_seats: 22,
    avg_daily_usage_minutes: 21,
    overlapping_with: ["notion", "googledocs"],
    overlapping_features: [
      "Document creation",
      "Team wikis",
      "Knowledge base",
      "Page hierarchy",
      "Comments & collaboration",
    ],
    insight_tags: ["redundant", "underutilized", "high-cost"],
    renewal_date: "2025-05-15",
    potential_monthly_savings: 420,
    users: [
      {
        id: "u7",
        name: "Angela Torres",
        email: "angela.torres@company.com",
        department: "Engineering",
        last_active: "2025-03-21",
        daily_usage_minutes: 38,
        seat_cost_monthly: 15,
        recommended_for_removal: false,
        removal_reason: "",
      },
      {
        id: "u8",
        name: "David Kim",
        email: "david.kim@company.com",
        department: "HR",
        last_active: "2025-01-05",
        daily_usage_minutes: 1,
        seat_cost_monthly: 15,
        recommended_for_removal: true,
        removal_reason:
          "Zero activity since January. HR team primarily uses Google Docs and Notion for people ops.",
      },
      {
        id: "u9",
        name: "Maria Sousa",
        email: "maria.sousa@company.com",
        department: "Finance",
        last_active: "2025-02-10",
        daily_usage_minutes: 4,
        seat_cost_monthly: 15,
        recommended_for_removal: true,
        removal_reason:
          "Last session was 39 days ago. Finance does not have a Confluence space and uses Google Sheets instead.",
      },
      {
        id: "u10",
        name: "Ben Clarke",
        email: "ben.clarke@company.com",
        department: "Engineering",
        last_active: "2025-03-20",
        daily_usage_minutes: 47,
        seat_cost_monthly: 15,
        recommended_for_removal: false,
        removal_reason: "",
      },
      {
        id: "u11",
        name: "Fatima Haddad",
        email: "fatima.haddad@company.com",
        department: "Marketing",
        last_active: "2025-01-28",
        daily_usage_minutes: 3,
        seat_cost_monthly: 15,
        recommended_for_removal: true,
        removal_reason:
          "Marketing moved all content to Notion in Q1. Confluence seat is unused and billing continues.",
      },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    category: "communication",
    logo_emoji: "💬",
    color: "bg-purple-500",
    monthly_cost: 640,
    annual_cost: 7680,
    pricing_model: "per-seat",
    total_seats: 80,
    active_seats: 72,
    avg_daily_usage_minutes: 112,
    overlapping_with: ["zoom"],
    overlapping_features: ["Huddles / audio calls", "Screen sharing", "DMs"],
    insight_tags: ["healthy"],
    renewal_date: "2025-08-01",
    potential_monthly_savings: 64,
    users: [
      {
        id: "u12",
        name: "Oliver Green",
        email: "oliver.green@company.com",
        department: "Contractor",
        last_active: "2025-02-01",
        daily_usage_minutes: 0,
        seat_cost_monthly: 8,
        recommended_for_removal: true,
        removal_reason:
          "Contractor engagement ended Feb 2025. Seat not deprovisioned. Potential security exposure.",
      },
      {
        id: "u13",
        name: "Nina Patel",
        email: "nina.patel@company.com",
        department: "Engineering",
        last_active: "2025-03-21",
        daily_usage_minutes: 145,
        seat_cost_monthly: 8,
        recommended_for_removal: false,
        removal_reason: "",
      },
      {
        id: "u14",
        name: "Lucas Fernandez",
        email: "lucas.fernandez@company.com",
        department: "Sales",
        last_active: "2025-03-20",
        daily_usage_minutes: 98,
        seat_cost_monthly: 8,
        recommended_for_removal: false,
        removal_reason: "",
      },
    ],
  },
  {
    id: "zoom",
    name: "Zoom",
    category: "video",
    logo_emoji: "🎥",
    color: "bg-sky-500",
    monthly_cost: 525,
    annual_cost: 6300,
    pricing_model: "per-seat",
    total_seats: 60,
    active_seats: 35,
    avg_daily_usage_minutes: 28,
    overlapping_with: ["slack", "loom"],
    overlapping_features: [
      "Video calls",
      "Screen sharing",
      "Recordings",
      "Webinars",
    ],
    insight_tags: ["underutilized", "redundant"],
    renewal_date: "2025-07-01",
    potential_monthly_savings: 187,
    users: [
      {
        id: "u15",
        name: "Rachel Wong",
        email: "rachel.wong@company.com",
        department: "Design",
        last_active: "2025-01-20",
        daily_usage_minutes: 2,
        seat_cost_monthly: 15,
        recommended_for_removal: true,
        removal_reason:
          "Design team uses Slack huddles for all calls. No Zoom sessions recorded in 60 days.",
      },
      {
        id: "u16",
        name: "Arjun Mehta",
        email: "arjun.mehta@company.com",
        department: "Sales",
        last_active: "2025-03-19",
        daily_usage_minutes: 67,
        seat_cost_monthly: 15,
        recommended_for_removal: false,
        removal_reason: "",
      },
      {
        id: "u17",
        name: "Claire Dubois",
        email: "claire.dubois@company.com",
        department: "HR",
        last_active: "2025-02-14",
        daily_usage_minutes: 5,
        seat_cost_monthly: 15,
        recommended_for_removal: true,
        removal_reason:
          "HR moved all interviews to Google Meet. Last Zoom call was 35 days ago. Seat adds cost with no utility.",
      },
      {
        id: "u18",
        name: "Kwame Asante",
        email: "kwame.asante@company.com",
        department: "Operations",
        last_active: "2025-03-15",
        daily_usage_minutes: 41,
        seat_cost_monthly: 15,
        recommended_for_removal: false,
        removal_reason: "",
      },
    ],
  },
  {
    id: "googledocs",
    name: "Google Docs",
    category: "documentation",
    logo_emoji: "📄",
    color: "bg-emerald-500",
    monthly_cost: 0,
    annual_cost: 0,
    pricing_model: "enterprise",
    total_seats: 80,
    active_seats: 68,
    avg_daily_usage_minutes: 55,
    overlapping_with: ["notion", "confluence"],
    overlapping_features: [
      "Document creation",
      "Real-time collaboration",
      "Comments",
      "Templates",
    ],
    insight_tags: ["healthy"],
    renewal_date: "2025-12-01",
    potential_monthly_savings: 0,
    users: [
      {
        id: "u19",
        name: "Zoe Tanaka",
        email: "zoe.tanaka@company.com",
        department: "Marketing",
        last_active: "2025-03-21",
        daily_usage_minutes: 78,
        seat_cost_monthly: 0,
        recommended_for_removal: false,
        removal_reason: "",
      },
      {
        id: "u20",
        name: "Sam Brooks",
        email: "sam.brooks@company.com",
        department: "Product",
        last_active: "2025-03-20",
        daily_usage_minutes: 63,
        seat_cost_monthly: 0,
        recommended_for_removal: false,
        removal_reason: "",
      },
    ],
  },
  {
    id: "loom",
    name: "Loom",
    category: "video",
    logo_emoji: "🎬",
    color: "bg-rose-500",
    monthly_cost: 144,
    annual_cost: 1728,
    pricing_model: "per-seat",
    total_seats: 30,
    active_seats: 12,
    avg_daily_usage_minutes: 14,
    overlapping_with: ["zoom"],
    overlapping_features: ["Recordings", "Async video messages", "Screen share"],
    insight_tags: ["underutilized", "redundant"],
    renewal_date: "2025-04-15",
    potential_monthly_savings: 108,
    users: [
      {
        id: "u21",
        name: "Mia Jensen",
        email: "mia.jensen@company.com",
        department: "Product",
        last_active: "2025-03-10",
        daily_usage_minutes: 22,
        seat_cost_monthly: 12,
        recommended_for_removal: false,
        removal_reason: "",
      },
      {
        id: "u22",
        name: "Felix Wagner",
        email: "felix.wagner@company.com",
        department: "Engineering",
        last_active: "2025-01-08",
        daily_usage_minutes: 0,
        seat_cost_monthly: 12,
        recommended_for_removal: true,
        removal_reason:
          "Engineering team uses Slack clips for async video. Felix has not recorded or viewed a Loom in 72 days.",
      },
      {
        id: "u23",
        name: "Amara Diallo",
        email: "amara.diallo@company.com",
        department: "Sales",
        last_active: "2025-02-20",
        daily_usage_minutes: 8,
        seat_cost_monthly: 12,
        recommended_for_removal: true,
        removal_reason:
          "Sales team onboarded to Zoom Clips in February. Loom seat is now duplicating functionality.",
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// Derived helpers
// ─────────────────────────────────────────────────────────────────

export function getTotalMonthlyCost(apps: SaaSApp[]) {
  return apps.reduce((sum, a) => sum + a.monthly_cost, 0);
}

export function getTotalAnnualCost(apps: SaaSApp[]) {
  return apps.reduce((sum, a) => sum + a.annual_cost, 0);
}

export function getTotalMonthlySavings(apps: SaaSApp[]) {
  return apps.reduce((sum, a) => sum + a.potential_monthly_savings, 0);
}

export function getUsersForRemoval(apps: SaaSApp[]) {
  return apps.flatMap((a) =>
    a.users
      .filter((u) => u.recommended_for_removal)
      .map((u) => ({ ...u, app: a })),
  );
}

// Generate a static removal email for demo
export function generateRemovalEmail(
  user: AppUser,
  app: SaaSApp,
): {
  subject: string;
  body: string;
} {
  const lastActive = new Date(user.last_active).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Subscription ends at the next month boundary from today
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);
  endDate.setDate(1);
  const endDateStr = endDate.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    subject: `Action required: Your ${app.name} access will end on ${endDateStr}`,
    body: `Hi ${user.name.split(" ")[0]},

I hope you're doing well. As part of our ongoing SaaS optimisation review, we've identified that your ${app.name} licence is scheduled to be deprovisioned.

Here's why:
${user.removal_reason}

Your last recorded activity on ${app.name} was on ${lastActive}.

What this means for you:
• Your access to ${app.name} will end on ${endDateStr}
• Any personal content you have stored in ${app.name} should be exported before that date
• Your team's shared spaces will remain accessible to active members

Estimated impact: Removing this seat saves the company $${user.seat_cost_monthly}/month.

If you believe this is an error or you require continued access, please reply to this email before ${endDateStr} and we will review your case.

Thank you for your understanding.

Best regards,
IT Operations & Finance
Nexus OS — Automated Licence Management`,
  };
}
