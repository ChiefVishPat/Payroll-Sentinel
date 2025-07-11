# Local Plaid Demo

## Setup Instructions

1. **Backend Environment Setup**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Then fill in your Plaid Sandbox credentials:
   - `PLAID_CLIENT_ID`: Your Plaid sandbox client ID
   - `PLAID_SECRET`: Your Plaid sandbox secret key

2. **Frontend Environment Setup**
   ```bash
   cp frontend/.env.local.example frontend/.env.local
   ```

3. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Watch for log messages indicating the Plaid service is ready.

4. **Start Frontend Server**
   ```bash
   cd frontend
   npm run dev
   ```
   Open http://localhost:3000 in your browser.

5. **Test the Flow**
   - Click "Connect Bank Account" in the app
   - Use Plaid's sandbox credentials:
     - Username: `user_good`
     - Password: `pass_good`
   - Follow the Plaid Link flow
   - Watch the browser console and server logs for detailed step-by-step logging

## Expected Log Output

**Backend logs:**
```
Plaid: creating link_token for user demo-user
Plaid: link_token created (request-id-123)
Plaid: exchanging public_token
Plaid: access_token stored for item item-id-456
```

**Frontend logs:**
```
Requesting link_token…
[API] POST /api/banking/link-token → 200
Link success – received public_token public-token-xyz
Exchanging public_token…
[API] POST /api/banking/exchange-token → 200
access_token stored – fetching accounts next
```

## Troubleshooting

- If you see "PLAID_* env vars missing", ensure your environment variables are set correctly
- If Plaid Link fails to load, check your internet connection and browser console
- For sandbox testing, always use the credentials: `user_good` / `pass_good`
