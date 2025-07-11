# Payroll Sentinel - Sandbox Demo

This is a complete sandbox demo showing how to:
1. Create a company
2. Link a bank account via Plaid
3. Schedule payroll via CheckHQ
4. Run payroll and watch balance updates

## 🚀 Quick Start (5 Steps)

### 1. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Setup

#### Backend (.env)
```bash
# Copy the example file
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
# Plaid Configuration (Sandbox)
PLAID_ENV=sandbox
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret

# CheckHQ Configuration (Sandbox)
CHECK_API_KEY=your-check-api-key

# API Security
API_SECRET=dev-demo-secret

# Database (Supabase)
DATABASE_URL=your-supabase-url
```

#### Frontend (.env.local)
```bash
# Copy the example file
cp frontend/.env.local.example frontend/.env.local
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_SECRET=dev-demo-secret
```

### 3. Start Backend Server
```bash
cd backend
npm run demo
```

Backend will run on: http://localhost:3001

### 4. Start Frontend Server
```bash
cd frontend
npm run dev
```

Frontend will run on: http://localhost:3000

### 5. Access Demo
Navigate to: http://localhost:3000/demo/onboarding

## 🎯 Demo Flow

### Step 1: Create Company
- Enter company name, EIN, and state
- Company gets created in CheckHQ sandbox

### Step 2: Link Bank Account
- **Username**: `user_good`
- **Password**: `pass_good`
- **Institution**: Use "First Platypus Bank" (`ins_109508`)
- Account gets linked via Plaid sandbox

### Step 3: Create Pay Schedule
- Sets up biweekly payroll schedule
- Uses CheckHQ sandbox API

### Step 4: Run Payroll & Monitor
- "Simulate Deposit $5,000" - adds money to account
- "Run Payroll" - processes payroll via CheckHQ
- "Refresh Balances" - shows updated account balances

## 📋 API Endpoints

### Company Management
- `POST /api/companies` - Create company

### Banking (Plaid Integration)
- `POST /api/banking/link-token` - Get Plaid Link token
- `POST /api/banking/exchange` - Exchange public token for access token
- `POST /api/banking/simulate` - Simulate sandbox transactions
- `GET /api/banking/balances` - Get account balances

### Payroll (CheckHQ Integration)
- `POST /api/pay-schedule` - Create payroll schedule
- `POST /api/payroll/run` - Run payroll

## 🔧 Technical Details

### Backend Stack
- **Framework**: Fastify (TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Logging**: Pino Pretty (colored output)
- **Services**: PlaidService, CheckService

### Frontend Stack
- **Framework**: Next.js 14 (TypeScript)
- **Styling**: Tailwind CSS
- **Plaid Integration**: react-plaid-link
- **HTTP Client**: Axios with interceptors

### Sandbox Configuration
- **Plaid**: Uses sandbox environment with test credentials
- **CheckHQ**: Uses sandbox API endpoints
- **Database**: Development instance (no production data)

## 🔍 Monitoring & Logs

### Backend Logs
- Request/response logging with pino-pretty
- Color-coded by service (Plaid, Check, etc.)
- Includes request ID tracking

### Frontend Logs
- Axios interceptor logs all API calls
- PlaidLink component logging
- Console logs for debugging

## 🛠️ Development

### File Structure
```
backend/
├── src/
│   ├── routes/
│   │   ├── company.ts      # Company creation
│   │   ├── banking.ts      # Plaid integration
│   │   └── payroll.ts      # CheckHQ integration
│   └── services/
│       ├── plaid.ts        # Plaid API wrapper
│       └── check.ts        # CheckHQ API wrapper

frontend/
├── src/
│   ├── components/
│   │   └── OnboardingFlow.tsx  # Main demo component
│   └── app/demo/onboarding/
│       └── page.tsx            # Demo page

shared/
└── types.ts                    # Shared TypeScript types
```

### Adding New Features
1. Update shared types in `shared/types.ts`
2. Add backend routes in `backend/src/routes/`
3. Update frontend components as needed
4. Test the full flow in the demo

## 📝 Notes

- This is a **sandbox demo** - no real money or production data
- All API keys should be sandbox/test versions
- The demo uses mock data for employees and payroll calculations
- Database operations are simulated for demonstration purposes

## 🔒 Security

- API secret validation on all endpoints
- CORS configured for localhost development
- Rate limiting enabled
- Input validation on all routes

## 🐛 Troubleshooting

### Common Issues
1. **Plaid Link fails**: Check PLAID_CLIENT_ID and PLAID_SECRET
2. **API errors**: Verify API_SECRET matches between frontend/backend
3. **Database issues**: Ensure Supabase URL is correct
4. **Port conflicts**: Backend uses 3001, frontend uses 3000

### Debug Mode
Set `LOG_LEVEL=debug` in backend/.env for verbose logging.

## 🎉 Success!

If everything is working, you should see:
- Company creation succeeds
- Plaid Link opens and connects successfully
- Pay schedule gets created
- Payroll runs and balances update

The demo showcases a complete payroll flow using only sandbox APIs!

## 🧪 Testing the Demo

### Quick Test
1. Start backend: `cd backend && npm run demo`
2. Start frontend: `cd frontend && npm run dev`
3. Visit: http://localhost:3000/demo/onboarding
4. Follow the 4-step process

### Expected Behavior
- **Step 1**: Company creation should succeed with any valid inputs
- **Step 2**: Plaid Link should open with sandbox credentials
- **Step 3**: Pay schedule creation should be instant
- **Step 4**: Balance simulation and payroll run should work

### Debugging
- Check browser console for frontend logs
- Check terminal for backend logs with pino-pretty formatting
- All API calls are logged with colored output

## 📦 Demo Components

### Backend (`backend/src/demo-server.ts`)
- Standalone Fastify server
- All required API endpoints
- Integrated PlaidService and CheckService
- Colored logging with pino-pretty

### Frontend (`frontend/src/components/OnboardingFlow.tsx`)
- Complete stepper UI
- Plaid Link integration
- Error handling and loading states
- Console logging for debugging

### Services Used
- **PlaidService**: Handles bank account linking (sandbox)
- **CheckService**: Handles payroll operations (mock)
- **Axios**: HTTP client with request/response logging
