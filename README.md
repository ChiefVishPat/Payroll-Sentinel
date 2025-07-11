# Warp Sentinel

A slim, always-on watchdog that monitors cash flow against payroll requirements to prevent NSF failures.

## Project Overview

Warp Sentinel links a startup's funding account (via Plaid) to its next scheduled payroll run (via Check) and warns stakeholders via Slack whenever projected cash is less than the required float (payroll cost × 1.10).

### Why It Matters

Failed payroll ACH pulls lead to:
- Angry employees
- State penalties  
- Hours of founder fire-drills

Warp Sentinel prevents these issues by providing early warnings before cash flow problems impact payroll.

## Development Phases

### ✅ Phase 1: Project Setup & Foundation (COMPLETED)
- ✅ Project structure with workspace configuration
- ✅ TypeScript configuration with strict settings
- ✅ ESLint and Prettier setup
- ✅ Environment configuration with `.env.example`
- ✅ Test setup with Vitest and 100% coverage requirements

### ✅ Phase 2: Backend Core & Database (COMPLETED)
- ✅ Fastify server with TypeScript
- ✅ Supabase database schema and types
- ✅ Health check endpoints
- ✅ Companies CRUD API with Swagger documentation
- ✅ Error handling and logging
- ✅ Authentication middleware (demo-level)

### 🔄 Phase 3: External API Integrations (NEXT)
- Plaid service wrapper for bank account monitoring
- Check service wrapper for payroll data
- Slack notification service

### 📋 Phase 4: Core Business Logic (UPCOMING)
- Risk calculation engine
- Polling job implementation  
- Alert system with idempotency

### 📋 Phase 5: Frontend Foundation (UPCOMING)
- React app with TypeScript and Tailwind
- API client setup
- Basic routing and layout

### 📋 Phase 6: Dashboard & UI (UPCOMING)
- Balance monitoring dashboard
- Charts with Recharts
- Real-time updates via Supabase

### 📋 Phase 7: Integration & Testing (UPCOMING)
- End-to-end testing
- Error handling
- Performance optimization

### 📋 Phase 8: Deployment & CI/CD (UPCOMING)
- Fly.io deployment setup
- GitHub Actions CI/CD
- Documentation

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
   npm install
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

**Full development (when frontend is ready):**
```bash
# Start both frontend and backend
npm run dev
```

### API Documentation

When the backend is running, visit `http://localhost:3001/docs` for the Swagger API documentation.

### Available Endpoints

- `GET /health` - Basic health check
- `GET /health/db` - Database connectivity check  
- `GET /health/ready` - Readiness probe
- `GET /api/companies` - List all companies
- `POST /api/companies` - Create new company
- `GET /api/companies/:id` - Get company by ID
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

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

## Testing

The project maintains 100% test coverage requirements:

```bash
# Run tests with coverage
npm run test:coverage --workspace=backend

# Watch mode for development
npm run test --workspace=backend
```

## Code Quality

- **TypeScript**: Strict mode with `strictNullChecks=true`
- **ESLint**: Zero warnings policy (`--max-warnings 0`)
- **Prettier**: Consistent code formatting
- **Vitest**: Fast, modern testing framework

## Contributing

1. Make small, focused commits with conventional commit messages (`feat:`, `fix:`, etc.)
2. Ensure all tests pass and coverage remains at 100%
3. Follow the existing code style and TypeScript patterns
4. Update documentation for any new features

## License

See [LICENSE](LICENSE) file for details.

---

**Status**: Phases 1-2 complete. Ready for Phase 3 external API integrations.
