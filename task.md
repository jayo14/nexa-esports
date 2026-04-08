# NeXa Esports — Implementation Prompts
## Feature #1: Team Management & Competitive Scoring System
## Feature #2: Paga Payment Integration (Replace Flutterwave + Paystack)

---

# PROMPT 1 — TEAM MANAGEMENT & COMPETITIVE SCORING SYSTEM

## Context

You are working on **NeXa Esports**, a Capacitor-based React + Vite PWA with a Supabase backend (PostgreSQL, Edge Functions, RLS). The stack is:

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, shadcn/ui + Radix UI, Lucide icons
- **Backend**: Supabase (PostgreSQL + RLS + Edge Functions in Deno/TypeScript)
- **Auth**: Supabase Auth (`useAuth()` context exposes `user` and `profile`)
- **Routing**: React Router v6 — all protected routes are wrapped in `<ProtectedRoute>`
- **Styling**: Dark theme, primary color `#ec131e`, glassmorphism card style (`rgba(255,255,255,0.03)` bg + `backdrop-filter: blur(12px)`)
- **Existing roles**: `player`, `admin`, `clan_master` — stored in `profiles.role`
- **Existing kill tracking**: `profiles` table has `br_kills`, `mp_kills`, and `kills` (total) columns
- **Existing leaderboard**: A `leaderboard` view (SELECT from `profiles`) exists — we are extending it, not replacing it

There are **no existing teams, team_matches, or season tables**. This is a greenfield feature.

---

## What to Build

### A) Supabase Migrations (run in order)

#### Migration 1 — `create_teams_system.sql`

```sql
-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  tag TEXT NOT NULL UNIQUE CHECK (char_length(tag) <= 6),
  logo_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team members join table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('captain', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id) -- A player can only belong to one team at a time
);

-- Seasons table
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Match Days
CREATE TABLE public.match_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "Match Day 1"
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lobbies (3–4 per match day)
CREATE TABLE public.lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_day_id UUID NOT NULL REFERENCES public.match_days(id) ON DELETE CASCADE,
  lobby_number INT NOT NULL CHECK (lobby_number BETWEEN 1 AND 4),
  recording_url TEXT,
  recording_label TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'verified')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_day_id, lobby_number)
);

-- Lobby results per team member (admin submits kills + placement per player per lobby)
CREATE TABLE public.lobby_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  kills INT NOT NULL DEFAULT 0 CHECK (kills >= 0),
  placement INT NOT NULL CHECK (placement >= 1),
  -- Computed columns (auto-calculated by trigger)
  kill_points INT GENERATED ALWAYS AS (kills * 2) STORED,
  placement_points INT GENERATED ALWAYS AS (
    CASE
      WHEN placement <= 3  THEN 10
      WHEN placement <= 7  THEN 7
      WHEN placement <= 15 THEN 5
      ELSE 3
    END
  ) STORED,
  total_points INT GENERATED ALWAYS AS (
    (kills * 2) + (
      CASE
        WHEN placement <= 3  THEN 10
        WHEN placement <= 7  THEN 7
        WHEN placement <= 15 THEN 5
        ELSE 3
      END
    )
  ) STORED,
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lobby_id, user_id)
);

-- RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_results ENABLE ROW LEVEL SECURITY;

-- Teams: everyone reads, authenticated creates, captain/admin updates
CREATE POLICY "teams_select" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "teams_insert" ON public.teams FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "teams_update" ON public.teams FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = id AND tm.user_id = auth.uid() AND tm.role = 'captain')
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','clan_master'))
  );
CREATE POLICY "teams_delete" ON public.teams FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','clan_master')));

-- Team members: everyone reads, user inserts self, captain/admin deletes
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_members_insert" ON public.team_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "team_members_delete" ON public.team_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.role = 'captain')
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','clan_master'))
  );

-- Seasons + match_days + lobbies: all authenticated users read, only admin/clan_master write
CREATE POLICY "seasons_select" ON public.seasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "seasons_write" ON public.seasons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','clan_master')));

CREATE POLICY "match_days_select" ON public.match_days FOR SELECT TO authenticated USING (true);
CREATE POLICY "match_days_write" ON public.match_days FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','clan_master')));

CREATE POLICY "lobbies_select" ON public.lobbies FOR SELECT TO authenticated USING (true);
CREATE POLICY "lobbies_write" ON public.lobbies FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','clan_master')));

CREATE POLICY "lobby_results_select" ON public.lobby_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "lobby_results_write" ON public.lobby_results FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','clan_master')));
```

#### Migration 2 — `create_team_chat_system.sql`

```sql
-- Team chat messages
CREATE TABLE public.team_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_messages_team_id ON public.team_messages(team_id, created_at DESC);

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- Only team members can read or write their team's chat
CREATE POLICY "team_messages_select" ON public.team_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_messages.team_id AND tm.user_id = auth.uid()));

CREATE POLICY "team_messages_insert" ON public.team_messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_messages.team_id AND tm.user_id = auth.uid())
  );

CREATE POLICY "team_messages_delete" ON public.team_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

#### Migration 3 — `create_competitive_leaderboard_views.sql`

```sql
-- Lobby-level team scores
CREATE OR REPLACE VIEW public.lobby_team_scores AS
SELECT
  lr.lobby_id,
  l.match_day_id,
  lr.team_id,
  t.name AS team_name,
  t.tag AS team_tag,
  t.logo_url,
  SUM(lr.kills) AS total_kills,
  SUM(lr.kill_points) AS total_kill_points,
  SUM(lr.placement_points) AS total_placement_points,
  SUM(lr.total_points) AS total_points
FROM public.lobby_results lr
JOIN public.teams t ON t.id = lr.team_id
JOIN public.lobbies l ON l.id = lr.lobby_id
GROUP BY lr.lobby_id, l.match_day_id, lr.team_id, t.name, t.tag, t.logo_url;

-- Match day team scores (sum of all lobbies)
CREATE OR REPLACE VIEW public.match_day_team_scores AS
SELECT
  lts.match_day_id,
  md.name AS match_day_name,
  md.date AS match_date,
  md.season_id,
  lts.team_id,
  lts.team_name,
  lts.team_tag,
  lts.logo_url,
  SUM(lts.total_kills) AS total_kills,
  SUM(lts.total_kill_points) AS total_kill_points,
  SUM(lts.total_placement_points) AS total_placement_points,
  SUM(lts.total_points) AS total_points
FROM public.lobby_team_scores lts
JOIN public.match_days md ON md.id = lts.match_day_id
GROUP BY lts.match_day_id, md.name, md.date, md.season_id, lts.team_id, lts.team_name, lts.team_tag, lts.logo_url;

-- Seasonal leaderboard (all match days accumulated per season)
CREATE OR REPLACE VIEW public.season_team_leaderboard AS
SELECT
  mdts.season_id,
  s.name AS season_name,
  mdts.team_id,
  mdts.team_name,
  mdts.team_tag,
  mdts.logo_url,
  SUM(mdts.total_kills) AS season_kills,
  SUM(mdts.total_points) AS season_points,
  RANK() OVER (PARTITION BY mdts.season_id ORDER BY SUM(mdts.total_points) DESC) AS rank
FROM public.match_day_team_scores mdts
JOIN public.seasons s ON s.id = mdts.season_id
GROUP BY mdts.season_id, s.name, mdts.team_id, mdts.team_name, mdts.team_tag, mdts.logo_url;

-- Individual player season stats (for kill leaderboard + MVP)
CREATE OR REPLACE VIEW public.season_player_stats AS
SELECT
  md.season_id,
  lr.user_id,
  lr.team_id,
  t.name AS team_name,
  p.username,
  p.ign,
  p.avatar_url,
  SUM(lr.kills) AS total_kills,
  SUM(lr.kill_points) AS total_kill_points,
  SUM(lr.placement_points) AS total_placement_points,
  SUM(lr.total_points) AS total_points,
  COUNT(DISTINCT lr.lobby_id) AS lobbies_played,
  RANK() OVER (PARTITION BY md.season_id ORDER BY SUM(lr.total_points) DESC) AS rank
FROM public.lobby_results lr
JOIN public.match_days md ON md.id = (SELECT match_day_id FROM public.lobbies WHERE id = lr.lobby_id)
JOIN public.profiles p ON p.id = lr.user_id
JOIN public.teams t ON t.id = lr.team_id
GROUP BY md.season_id, lr.user_id, lr.team_id, t.name, p.username, p.ign, p.avatar_url;
```

---

### B) Frontend Routes to Add in `App.tsx`

Add these imports and routes inside the protected section:

```tsx
// Team pages
import { Teams } from '@/pages/Teams';
import { TeamPage } from '@/pages/TeamPage';
import { CreateTeam } from '@/pages/CreateTeam';
import { TeamChat } from '@/pages/TeamChat';
// Admin competitive pages
import { AdminMatchDays } from '@/pages/admin/MatchDays';
import { AdminLobbyEntry } from '@/pages/admin/LobbyEntry';
import { AdminSeasonalLeaderboard } from '@/pages/admin/SeasonalLeaderboard';
// Player-facing competitive pages
import { CompetitiveLeaderboard } from '@/pages/CompetitiveLeaderboard';

// Routes (add inside <ProtectedRoute>):
<Route path="/teams" element={<Teams />} />
<Route path="/teams/create" element={<CreateTeam />} />
<Route path="/teams/:teamId" element={<TeamPage />} />
<Route path="/teams/:teamId/chat" element={<TeamChat />} />
<Route path="/leaderboard/competitive" element={<CompetitiveLeaderboard />} />
<Route path="/admin/match-days" element={<AdminMatchDays />} />
<Route path="/admin/match-days/:matchDayId/lobbies/:lobbyId/entry" element={<AdminLobbyEntry />} />
<Route path="/admin/seasonal-leaderboard" element={<AdminSeasonalLeaderboard />} />
```

---

### C) Custom Hooks to Create

#### `src/hooks/useTeams.ts`

```typescript
// Exposes:
// - teams: Team[] — all teams
// - myTeam: Team | null — the team the current user belongs to
// - createTeam(name, tag) — inserts into teams + team_members (captain)
// - joinTeam(teamId) — inserts into team_members as 'member' (enforce one-team-per-user)
// - leaveTeam() — deletes from team_members
// - kickMember(userId) — captain/admin only, deletes team_members row
// - isLoading: boolean

// Implementation uses supabase.from('teams'), supabase.from('team_members')
// Check unique constraint on team_members.user_id before join
// Real-time subscription: supabase.channel('teams').on('postgres_changes', ...).subscribe()
```

#### `src/hooks/useTeamChat.ts`

```typescript
// Exposes:
// - messages: TeamMessage[] — paginated, oldest-first
// - sendMessage(content: string) — inserts into team_messages
// - isLoading: boolean
// - loadMore() — pagination (page size 30)

// Real-time subscription on team_messages for current team_id
// Uses supabase Realtime channel: supabase.channel(`team-chat-${teamId}`)
```

#### `src/hooks/useCompetitive.ts`

```typescript
// Exposes:
// - seasons: Season[]
// - activeSeason: Season | null
// - matchDays: MatchDay[]
// - getMatchDayLobbies(matchDayId) => Lobby[]
// - getLobbyResults(lobbyId) => LobbyResult[]
// - seasonLeaderboard: SeasonTeamLeaderboard[]
// - matchDayTeamScores: MatchDayTeamScore[]
// - playerSeasonStats: SeasonPlayerStats[]
// Uses the views created above
```

---

### D) Pages to Create

#### `src/pages/Teams.tsx` — Team Discovery Page
- Header: "Teams" with a "Create Team" button (top right)
- If user is on a team → shows their team card prominently with a "View Team" CTA
- Below: grid of all teams (name, tag, member count, logo if available)
- Search/filter input at top
- "Join" button on each card (disabled if user already has a team)
- Match NeXa dark theme: deep background, red accents, Space Grotesk / Orbitron font, glass cards

#### `src/pages/CreateTeam.tsx` — Team Creation Form
- Fields: Team Name, Team Tag (max 6 chars, auto-uppercased), optional logo URL
- Creates the team + adds the creator as 'captain'
- Validation: unique name, unique tag, min length 2

#### `src/pages/TeamPage.tsx` — Team Dashboard
- Shows: team name, tag, logo, member list (with roles, avatars, IGN)
- Captain controls: kick member, disband team
- Member controls: leave team
- "Team Chat" button → navigates to `/teams/:teamId/chat`
- Season stats widget: total points, rank in current season
- Match history: per-match-day score cards (collapsible)

#### `src/pages/TeamChat.tsx` — Private Team Chat
- Full-screen chat layout (message bubbles, avatar, username, timestamp)
- Realtime via Supabase channel
- Input field at bottom, send on Enter or button
- Only accessible to team members (guard in component using `useTeamChat`)
- Style: dark background, red accent on own messages, glass input bar

#### `src/pages/CompetitiveLeaderboard.tsx` — Player-Facing Leaderboard
- Tabs: "Season Leaderboard" | "Match Days" | "Player Stats"
- Season Leaderboard tab: ranked team cards (rank badge, team name, tag, season points, total kills)
- Match Days tab: select a match day → shows team scores per lobby + combined total
- Player Stats tab: individual player rankings (kills, total points, team)
- MVP badge on top scorer per match day
- All queries from the views created above

#### `src/pages/admin/MatchDays.tsx` — Admin Match Day Management
- List of all match days (with season, status, date)
- "Create Match Day" button → form (season, name, date, how many lobbies: 3 or 4)
- Each match day row → expand to show its lobbies, each with:
  - Status pill (Pending / Submitted / Verified)
  - "Enter Results" button → goes to AdminLobbyEntry
  - "Add Recording" button → inline input to paste recording URL
- "Complete Match Day" button → sets status to 'completed'

#### `src/pages/admin/LobbyEntry.tsx` — Admin Score Entry Form
- Loads all team members from `team_members` + profiles
- For each player: input fields for Kills (number) and Placement (number)
- Live preview of computed points beside each row: `kills×2 + placement_points = total`
- "Submit Results" → upserts into `lobby_results`
- After submit: show team score summary breakdown
- After all lobbies of a match day are submitted → auto-update match_day status to 'completed'

---

### E) Navigation Updates

Add to `src/components/Sidebar.tsx` and `src/components/MobileMenu.tsx`:
- Under a new **"Competitive"** section:
  - "Teams" → `/teams`
  - "Leaderboard" → `/leaderboard/competitive`
- Under existing **"Admin"** section (role-guarded):
  - "Match Days" → `/admin/match-days`

---

### F) TypeScript Types to Add (`src/types/competitive.ts`)

```typescript
export interface Team {
  id: string;
  name: string;
  tag: string;
  logo_url?: string;
  created_by: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'captain' | 'member';
  joined_at: string;
  profile?: {
    username: string;
    ign: string;
    avatar_url?: string;
    tier?: string;
  };
}

export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
}

export interface MatchDay {
  id: string;
  season_id: string;
  name: string;
  date: string;
  status: 'upcoming' | 'in_progress' | 'completed';
}

export interface Lobby {
  id: string;
  match_day_id: string;
  lobby_number: number;
  recording_url?: string;
  status: 'pending' | 'submitted' | 'verified';
}

export interface LobbyResult {
  id: string;
  lobby_id: string;
  user_id: string;
  team_id: string;
  kills: number;
  placement: number;
  kill_points: number;
  placement_points: number;
  total_points: number;
}

export interface TeamMessage {
  id: string;
  team_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url?: string;
  };
}
```

---

### G) Scoring Logic Reference (to embed in admin UI as a legend)

```
Kill Points    = kills × 2
Placement Points:
  Position 1–3   → 10 pts
  Position 4–7   →  7 pts
  Position 8–15  →  5 pts
  Position 16+   →  3 pts

Player Total  = Kill Points + Placement Points
Team Score    = Sum of all team members' totals in a lobby
Match Day     = Sum across all lobbies
Season        = Sum across all match days
```

---

### H) Supabase Type Regeneration

After applying all migrations, run:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

---

## Implementation Notes

- All competitive pages should follow the existing NeXa dark theme: `#0a0a0a` background, `#ec131e` primary red, Space Grotesk body, Orbitron for headings, glassmorphism cards.
- `LobbyEntry` admin page is the highest-priority UI — get it right before leaderboard rendering.
- The `season_player_stats` view's MVP logic: the player with the highest `total_points` in a single match day's lobby set is MVP. Query per match_day: `SELECT TOP 1 ... ORDER BY total_points DESC`.
- Real-time chat subscription should call `.unsubscribe()` on component unmount.
- Enforce on the frontend that joining a team shows an error if `myTeam !== null`.

---
---
---

# PROMPT 2 — PAGA PAYMENT INTEGRATION (REPLACE FLUTTERWAVE + PAYSTACK)

## Context

NeXa Esports currently uses **Flutterwave v3** for:
1. Wallet funding (redirect to Flutterwave hosted checkout → `flutterwave-initiate-payment` edge function)
2. Withdrawals to Nigerian bank accounts (`flutterwave-transfer` edge function)
3. Payouts (`paystack` edge function — partially used)
4. Airtime purchases (via **VTPass**, NOT Flutterwave — **do not change this**)
5. Data purchases (also via **VTPass** — **do not change this**)

The wallet system lives in Supabase with:
- `wallets` table (user_id, balance)
- `transactions` table (user_id, type, amount, status, description)
- Stored procedures: `update_wallet_and_create_transaction`, `execute_user_transfer`, `credit_wallet`

**Important**: The VTPass airtime/data integration must remain untouched. Only payment gateway calls (fund wallet, withdraw, marketplace checkout, transfer between bank accounts) move to Paga.

---

## Paga Business API Overview

Paga is a Nigerian payment gateway with a **Business API** (REST-based). Key endpoints:

| Operation | Endpoint |
|---|---|
| Get balance | `POST /paga-webservices/business-rest/secured/getAccountBalance` |
| Money transfer (bank) | `POST /paga-webservices/business-rest/secured/moneyTransferToBankAccount` |
| Money transfer (paga user) | `POST /paga-webservices/business-rest/secured/moneyTransfer` |
| Get banks | `POST /paga-webservices/business-rest/secured/getBanks` |
| Validate deposit | `POST /paga-webservices/business-rest/secured/validateDepositToWallet` |
| Deposit to wallet | `POST /paga-webservices/business-rest/secured/depositToWallet` |
| Airtime (Paga) | `POST /paga-webservices/business-rest/secured/airtimePurchase` — SKIP (keep VTPass) |
| Data (Paga) | SKIP — keep VTPass |
| Bill payment | `POST /paga-webservices/business-rest/secured/payBill` |
| Transaction status | `POST /paga-webservices/business-rest/secured/transactionHistory` |

**Authentication**: SHA-512 HMAC hash of `referenceNumber + amount + destinationAccount + apiKey` (varies by endpoint) concatenated as a string, then hashed with `apiPassword`. The hash goes in `Authorization` header.

**Base URLs**:
- Sandbox: `https://beta.mypaga.com`
- Production: `https://www.mypaga.com`

**Credentials needed (add to `.env` and Supabase Edge Function secrets)**:
```
PAGA_API_KEY=your_paga_api_key
PAGA_API_PASSWORD=your_paga_api_password
PAGA_PUBLIC_KEY=your_paga_public_key   # for client-side if needed
PAGA_BASE_URL=https://www.mypaga.com   # or beta for sandbox
PAGA_ORGANIZATION_NAME=NeXa Esports
```

---

## What to Build

### A) Shared Paga Utility (`supabase/functions/_shared/pagaAuth.ts`)

```typescript
// Helper for Paga API HMAC authentication
import { createHash, createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

export function generatePagaHash(fields: string[], apiPassword: string): string {
  // Concatenate all fields (non-null) in order, then HMAC-SHA512 with apiPassword
  const hashInput = fields.filter(Boolean).join('');
  return createHmac('sha512', apiPassword).update(hashInput).digest('hex');
}

export function pagaHeaders(hash: string, apiKey: string) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `${hash}`,
    'principal': apiKey,
    'credentials': hash,
  };
}

export function generateReferenceNumber(prefix: string = 'NX'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}
```

### B) New Supabase Edge Functions

#### 1. `paga-initiate-payment` — Fund Wallet via Paga

**Replace**: `flutterwave-initiate-payment`

**Strategy**: Paga uses a "Deposit to Wallet" flow where you direct the user to Paga's web checkout or use their virtual account for collection. The edge function generates a unique reference, creates a pending transaction in Supabase, and returns a Paga deposit URL or instructions.

```typescript
// File: supabase/functions/paga-initiate-payment/index.ts
// Input: { amount: number, customer: { email, phone, name } }
// Flow:
//   1. Validate user session (same as flutterwave version)
//   2. Check clan_settings.deposits_enabled
//   3. Generate referenceNumber
//   4. Create pending transaction in transactions table
//   5. Call Paga depositToWallet or redirect to Paga checkout page
//   6. Return: { status: 'success', data: { payment_url, reference } }
//
// Paga depositToWallet request body:
// {
//   referenceNumber, amount, currency: "NGN",
//   payer: { phoneNumber, firstName, lastName, email },
//   paymentDestination: "your_paga_business_account",
//   callbackUrl: `${origin}/payment-success?ref=${referenceNumber}`
// }
// Hash = SHA512(referenceNumber + amount + pagaApiKey)
```

#### 2. `paga-verify-payment` — Webhook + Verification

**Replace**: `flutterwave-verify-payment` + `flutterwave-webhook`

```typescript
// File: supabase/functions/paga-verify-payment/index.ts
// Input: { reference: string }
// Flow:
//   1. Query Paga transactionHistory API for the reference
//   2. If status === 'SUCCESSFUL':
//      a. Check transactions table — if already credited, return early (idempotency)
//      b. Call credit_wallet stored procedure with (user_id, amount, fee)
//      c. Update transaction status to 'completed'
//   3. Return { success: true, credited_amount }
```

#### 3. `paga-webhook` — Incoming payment notifications

```typescript
// File: supabase/functions/paga-webhook/index.ts
// Paga will POST to this URL on payment completion
// Verify the hash in the request against PAGA_API_PASSWORD
// On success: call paga-verify-payment logic inline
// Return 200 quickly; do heavy work async
```

#### 4. `paga-transfer` — Withdraw to Nigerian Bank

**Replace**: `flutterwave-transfer`

```typescript
// File: supabase/functions/paga-transfer/index.ts
// Input: { account_bank, account_number, amount, narration, beneficiary_name }
// Flow:
//   1. Validate user session + PIN verification (existing pin system unchanged)
//   2. Check clan_settings.withdrawals_enabled
//   3. Check user wallet balance >= amount
//   4. Generate referenceNumber
//   5. Call Paga moneyTransferToBankAccount:
//      POST /moneyTransferToBankAccount
//      Body: { referenceNumber, amount, destinationBankCode, destinationBankAccountNumber,
//              destinationBankAccountName, currency: "NGN", reason: narration }
//      Hash = SHA512(referenceNumber + amount + destinationBankAccountNumber + pagaApiKey)
//   6. On Paga success: debit wallet via execute_user_transfer procedure
//   7. Return { success: true, reference }
```

#### 5. `paga-get-banks` — Get Nigerian Bank List

**Replace**: `flutterwave-get-banks` + `paystack-get-banks`

```typescript
// File: supabase/functions/paga-get-banks/index.ts
// Calls Paga getBanks endpoint
// Returns: [{ id, name, code }] in the same shape the frontend already expects
// Cache result in Supabase (e.g., clan_settings table) for 24h to reduce API calls
```

#### 6. `paga-verify-bank-account` — Validate Account Before Withdraw

**Replace**: `flutterwave-verify-bank-account` + `verify-bank-account`

```typescript
// File: supabase/functions/paga-verify-bank-account/index.ts
// Input: { bank_code, account_number }
// Calls Paga validateDepositToWallet (or account lookup)
// Returns: { account_name: string }
```

#### 7. `paga-marketplace-checkout` — Buyer pays via wallet (already wallet-based, just update naming)

The marketplace checkout currently deducts from wallet balance directly (no external gateway call). **This does not need to change** — it already uses the `execute_user_transfer` Supabase procedure. Just update any UI strings mentioning "Flutterwave" or "Paystack" in the checkout modal.

---

### C) Frontend Changes

#### 1. `src/pages/wallet/FundWallet.tsx`

- Change the edge function call from `flutterwave-initiate-payment` → `paga-initiate-payment`
- Update the "Secure Payment" alert text: replace "Flutterwave" → "Paga"
- The redirect URL flow remains the same (`window.location.href = data.data.payment_url`)
- Keep the exact same UI — only the edge function name and branding change

#### 2. `src/pages/wallet/Withdraw.tsx`

- Change the edge function call from `flutterwave-transfer` → `paga-transfer`
- Change bank list fetch from `flutterwave-get-banks` or `paystack-get-banks` → `paga-get-banks`
- Change account verification from `flutterwave-verify-bank-account` → `paga-verify-bank-account`
- The PIN verification flow, cooldown timers, and UI remain unchanged

#### 3. `src/components/wallet/FundWalletFlow.tsx`

- Update description text: "processed securely via Paga" (was Flutterwave)
- No logic changes — this component delegates to `onPaymentInitiate` prop

#### 4. `src/components/wallet/FlutterwaveHistory.tsx`

- Rename file to `src/components/wallet/PagaPaymentHistory.tsx`
- Update edge function calls from `flutterwave-get-transactions` → new `paga-get-transactions` function (or remove if Paga doesn't offer a separate transaction history endpoint — use the local `transactions` table instead)
- Update all component imports across the app

#### 5. `src/pages/Wallet.tsx`

- Replace `<FlutterwaveHistory />` import with `<PagaPaymentHistory />`
- Update any strings mentioning "Flutterwave" or "Paystack"

#### 6. `src/pages/payment/success.tsx`

- Update to verify payment via `paga-verify-payment` instead of `flutterwave-verify-payment`
- Keep the same success/failure UI

#### 7. `src/components/marketplace/CheckoutModal.tsx`

- Already wallet-based — just update any copy saying "powered by Flutterwave" to "Secured by NeXa Wallet"

---

### D) Environment Variables

Add to `.env.example` and Supabase project secrets:

```env
# Paga Business API
PAGA_API_KEY=your_paga_api_key
PAGA_API_PASSWORD=your_paga_api_password
PAGA_BASE_URL=https://www.mypaga.com
PAGA_ORGANIZATION_NAME=NeXa Esports

# Remove (but keep commented for reference):
# FLW_PUBLIC_KEY=...
# FLW_SECRET_KEY=...
# FLW_ENCRYPTION_KEY=...
# FLW_WEBHOOK_SECRET=...
# PAYSTACK_SECRET_KEY=...
```

---

### E) Edge Functions to Deprecate (keep files, just stop calling them)

These can remain in the codebase without active calls to avoid breaking webhook configs during transition:
- `flutterwave-initiate-payment`
- `flutterwave-verify-payment`
- `flutterwave-webhook`
- `flutterwave-transfer`
- `flutterwave-get-banks`
- `flutterwave-verify-bank-account`
- `flutterwave-get-transactions`
- `paystack`
- `paystack-get-banks`
- `paystack-initiate-payment`
- `paystack-transfer`
- `paystack-webhook`
- `get-banks` (old unified)
- `verify-bank-account` (old unified)
- `verify-payment` (old unified)

**Do NOT deprecate**: `purchase-airtime`, `purchase-data`, `vtpass-webhook` — VTPass handles these, no Paga replacement needed.

---

### F) Supabase Migration for Paga Transaction Tracking

```sql
-- Add paga_reference to transactions table for reconciliation
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS paga_reference TEXT,
  ADD COLUMN IF NOT EXISTS paga_status TEXT,
  ADD COLUMN IF NOT EXISTS paga_raw_response JSONB;

CREATE INDEX IF NOT EXISTS idx_transactions_paga_reference ON public.transactions(paga_reference);
```

---

### G) Paga Webhook Registration

In your Paga Business dashboard:
- Set callback/webhook URL to: `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/paga-webhook`
- Register for payment completion events

---

## Implementation Order

**For Feature #1 (Teams + Competitive Scoring)**:
1. Apply all 3 SQL migrations
2. Regenerate Supabase types
3. Create TypeScript types file
4. Build custom hooks (`useTeams`, `useTeamChat`, `useCompetitive`)
5. Build `AdminLobbyEntry` page first (most critical)
6. Build `AdminMatchDays` page
7. Build `Teams`, `CreateTeam`, `TeamPage`, `TeamChat` pages
8. Build `CompetitiveLeaderboard` page
9. Update navigation (Sidebar + MobileMenu)
10. Register new routes in `App.tsx`

**For Feature #2 (Paga Integration)**:
1. Create `_shared/pagaAuth.ts` utility
2. Apply the transactions table migration
3. Build `paga-get-banks` edge function (simplest, test first)
4. Build `paga-verify-bank-account`
5. Build `paga-initiate-payment`
6. Build `paga-verify-payment`
7. Build `paga-webhook`
8. Build `paga-transfer`
9. Update frontend files in order: FundWallet → Withdraw → Wallet → payment/success
10. Rename `FlutterwaveHistory` → `PagaPaymentHistory`
11. Add env vars to Supabase secrets
12. Register Paga webhook URL in Paga dashboard
13. Test end-to-end in sandbox before switching `PAGA_BASE_URL` to production

---

## Final Notes

- Both features are fully independent — implement in separate PRs/branches
- The dark theme (red `#ec131e`, Space Grotesk, glassmorphism) must be applied to every new page
- All new admin pages need the `role IN ('admin', 'clan_master')` guard using `useAuth()`
- For the team chat: use Supabase Realtime with `postgres_changes` on `team_messages`
- For lobby results entry: show the scoring formula as an inline legend so admins always have context
- Paga sandbox credentials differ from production — add `IS_SANDBOX` env flag to switch base URL automatically
