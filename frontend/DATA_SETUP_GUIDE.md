# Data Setup Guide for Payroll Sentinel

This guide explains how to upload and manage data in your Payroll Sentinel dashboard.

## 🚀 Quick Start

1. **Navigate to Data Management**: Go to `/data` in your dashboard
2. **Choose your approach**: Connect real accounts, upload data, or generate mock data
3. **Follow the step-by-step process** for your chosen method

## 🏦 Connecting Bank Accounts (Plaid)

### Prerequisites
- Business bank account with online banking
- Admin access to your bank account
- Valid business credentials

### Steps
1. Go to **Data Management** → **Connect Accounts** tab
2. Click **"Connect Bank Account"** under Production Connection
3. Follow the Plaid Link flow:
   - Select your bank from the list
   - Enter your online banking credentials
   - Select accounts to connect
   - Verify micro-deposits (if required)

### What Gets Connected
- ✅ Account balances (checking, savings, credit)
- ✅ Transaction history (last 24 months)
- ✅ Account metadata (names, types, numbers)
- ✅ Real-time balance updates

### Supported Banks
- Chase, Bank of America, Wells Fargo, Citi
- 11,000+ financial institutions via Plaid
- Business and personal accounts
- Credit cards and lines of credit

## 👥 Uploading Employee Data

### Manual Entry
1. Go to **Data Management** → **Upload Data** tab
2. Click **"Load Sample Data"** to see the format
3. Fill in employee information:
   - **Name** (required)
   - **Email** (required) 
   - **Position** (required)
   - **Department** (required)
   - **Annual Salary** (required)
   - **Start Date** (optional)
   - **Status** (active/inactive)

### CSV Upload
1. Download the **employee template CSV**
2. Fill in your employee data
3. Upload the completed CSV file

### CSV Format
```csv
Name,Email,Position,Department,Salary,Start Date,Status
John Doe,john@company.com,Software Engineer,Engineering,85000,2024-01-15,active
Jane Smith,jane@company.com,Product Manager,Product,95000,2024-02-01,active
```

## 💰 Setting Up Payroll Data

### Historical Payroll Runs
1. Go to **Upload Data** → **Payroll Data**
2. Click **"Load Sample Data"** for examples
3. Enter payroll run details:
   - **Pay Period Start/End** (required)
   - **Pay Date** (required)
   - **Total Amount** (required)
   - **Employee Count** (optional)
   - **Status** (draft/pending/processed)

### Recurring Payroll Setup
- Enter past 6 months of payroll history
- Include both regular and bonus payments
- Set up upcoming scheduled payrolls

## 📊 Mock Data Generation

### For Testing & Demos
1. Go to **Data Management** → **Generate Mock Data**
2. Click **"Generate Mock Data"**
3. Wait for data generation (2-3 seconds)

### What Gets Generated
- 🏢 **12 employees** across 4 departments
- 💵 **6 months** of payroll history
- 🏦 **3 bank accounts** with balances
- 📈 **150+ transactions** with categories

## 📁 Bulk Data Upload

### CSV File Upload
1. Go to **Upload Data** → **Bulk Data Upload**
2. Choose your file type:
   - **Transaction History CSV**
   - **Employee Directory CSV**

### File Requirements
- **Format**: CSV files only
- **Size**: Maximum 10MB
- **Headers**: Must match template format
- **Encoding**: UTF-8 recommended

## 🔗 Accounting Software Integration

### QuickBooks Connection
1. Go to **Connect Accounts** → **Accounting Integration**
2. Click **"Connect QuickBooks"**
3. Authorize access to your QuickBooks account
4. Select data to sync:
   - Chart of accounts
   - Employee records
   - Payroll runs
   - Expense categories

### Other Supported Platforms
- **Xero**: Connect for international accounting
- **NetSuite**: Enterprise-level integration
- **Custom APIs**: Contact support for other systems

## 📋 Data Status Monitoring

### Check Connection Status
1. Go to **Data Management** → **Data Status**
2. Review connection health:
   - ✅ **Bank Accounts**: Connected/Disconnected
   - ✅ **Employee Data**: Loaded/Missing
   - ✅ **Payroll History**: Available/Pending
   - ✅ **Accounting Software**: Connected/Pending

### Troubleshooting
- **Bank Connection Failed**: Check credentials, re-authorize
- **Data Not Syncing**: Verify account permissions
- **Missing Transactions**: Check date ranges and filters

## 🛡️ Security & Privacy

### Data Protection
- 🔒 **Bank-level encryption** for all financial data
- 👁️ **Read-only access** to connected accounts
- 🚫 **No stored credentials** (tokens only)
- 🔐 **SOC 2 compliant** infrastructure

### What We Access
- ✅ Account balances and transaction history
- ✅ Account names and types
- ❌ Online banking passwords
- ❌ Credit card numbers or PINs

## 📞 Getting Help

### Demo Mode
If you're just testing, use the **"Generate Mock Data"** option for instant setup with realistic sample data.

### Production Setup
For real business data:
1. Start with bank account connection
2. Upload employee information
3. Add historical payroll data
4. Configure accounting integration

### Support
- 📧 Contact support for custom integrations
- 📚 Check documentation for API details
- 🎯 Use mock data for initial testing

---

## Next Steps

Once your data is uploaded:
1. 📊 **View Dashboard** - See your financial overview
2. ⚠️ **Check Risk Analysis** - Review financial risks
3. 💹 **Monitor Cash Flow** - Track projections
4. 👥 **Manage Payroll** - Process upcoming payrolls
5. ⚙️ **Configure Settings** - Set up alerts and thresholds

Your data will be automatically used across all dashboard features for accurate risk assessment and cash flow forecasting!
