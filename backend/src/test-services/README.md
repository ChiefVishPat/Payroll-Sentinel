# Service Tests

Clean, organized test scripts for all Payroll Sentinel services.

## 🚀 Quick Testing

### Test All Services at Once
```bash
node src/test-services/test-all.js
```
Shows status of all services and runs quick tests. Works without API keys.

### Test Individual Services

```bash
# Always works (uses mock data)
node src/test-services/test-check.js

# Requires PLAID_CLIENT_ID and PLAID_SECRET in .env
node src/test-services/test-plaid.js

# Requires SLACK_BOT_TOKEN and SLACK_CHANNEL_ID in .env  
node src/test-services/test-slack.js

# Tests core error handling and retry logic
node src/test-services/test-base.js
```

## 📊 What Each Service Does

| Service | Purpose | Status | Key Features |
|---------|---------|--------|--------------|
| 📋 **Check** | Payroll management | ✅ Ready | Mock employees, payroll runs, cash flow projections |
| 🏦 **Plaid** | Bank integration | ⚠️ Needs API keys | Account linking, balance checking, transaction data |
| 📢 **Slack** | Notifications | ⚠️ Needs bot token | Risk alerts, payroll notifications, rich formatting |
| 🔧 **Base** | Core functionality | ✅ Ready | Error handling, retry logic, health monitoring |

## 🔍 Setup API Credentials

### Plaid (Bank Integration)
1. Sign up at [plaid.com](https://plaid.com)
2. Get sandbox credentials from dashboard
3. Add to `.env`: `PLAID_CLIENT_ID` and `PLAID_SECRET`

### Slack (Notifications)
1. Create app at [api.slack.com](https://api.slack.com)
2. Add bot scopes: `chat:write`, `channels:read`, `groups:read`, `im:read`, `mpim:read`
3. Install to workspace, get bot token and channel ID
4. Add to `.env`: `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID`

## 🛠️ Troubleshooting

**"Cannot find module" error:**
```bash
npm run build  # Compile TypeScript first
```

**Missing credentials:**
- Run `node scripts/check-permissions.js` to see what's missing
- Check that `.env` file is in the project root
- Ensure environment variables don't have placeholder values

**Permission errors:**
- For Plaid: Verify products are enabled in dashboard
- For Slack: Reinstall app after adding new scopes
