# CCOS Developer Guide

> Credit Card Operating System — Full-Stack Developer Reference

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Environment Variables & Secrets](#3-environment-variables--secrets)
4. [Database Schema](#4-database-schema)
5. [Backend Configuration](#5-backend-configuration)
6. [Authentication (Clerk)](#6-authentication-clerk)
7. [Business Logic & Calculations](#7-business-logic--calculations)
8. [API Reference](#8-api-reference)
9. [Frontend Configuration](#9-frontend-configuration)
10. [Frontend Pages & Components](#10-frontend-pages--components)
11. [AI Statement Parsing](#11-ai-statement-parsing)
12. [Code Generation Pipeline](#12-code-generation-pipeline)
13. [Running Locally](#13-running-locally)
14. [Key Design Decisions](#14-key-design-decisions)

---

## 1. Project Overview

CCOS is a multi-user personal finance web application. Its primary purpose is to tell a user **which credit card to use today** based on utilization, billing cycle position, and payment due dates. It also tracks all transactions, manages card profiles, and can parse credit card statements via AI.

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Wouter, shadcn/ui, Tailwind CSS v4 |
| Backend | Express 5, Node.js 24 |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Clerk (multi-user, isolated per-user data) |
| AI | Claude claude-sonnet-4-6 via Anthropic API (statement parsing) |
| Monorepo | pnpm workspaces |
| Validation | Zod v4, drizzle-zod |
| API Contract | OpenAPI 3.1 → Orval codegen |

---

## 2. Monorepo Structure

```
workspace/
├── artifacts/
│   ├── api-server/          # Express 5 API server
│   │   ├── src/
│   │   │   ├── app.ts       # Express app setup, middleware mount order
│   │   │   ├── index.ts     # Entrypoint — reads PORT, starts server
│   │   │   ├── lib/
│   │   │   │   ├── calculations.ts  # All business logic (score, utilization, etc.)
│   │   │   │   └── logger.ts        # Pino structured logger
│   │   │   ├── middlewares/
│   │   │   │   ├── clerkProxyMiddleware.ts  # Proxies Clerk FAPI in production
│   │   │   │   └── requireAuth.ts           # Auth guard — injects req.userId
│   │   │   └── routes/
│   │   │       ├── index.ts          # Mounts all sub-routers
│   │   │       ├── health.ts         # GET /api/healthz
│   │   │       ├── cards.ts          # CRUD for /api/cards
│   │   │       ├── transactions.ts   # CRUD for /api/transactions
│   │   │       ├── dashboard.ts      # GET /api/dashboard (computed)
│   │   │       └── statements.ts     # POST /api/statements/parse (AI)
│   │   ├── build.mjs        # esbuild production bundler
│   │   └── package.json
│   │
│   └── ccos/                # React + Vite frontend
│       ├── src/
│       │   ├── App.tsx          # Root — ClerkProvider, WouterRouter, routes
│       │   ├── main.tsx         # DOM entry point
│       │   ├── pages/
│       │   │   ├── landing.tsx      # Public landing page (unauthenticated)
│       │   │   ├── dashboard.tsx    # Dashboard view
│       │   │   ├── cards.tsx        # Cards management
│       │   │   ├── transactions.tsx # Transactions list + statement upload
│       │   │   ├── add-transaction.tsx
│       │   │   └── not-found.tsx
│       │   ├── components/
│       │   │   ├── layout.tsx       # Sidebar, mobile nav, user menu
│       │   │   └── ui/              # shadcn/ui component library
│       │   └── lib/
│       │       ├── format.ts        # formatCurrency, formatDate, getUtilizationColor
│       │       └── utils.ts         # cn() utility
│       └── vite.config.ts
│
├── lib/
│   ├── api-spec/
│   │   ├── openapi.yaml         # Source of truth for API contract
│   │   └── orval.config.ts      # Codegen config
│   ├── api-client-react/        # Generated: React Query hooks + fetch client
│   ├── api-zod/                 # Generated: Zod schemas from OpenAPI
│   └── db/
│       ├── src/
│       │   ├── index.ts         # Drizzle client + pool setup
│       │   └── schema/
│       │       ├── cards.ts
│       │       └── transactions.ts
│       └── drizzle.config.ts
│
└── pnpm-workspace.yaml
```

---

## 3. Environment Variables & Secrets

All secrets are managed as Replit environment secrets and never committed to version control.

### API Server (`artifacts/api-server`)

| Variable | Source | Required | Purpose |
|---|---|---|---|
| `PORT` | Replit | Yes | Port the Express server listens on |
| `DATABASE_URL` | Replit PostgreSQL | Yes | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Clerk (auto-provisioned) | Yes | Server-side Clerk auth |
| `CLERK_PUBLISHABLE_KEY` | Clerk (auto-provisioned) | Yes | Used if needed server-side |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Replit AI integration | Yes | Anthropic proxy base URL |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Replit AI integration | Yes | Anthropic proxy API key |

### Frontend (`artifacts/ccos`)

| Variable | Source | Required | Purpose |
|---|---|---|---|
| `PORT` | Replit | Yes | Vite dev server port |
| `BASE_PATH` | Replit | Yes | App base path prefix (e.g. `/`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk (auto-provisioned) | Yes | Client-side Clerk key |
| `VITE_CLERK_PROXY_URL` | Replit (production only) | No | Clerk FAPI proxy path |

> **Note:** `VITE_*` variables are injected at build time via `define` in `vite.config.ts`, because Vite does not automatically forward process env vars to `import.meta.env` — it only reads `.env` files. The Vite config explicitly maps:
> ```ts
> "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY": JSON.stringify(
>   process.env.VITE_CLERK_PUBLISHABLE_KEY ?? process.env.CLERK_PUBLISHABLE_KEY ?? ""
> )
> ```

---

## 4. Database Schema

Managed by Drizzle ORM. Schema lives in `lib/db/src/schema/`.

### `cards` table

```typescript
pgTable("cards", {
  id:           integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId:       text("user_id"),           // Clerk user ID — scopes data per user
  name:         text("name").notNull(),
  bank:         text("bank"),              // Optional bank name
  limit:        real("limit").notNull(),   // Credit limit in USD
  statementDay: integer("statement_day").notNull(), // Day of month statement closes (1–31)
  dueDay:       integer("due_day").notNull(),       // Day of month payment is due (1–31)
  color:        text("color"),             // Hex color string, e.g. "#1a56db"
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
```

### `transactions` table

```typescript
pgTable("transactions", {
  id:        integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId:    text("user_id"),             // Clerk user ID — scopes data per user
  type:      text("type", { enum: ["expense", "payment", "income"] }).notNull(),
  amount:    real("amount").notNull(),    // Always positive
  date:      text("date").notNull(),      // ISO 8601 string: "YYYY-MM-DD"
  cardId:    integer("card_id").references(() => cardsTable.id, { onDelete: "cascade" }),
  note:      text("note"),               // Optional description
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
```

**Key constraints:**
- `cardId` uses `onDelete: "cascade"` — deleting a card also deletes linked transactions
- `userId` is nullable to support migration from pre-auth rows; all new rows are always written with a userId
- `amount` is always stored as a positive number; the sign (credit vs debit) is inferred from `type`

### Transaction types

| Type | Meaning | Effect on card balance |
|---|---|---|
| `expense` | A purchase on a card or cash | Increases `used` on the linked card |
| `payment` | A payment toward a card balance | Decreases `used` on the linked card |
| `income` | Cash income (salary, etc.) | Increases `cashBalance` only |

### Running migrations

```bash
# Development — push schema diff directly (safe for dev)
pnpm --filter @workspace/db exec drizzle-kit push

# If there are destructive changes that need forcing
pnpm --filter @workspace/db exec drizzle-kit push --force
```

---

## 5. Backend Configuration

### Express app setup (`artifacts/api-server/src/app.ts`)

Middleware is mounted in a strict order — **Clerk proxy must come before body parsers** because it streams raw bytes:

```
1. pinoHttp (structured logging)
2. CLERK_PROXY_PATH → clerkProxyMiddleware()   ← must be before express.json()
3. cors({ credentials: true, origin: true })
4. express.json()
5. express.urlencoded({ extended: true })
6. clerkMiddleware()                            ← Clerk session parsing
7. /api → router                               ← all business routes
```

### Route structure

All business routes are mounted under `/api` and are authenticated via `requireAuth`. The health route (`/api/healthz`) does **not** require auth.

```
GET  /api/healthz                → health check (public)
GET  /api/cards                  → list user's cards
POST /api/cards                  → create card
GET  /api/cards/:id              → get card by ID
PUT  /api/cards/:id              → update card
DEL  /api/cards/:id              → delete card
GET  /api/transactions           → list transactions (?type=&cardId=)
POST /api/transactions           → create transaction
DEL  /api/transactions/:id       → delete transaction
GET  /api/dashboard              → computed dashboard summary
POST /api/statements/parse       → AI statement extraction (multipart/form-data)
```

### `requireAuth` middleware

Located at `artifacts/api-server/src/middlewares/requireAuth.ts`. Reads the Clerk session from the request (set by `clerkMiddleware()`) and either:
- Extracts `userId` and attaches it to `req.userId`, then calls `next()`, or
- Returns `401 { error: "Unauthorized" }` if no valid session

```typescript
import { getAuth } from "@clerk/express";

export function requireAuth(req, res, next) {
  const auth = getAuth(req);
  if (!auth?.userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = auth.userId;
  next();
}
```

Every route handler then uses `req.userId` to scope all DB queries:
```typescript
const cards = await db
  .select()
  .from(cardsTable)
  .where(eq(cardsTable.userId, req.userId));
```

### Build system

The API server is bundled with esbuild for production via `build.mjs`. The dev command runs build then start:

```json
{
  "dev": "export NODE_ENV=development && pnpm run build && pnpm run start",
  "build": "node ./build.mjs",
  "start": "node --enable-source-maps ./dist/index.mjs"
}
```

---

## 6. Authentication (Clerk)

### Architecture

CCOS uses Clerk for authentication. In **development**, Clerk's standard JS SDK handles auth with the Clerk-hosted frontend API. In **production**, the backend proxies Clerk Frontend API requests through `/api/__clerk` to support `.replit.app` domains without custom DNS.

```
Development:  browser → clerk.dev (direct)
Production:   browser → /api/__clerk → clerkProxyMiddleware → clerk.dev
```

### Clerk proxy middleware

`clerkProxyMiddleware` is a no-op in development. In production it uses `http-proxy-middleware` to forward requests and inject required headers (`Clerk-Proxy-Url`, `Clerk-Secret-Key`, `X-Forwarded-For`).

### Frontend Clerk setup (`App.tsx`)

```
WouterRouter (base=basePath)
  └── ClerkProvider (publishableKey, proxyUrl, routerPush, routerReplace)
        └── QueryClientProvider
              └── ClerkQueryClientCacheInvalidator   ← clears React Query cache on user change
              └── Switch (routes)
                    /          → HomeRedirect (landing or /dashboard)
                    /sign-in   → SignInPage
                    /sign-up   → SignUpPage
                    /dashboard → ProtectedRoute → Dashboard
                    /cards     → ProtectedRoute → Cards
                    /transactions → ProtectedRoute → Transactions
                    /add       → ProtectedRoute → AddTransaction
```

`ProtectedRoute` uses Clerk's `<Show when="signed-in">` to render the app layout, and `<Show when="signed-out">` to redirect to `/`.

### Route naming note

All wouter routes use **base-relative paths** inside `<WouterRouter base={basePath}>`. Clerk's `<SignIn path>` and `<SignUp path>` props require the **full browser path** (including basePath) because Clerk reads `window.location.pathname` directly:

```tsx
<SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
```

---

## 7. Business Logic & Calculations

All logic lives in `artifacts/api-server/src/lib/calculations.ts`. There is no client-side calculation — the frontend only renders values returned by the API.

### `getCardUsed(cardId, transactions): number`

Computes the current outstanding balance on a card.

```
used = sum(expense amounts on card) − sum(payment amounts on card)
used = max(0, used)   // never goes negative
```

Income transactions do not affect card balance at all.

### `getUtilization(card, transactions): number`

```
utilization = used / card.limit
```

Returns a decimal between 0 and 1 (e.g. 0.35 = 35%). If `card.limit` is 0, returns 0 to avoid division by zero.

### `getSafeSpendRemaining(card, transactions): number`

The **SafeSpend** threshold is 40% of the credit limit. This is the recommended maximum to maintain a healthy credit utilization ratio.

```
safeSpendRemaining = max(0, card.limit × 0.40 − used)
```

**Example:** Card with $10,000 limit, $2,000 currently used:
```
safeSpendRemaining = max(0, 10000 × 0.40 − 2000)
                   = max(0, 4000 − 2000)
                   = $2,000 remaining safe spend
```

If `used` exceeds `card.limit × 0.40`, `safeSpendRemaining` returns `0` (not negative).

**Rationale:** Credit utilization above 40% begins to negatively impact credit scores and signals financial risk. The 40% boundary is the trigger for both warnings and the safe spend calculation.

### `getDaysUntilDue(dueDay): number`

Calculates days until the next payment due date. If the due day has already passed this month, it rolls to next month.

```typescript
const due = new Date(today.getFullYear(), today.getMonth(), dueDay);
if (due <= today) due.setMonth(due.getMonth() + 1);
return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
```

### `getCycleDay(statementDay): number`

Returns how many days into the current billing cycle today is. Day 1 is the statement closing date.

```typescript
let statement = new Date(today.getFullYear(), today.getMonth(), statementDay);
if (today.getDate() < statementDay) statement.setMonth(statement.getMonth() - 1);
return Math.floor((today - statement) / (1000 * 60 * 60 * 24)) + 1;
```

**Example:** Statement closes on the 5th. Today is the 8th → cycleDay = 4.

### `getCardScore(card, transactions): number`

Produces a composite score used to rank cards for the "Best Card" recommendation. Higher is better.

| Condition | Points |
|---|---|
| Cycle day is 1–5 (early in billing cycle) | **+50** |
| Utilization < 30% | **+20** |
| Utilization > 40% | **−100** |
| Due within 5 days AND balance > 0 | **−40** |

**Rationale for each rule:**
- **+50 for early cycle:** Spending early in the cycle gives maximum time for the statement to close before the balance is reported to credit bureaus.
- **+20 for low utilization:** Rewards cards that have plenty of headroom.
- **−100 for over threshold:** Strongly discourages use of cards already at or above the 40% safe spend boundary.
- **−40 for due soon with balance:** Spending on a card with a payment due imminently increases the amount owed before it can be paid, increasing interest risk.

### `getWarnings(cards, transactions): WarningItem[]`

Generates an ordered list of user-facing alerts.

#### Warning: `utilization`

Triggered when a card's utilization exceeds 40%.

| Utilization | Severity |
|---|---|
| > 40% and ≤ 70% | `warning` |
| > 70% | `critical` |

#### Warning: `due_soon`

Triggered when a card with a non-zero balance has a payment due soon.

| Days until due | Severity |
|---|---|
| ≤ 7 days | `info` |
| ≤ 3 days | `warning` |
| ≤ 1 day | `critical` |

#### Warning: `cash_buffer`

Triggered when the user's cash balance is thin relative to total card balances.

```
cashBalance    = income − payments − cash expenses (expenses with no cardId)
totalCardUsed  = sum of used across all cards

trigger when: cashBalance < totalCardUsed × 0.20
severity:     "critical" if cashBalance < 0, else "warning"
```

**Interpretation:** The user should have at least 20% of their total card balance in available cash to comfortably service their debt.

### `toCardSummary(card, transactions)`

Convenience function that bundles all computed fields into a single object returned by the Cards and Dashboard endpoints:

```typescript
{
  id, name, bank, color, limit,
  used,                 // getCardUsed()
  utilization,          // getUtilization()
  safeSpendRemaining,   // getSafeSpendRemaining()
  daysUntilDue,         // getDaysUntilDue()
  score,                // getCardScore()
}
```

### Dashboard: `cashBalance`

```
cashBalance = sum(income transactions) − sum(payment transactions) − sum(cash expenses)
```

"Cash expenses" are `expense` type transactions with no `cardId` (i.e. cash purchases not charged to a card).

### Dashboard: `bestCard`

The card with the highest `score`. If multiple cards tie, the first one wins (array order from DB is by `createdAt ASC`). Returns `null` if the user has no cards.

---

## 8. API Reference

All endpoints require a valid Clerk session cookie (set by the browser automatically). The `requireAuth` middleware enforces this and injects `req.userId`.

### Cards

#### `GET /api/cards`

Returns all cards belonging to the authenticated user, each enriched with computed summary fields.

**Response:** `Card[]`

```json
[
  {
    "id": 1,
    "name": "Chase Sapphire",
    "bank": "Chase",
    "limit": 10000,
    "statementDay": 5,
    "dueDay": 2,
    "color": "#1a56db",
    "used": 535.00,
    "utilization": 0.0535,
    "safeSpendRemaining": 3465.00,
    "daysUntilDue": 1,
    "score": 20,
    "createdAt": "2026-04-01T00:00:00Z"
  }
]
```

#### `POST /api/cards`

Creates a new card for the authenticated user.

**Body:** `CreateCardBody`

```json
{
  "name": "Sapphire Reserve",
  "bank": "Chase",
  "limit": 10000,
  "statementDay": 5,
  "dueDay": 2,
  "color": "#1a56db"
}
```

**Response:** `201 Card`

#### `PUT /api/cards/:id`

Updates an existing card. The card must belong to the authenticated user (enforced by `WHERE id = ? AND user_id = ?`).

**Body:** Same as `CreateCardBody`

**Response:** `200 Card`

#### `DELETE /api/cards/:id`

Deletes a card and cascades to linked transactions. Returns `204 No Content`.

---

### Transactions

#### `GET /api/transactions`

Returns all transactions for the authenticated user, sorted by `date DESC, createdAt DESC`.

**Query params:**

| Param | Type | Description |
|---|---|---|
| `type` | `expense \| payment \| income` | Filter by transaction type |
| `cardId` | `integer` | Filter by card |

**Response:** `Transaction[]`

```json
[
  {
    "id": 1,
    "type": "expense",
    "amount": 85.00,
    "date": "2026-04-01",
    "cardId": 1,
    "note": "Dinner out",
    "cardName": "Chase Sapphire",
    "createdAt": "2026-04-01T12:00:00Z"
  }
]
```

#### `POST /api/transactions`

Creates a new transaction.

**Body:** `CreateTransactionBody`

```json
{
  "type": "expense",
  "amount": 85.00,
  "date": "2026-04-01",
  "cardId": 1,
  "note": "Dinner out"
}
```

**Response:** `201 Transaction`

#### `DELETE /api/transactions/:id`

Deletes a transaction. Returns `204 No Content`.

---

### Dashboard

#### `GET /api/dashboard`

Returns a fully computed summary for the authenticated user.

**Response:** `DashboardSummary`

```json
{
  "bestCard": { ...CardSummary },
  "cards": [ ...CardSummary[] ],
  "warnings": [
    {
      "type": "due_soon",
      "message": "Chase Sapphire: payment due in 1 day(s)",
      "cardId": 1,
      "severity": "critical"
    }
  ],
  "totalSafeSpendRemaining": 8545.00,
  "totalUsed": 655.00,
  "totalLimit": 23000.00,
  "cashBalance": 4345.00,
  "recentTransactions": [ ...Transaction[] ]
}
```

---

### Statement Parsing

#### `POST /api/statements/parse`

Parses a credit card statement image or PDF using Claude AI and returns extracted transactions for review.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `statement` | `File` | Yes | JPEG, PNG, WebP, GIF, or PDF (max 10 MB) |
| `cardId` | `string` | No | Card ID to pre-assign extracted transactions |

**Response:**

```json
{
  "count": 12,
  "transactions": [
    {
      "date": "2026-03-15",
      "note": "AMAZON.COM",
      "amount": 49.99,
      "type": "expense",
      "cardId": 1
    }
  ]
}
```

The response is a **preview only** — transactions are not saved to the database. The frontend presents them for review and calls `POST /api/transactions` for each confirmed row.

---

## 9. Frontend Configuration

### Vite config (`artifacts/ccos/vite.config.ts`)

Key configuration points:

- **`base`** — set from `BASE_PATH` env var; controls the URL prefix for all asset paths
- **`define`** — explicitly injects `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_CLERK_PROXY_URL` into `import.meta.env` from process env (Vite does not auto-expose process.env to the browser)
- **`server.allowedHosts: true`** — required for the Replit iframe proxy
- **`resolve.dedupe: ["react", "react-dom"]`** — prevents duplicate React instances from monorepo hoisting

### API client base URL

The generated API client (`@workspace/api-client-react`) defaults to the same origin with `/api` prefix. No manual base URL setup is needed for web — the browser sends cookies automatically, which is how Clerk session auth works in the browser.

### State management

All server state is managed by **TanStack Query** (React Query). The generated hooks (e.g. `useListCards`, `useCreateCard`) wrap fetch calls with caching, loading states, and mutation callbacks.

Query cache invalidation pattern:

```typescript
queryClient.invalidateQueries({ queryKey: getListCardsQueryKey() });
queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
```

Both keys are invalidated after any mutation because card changes affect dashboard totals.

### Routing

Uses **Wouter** with a base path from `import.meta.env.BASE_URL`:

```typescript
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
<WouterRouter base={basePath}>
```

| Route | Auth required | Component |
|---|---|---|
| `/` | No | `Landing` or redirect to `/dashboard` |
| `/sign-in/*` | No | Clerk `<SignIn>` |
| `/sign-up/*` | No | Clerk `<SignUp>` |
| `/dashboard` | Yes | `Dashboard` |
| `/cards` | Yes | `Cards` |
| `/transactions` | Yes | `Transactions` |
| `/add` | Yes | `AddTransaction` |

---

## 10. Frontend Pages & Components

### `Landing` (`/`)

Public marketing page shown to unauthenticated visitors. Contains hero section, feature grid, and CTAs linking to `/sign-in` and `/sign-up`. Authenticated users are redirected to `/dashboard` immediately.

### `Dashboard` (`/dashboard`)

Fetches `GET /api/dashboard`. Renders:
- Best card recommendation banner with score badge
- Four stat cards (total safe spend, total used, cash balance, total limit)
- Warnings list with severity icons
- Recent transactions table (last 10)
- Per-card utilization grid

### `Cards` (`/cards`)

Fetches `GET /api/cards`. Each card shows:
- Safe spend remaining (primary metric)
- Credit limit
- Used amount + utilization progress bar (green < 30%, yellow 30–40%, red > 40%)
- Statement day and due day with `daysUntilDue` countdown
- Edit pencil button → opens `CardFormDialog` pre-populated with existing values
- Delete button → `AlertDialog` confirmation → `DELETE /api/cards/:id`

**`CardFormDialog`** is a shared component used for both add and edit. Uses `react-hook-form` with `values` prop (not `defaultValues`) so form fields re-populate correctly when switching between cards.

### `Transactions` (`/transactions`)

Fetches `GET /api/transactions` with optional `type` filter. Includes:
- Type filter dropdown
- "Upload Statement" button → `StatementUploadDialog`
- Transaction table with hover-reveal delete button

**`StatementUploadDialog`** — 2-step flow:
1. Card selector + file picker → `POST /api/statements/parse`
2. Scrollable review table with per-row checkboxes → batch `POST /api/transactions`

### `AddTransaction` (`/add`)

Form with type selector, amount, date, note, and card selector. On submit calls `POST /api/transactions` and invalidates both `listTransactions` and `getDashboard` query keys.

### `Layout` component

Renders the shell (sidebar on desktop, bottom nav on mobile) that wraps all authenticated pages. Contains:
- Sidebar nav with active-link highlighting
- "Add Entry" shortcut button
- `UserMenu` dropdown (avatar → name/email → sign out)

### `format.ts` utilities

```typescript
formatCurrency(amount: number)       // → "$1,234.56" (USD, en-US locale)
formatDate(dateString: string)       // → "Apr 1, 2026" (ISO string input)
getUtilizationColor(utilization: number) // → "bg-green-500" | "bg-yellow-500" | "bg-red-500"
```

Color thresholds:
- `< 0.30` → green (healthy)
- `0.30 – 0.40` → yellow (approaching limit)
- `> 0.40` → red (over safe threshold)

---

## 11. AI Statement Parsing

Endpoint: `POST /api/statements/parse`

### File handling

Uses `multer` with memory storage. Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`. Max size: 10 MB.

### Claude prompt strategy

The file is sent to `claude-sonnet-4-6` as:
- **Images** → `image` content block with base64 source
- **PDFs** → `document` content block with base64 source (Anthropic document type)

The prompt instructs Claude to return **only a JSON array** with no surrounding text, in the format:
```json
[{ "date": "YYYY-MM-DD", "description": "...", "amount": 12.34, "type": "expense" }]
```

### Response extraction

The raw AI text is searched for a JSON array with regex `/\[[\s\S]*\]/`. This is defensive — if Claude includes any explanation text, it is discarded. If no array is found, a `422` error is returned.

### Validation rules

After parsing, transactions are filtered:
- `amount` must be positive
- `type` must be `"expense"` or `"payment"` (income is never extracted from statements)
- `date` must be present

### Integration with frontend

The parsed transactions are returned to the frontend for review. The user can:
- Check/uncheck individual rows before importing
- Use "Select All" / "Deselect All"
- Click "Re-upload" to start over

Confirmed transactions are imported one by one via sequential `POST /api/transactions` calls (not a bulk endpoint), so partial success is handled gracefully — succeeded/failed counts are shown in a toast.

---

## 12. Code Generation Pipeline

The API contract is defined in `lib/api-spec/openapi.yaml` and is the **single source of truth**. Changes to the API shape must be reflected there first.

### Running codegen

```bash
pnpm --filter @workspace/api-spec run codegen
```

This runs Orval and generates two packages:

| Package | Output | Contains |
|---|---|---|
| `lib/api-client-react` | `src/generated/` | React Query hooks, fetch client |
| `lib/api-zod` | `src/generated/` | Zod schemas for request/response validation |

### After adding a new endpoint

1. Add the path and schema to `openapi.yaml`
2. Run codegen
3. Write the Express route handler using the new Zod schemas from `@workspace/api-zod`
4. Use the new generated hooks from `@workspace/api-client-react` in the frontend

> The `POST /api/statements/parse` endpoint is **not** in the OpenAPI spec because it uses `multipart/form-data` which the codegen does not handle well. It is called directly via `fetch()` in the frontend with a manually constructed `FormData` object.

---

## 13. Running Locally

### Prerequisites

- pnpm v10+
- Node.js v24
- A provisioned PostgreSQL database (`DATABASE_URL` set)
- Clerk keys (`CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`)
- Anthropic API access (`AI_INTEGRATIONS_ANTHROPIC_BASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY`)

### Start dev servers

```bash
# API server (runs on $PORT, defaults to 8080)
pnpm --filter @workspace/api-server run dev

# Frontend (runs on $PORT with base $BASE_PATH)
pnpm --filter @workspace/ccos run dev
```

### Push DB schema changes

```bash
pnpm --filter @workspace/db exec drizzle-kit push
```

### Full typecheck

```bash
pnpm run typecheck
```

This runs `tsc --build --emitDeclarationOnly` across all workspace packages in dependency order.

---

## 14. Key Design Decisions

### Zod v4 + drizzle-zod compatibility

Standard `createInsertSchema(...).omit({ id: true, createdAt: true })` does not work with Zod v4. The correct pattern is:

```typescript
createInsertSchema(table, {
  id: z.never().optional(),
  createdAt: z.never().optional(),
  userId: z.never().optional(), // also exclude server-set fields
})
```

### Per-user data isolation

Every DB query in the routes filters by `req.userId`. When creating records, `userId` is always injected server-side from the verified Clerk session — it is never accepted from the request body, preventing spoofing.

### `safeSpendRemaining` never goes negative

All computed numeric values are floored at 0. A card that is over its safe threshold shows `$0.00` safe spend remaining, not a negative number, avoiding UI confusion.

### Card deletion behavior

Deleting a card uses `onDelete: "cascade"` on the `cardId` foreign key in `transactions`. This means all transactions linked to a deleted card are also deleted. This is intentional — orphan transactions with a missing card create calculation confusion.

### Dashboard "bestCard" is computed server-side

The score algorithm is entirely on the backend. This ensures consistency — a future mobile client, CLI, or webhook would all receive the same recommendation without duplicating logic.

### `getCycleDay` uses calendar month boundaries

Rather than a fixed 30-day rolling window, cycle position is calculated from the statement closing date within the current calendar month. This matches how real credit card cycles work.
