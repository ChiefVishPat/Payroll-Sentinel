# Payroll Sentinel

A slim, always-on watchdog that monitors cash flow against payroll requirements to prevent NSF failures.

## Project Overview

Warp Sentinel links a startup's funding account (via Plaid) to its next scheduled payroll run (via Check) and warns stakeholders via Slack whenever projected cash is less than the required float (payroll cost × 1.10).

### Why It Matters

Failed payroll ACH pulls lead to:
- Angry employees
- State penalties  
- Hours of founder fire-drills

Warp Sentinel prevents these issues by providing early warnings before cash flow problems impact payroll.

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------||
| **Frontend** | React + Vite + TypeScript, Tailwind, Recharts | Fast DX, type-safe, Warp-style styling, lightweight charting |
| **Backend** | Node 18 + TypeScript + Fastify | Minimal, typed, high performance; easy middleware |
| **Database** | Supabase Postgres | Free tier, row-level security, websockets |
| **APIs** | Plaid SDK, Check SDK | Same rails Warp uses; sandbox keys keep it $0 |
| **Messaging** | @slack/web-api | No infrastructure to manage |
| **CI/CD** | GitHub Actions | Mirrors Warp's shipping culture |
| **Hosting** | Fly.io 256 MB VM | One-command deploy, global edge |

## Project Structure

```
warp-sentinel/
├── frontend/                 # React frontend (Phase 5+)
├── backend/                  # Node.js/Fastify API
│   ├── src/
│   │   ├── index.ts         # Server entry point
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # External API wrappers (Phase 3)
│   │   ├── jobs/            # Background jobs (Phase 4)
│   │   └── db/              # Database schema and client
│   └── test/                # Test files
├── infra/                   # Deployment configs (Phase 8)
├── .github/workflows/       # CI/CD (Phase 8)
└── README.md
```

## Database Schema

The application uses a PostgreSQL database hosted on Supabase with the following core tables:

- **companies** - Company/organization records
- **bank_accounts** - Linked bank accounts via Plaid
- **payroll_runs** - Payroll schedules from Check
- **balance_snapshots** - Historical balance data
- **risk_assessments** - Risk calculations and status
- **alerts** - Alert history and idempotency tracking

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Supabase account (for database)

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd warp-sentinel
   pnpm install
   ```
   This installs workspace packages and sets up Husky git hooks.
   If hooks are missing, run:
   ```bash
   pnpm prepare
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```
   The backend will automatically load `.env` from either the project root or
   the `backend` folder. Ensure your Supabase keys are defined and then verify
   the connection with:

   ```bash
   npm run verify-supabase --workspace=backend
   ```

3. **Database setup:**
   - Create a new Supabase project
   - Run the SQL schema from `backend/src/db/schema.sql`
   - Update `.env` with your Supabase credentials

### Demo Workflow

1. **Create Company** – POST `/api/companies` with name and EIN.
2. **Link Bank Account** – use Plaid sandbox credentials `user_good` / `pass_good`.
3. **Create Pay Schedule** – POST `/api/pay-schedule` to set biweekly runs.
4. **Run Payroll** – POST `/api/payroll/run` and monitor Slack alerts.

For a step-by-step guide, see [`README_SANDBOX_DEMO.md`](README_SANDBOX_DEMO.md).

### Development

**Backend development:**
```bash
# Start backend in watch mode
npm run dev:backend

# Run tests
npm run test --workspace=backend

# Type checking
npm run type-check --workspace=backend

# Linting
npm run lint --workspace=backend
```

**Full development:**
```bash
# Start both frontend and backend form root folder
npm run dev
```


## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `PLAID_CLIENT_ID` | Plaid client identifier | Phase 3 |
| `PLAID_SECRET` | Plaid secret key | Phase 3 |
| `CHECK_API_KEY` | Check API key | Phase 3 |
| `SLACK_BOT_TOKEN` | Slack bot token | Phase 3 |
| `SLACK_CHANNEL_ID` | Slack channel for alerts | Phase 3 |
| `NODE_ENV` | Environment (development/production) | ✅ |
| `PORT` | Server port (default: 3001) | ❌ |
| `API_SECRET` | Shared secret for demo auth | ✅ |

## License

See [LICENSE](LICENSE) file for details.

---

**Status**: Phases 1-2 complete. Ready for Phase 3 external API integrations.
