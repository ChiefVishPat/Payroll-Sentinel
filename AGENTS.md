# Payroll Sentinel — Project Agent Guide

A concise, always‑loaded reference for AI coding agents (and humans) working in this repository. It defines the project’s purpose, layout, environment requirements, workflows, and conventions so that every tool—from OpenAI Codex to VS Code chat—starts with the same ground truth.

---

\## 1 Project overview
Payroll Sentinel (aka **Warp Sentinel**) is a real‑time watchdog that keeps founders from missing payroll. It links a company’s **bank data** (via Plaid sandbox) to its **pay‑schedule** (mocked CheckHQ) and posts Slack alerts whenever the projected balance falls below the next run plus a safety margin.

---

\## 2 Repository map

|  Path                      |  Purpose                                               |
| -------------------------- | ------------------------------------------------------ |
|  **backend/**              | Fastify API, cron jobs, and service wrappers           |
|  backend/src/routes/       | Route modules (`banking.ts`, `payroll.ts`, etc.)       |
|  backend/src/services/     |  `PlaidService`, `SlackService`, mocked `CheckService` |
|  backend/src/jobs/         | Polling jobs & risk engine                             |
|  **frontend/**             | Next.js (React + Tailwind) app                         |
|  frontend/src/components/  | Re‑usable UI widgets                                   |
|  frontend/src/pages/       | Pages such as `/dashboard`, `/demo/onboarding`         |
|  frontend/src/lib/         | Axios API client & helpers                             |
|  **shared/types.ts**       | DTOs shared by front‑ and back‑end                     |
|  **docs/**                 | ADRs, architecture diagrams                            |
|  **scripts/**              | Local CLIs & migration helpers                         |

---

\## 3 Developer commands

```bash
# clone & bootstrap
pnpm install

# start apps
pnpm --filter backend dev     # http://localhost:3001
pnpm --filter frontend dev    # http://localhost:3000

# lint & test
pnpm lint
pnpm test --coverage
```

---

\## 4 Environment variables
\### Back‑end `.env`

```
PORT=3001

# Plaid (sandbox)
PLAID_ENV=sandbox
PLAID_CLIENT_ID=your_sandbox_id
PLAID_SECRET=your_sandbox_secret

# Supabase local stack
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key

# Slack alerts
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_CHANNEL_ID=C12345678

# Minimal shared secret for dev‑only auth
API_SECRET=dev-demo-secret
```

\### Front‑end `.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_SECRET=dev-demo-secret
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
```

---

\## 5 Happy‑path sandbox flow

1. **Create company**  → POST `/api/companies` • returns `companyId` (mocked Check)
2. **Link bank**        → POST `/api/banking/link-token` → browser opens Plaid Link → POST `/api/banking/exchange-token` • stores `access_token`
3. **Create pay schedule** → POST `/api/pay-schedule` • returns `payScheduleId`
4. **Run payroll**       → POST `/api/payroll/run` with `companyId` & `payScheduleId`
5. **Monitor**           → background jobs poll balances & risk engine posts Slack alerts

**Sandbox credentials**

* Plaid: `user_good` / `pass_good` (institution `ins_109508`).
* CheckHQ calls are **fully mocked**; no external key required.

---

\## 6 Coding conventions

* **TypeScript**: `tsconfig.json` has `"strict": false` to keep onboarding friction‑free. Public APIs and exported helpers should still be typed.
* **Logging**: use `fastify.log.{info|error|debug}` (powered by pino‑pretty). On the front‑end prefer `console.debug()` and the Axios response interceptor.
* **Documentation**: every exported function includes JSDoc; complex logic gets inline comments.
* **Lint / format**: ESLint + Prettier. Run `pnpm lint` before committing.
* **Naming**: kebab‑case for route files, PascalCase for React components.
* **Error handling**: services throw `ApiError`; routes translate to correct HTTP codes.

---

\## 7 Testing

* Vitest for both back‑ and front‑end.
* Coverage must stay **≥ 80 %** (`pnpm test --coverage`).
* External calls (Plaid, Check) mocked via Nock.

---

\## 8 Do & Don’t checklist
**Do**

* Use Plaid sandbox keys and `user_good` creds.
* Keep secrets in `.env`; never commit them.
* Comment tricky code and new API flows.

**Don’t**

* Hit CheckHQ production endpoints.
* Push lock‑file conflicts or `.env` files.
* Rely on undeclared peer dependencies; pnpm will fail install.

---

\## 9 Development phases (roadmap)
1 Project setup · 2 Backend core · 3 API integrations · 4 Risk engine · 5 Frontend foundation · 6 Dashboard UI · 7 Tests & optimisation · 8 CI/CD & deployment (Fly.io).

> **Maintainers:** update this guide whenever you rename routes, add env vars, or change the happy‑path.
