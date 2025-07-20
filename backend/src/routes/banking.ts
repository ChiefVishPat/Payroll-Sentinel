// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { supabase } from '@backend/db/client';
import { PlaidService } from '@backend/services/plaid';

// Simple in-memory store for access tokens (for demo purposes)
const accessTokens = new Map<string, string>();

/**
 * Banking routes for Plaid integration
 * Handles link token creation and public token exchange for bank account linking
 * @param fastify - Fastify instance
 */
async function bankingRoutes(fastify: FastifyInstance) {
  // Guard at top of file - don't throw, just warn and skip mounting
  const { PLAID_CLIENT_ID, PLAID_SECRET } = process.env;
  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    fastify.log.warn('PLAID_* env vars missing – banking routes disabled');
    return; // skip mounting; server keeps running
  }

  // Initialize Plaid service wrapper
  const plaidService = new PlaidService({
    clientId: PLAID_CLIENT_ID,
    secret: PLAID_SECRET,
    environment:
      (process.env.PLAID_ENV as 'sandbox' | 'production') || 'sandbox',
  });

  /**
   * Create link token for Plaid Link initialization
   * @route POST /api/banking/link-token
   * @param req.body.userId - User ID for link token (defaults to 'demo-user')
   * @returns {Object} Link token and expiration for frontend integration
   */
  fastify.post('/banking/link-token', async (req, reply) => {
    const { userId = 'demo-user', companyId } = req.body as {
      userId?: string;
      companyId: string;
    };
    fastify.log.info(`Plaid: creating link_token for user ${userId}`);
    const res = await plaidService.createLinkToken(userId, 'Payroll Demo');
    if (!res.success || !res.data) {
      fastify.log.error('Plaid: link_token creation failed:', res.error);
      return reply
        .status(500)
        .send({ success: false, error: res.error?.message });
    }
    fastify.log.info(`Plaid: link_token created (${res.data.requestId})`);
    return reply.send({
      success: true,
      linkToken: res.data.linkToken,
      expiration: res.data.expiration,
    });
  });

  /**
   * Exchange public token for access token after successful Plaid Link flow
   * @route POST /api/banking/exchange-token
   * @param req.body.publicToken - Public token received from Plaid Link
   * @returns {Object} Success status and item ID
   */
  fastify.post('/banking/exchange-token', async (req, reply) => {
    const { publicToken, companyId } = req.body as {
      publicToken: string;
      companyId: string;
    };
    fastify.log.info('Plaid: exchanging public_token');
    const ex = await plaidService.exchangePublicToken(publicToken);
    if (!ex.success || !ex.data) {
      fastify.log.error('Plaid: public_token exchange failed:', ex.error);
      return reply
        .status(500)
        .send({ success: false, error: ex.error?.message });
    }
    const { accessToken, itemId } = ex.data;
    // Fetch account metadata and persist to DB
    const acctRes = await plaidService.getAccounts(accessToken);
    if (!acctRes.success || !acctRes.data) {
      fastify.log.error('Plaid: getAccounts failed:', acctRes.error);
      return reply
        .status(500)
        .send({ success: false, error: acctRes.error?.message });
    }
    for (const acct of acctRes.data) {
      try {
        await supabase.from('bank_accounts').insert([
          {
            company_id: companyId,
            plaid_account_id: acct.accountId,
            plaid_access_token: accessToken,
            account_name: acct.name,
            account_type: acct.type,
            account_subtype: acct.subtype,
            institution_name: acct.institutionName || null,
          },
        ]);
      } catch (dbError) {
        fastify.log.warn(
          'Failed to save to database, continuing with in-memory storage',
          dbError
        );
      }
    }
    fastify.log.info(`Plaid: access_token stored for item ${itemId}`);
    accessTokens.set(itemId, accessToken);
    return reply.send({ success: true, itemId });
  });

  // Also handle the /banking/exchange route for backward compatibility
  fastify.post('/banking/exchange', async (req, reply) => {
    const { publicToken, companyId } = req.body as {
      publicToken: string;
      companyId: string;
    };
    fastify.log.info('Plaid: exchanging public_token (legacy endpoint)');
    const ex = await plaidService.exchangePublicToken(publicToken);
    if (!ex.success || !ex.data) {
      fastify.log.error('Plaid: public_token exchange failed:', ex.error);
      return reply
        .status(500)
        .send({ success: false, error: ex.error?.message });
    }
    const { accessToken, itemId } = ex.data;
    // Fetch account metadata and persist to DB
    const acctRes = await plaidService.getAccounts(accessToken);
    if (!acctRes.success || !acctRes.data) {
      fastify.log.error('Plaid: getAccounts failed:', acctRes.error);
      return reply
        .status(500)
        .send({ success: false, error: acctRes.error?.message });
    }
    for (const acct of acctRes.data) {
      try {
        await supabase.from('bank_accounts').insert([
          {
            company_id: companyId,
            plaid_account_id: acct.accountId,
            plaid_access_token: accessToken,
            account_name: acct.name,
            account_type: acct.type,
            account_subtype: acct.subtype,
            institution_name: acct.institutionName || null,
          },
        ]);
      } catch (dbError) {
        fastify.log.warn(
          'Failed to save to database, continuing with in-memory storage',
          dbError
        );
      }
    }
    fastify.log.info(`Plaid: access_token stored for item ${itemId}`);
    accessTokens.set(itemId, accessToken);
    return reply.send({ success: true, itemId, accessToken });
  });

  /**
   * Simulate a sandbox transaction (deposit or withdrawal)
   * @route POST /api/banking/simulate
   */
  fastify.post('/banking/simulate', async (req, reply) => {
    const { accessToken, amount, date, name } = req.body as any;
    fastify.log.info('Plaid: simulating transaction');
    const res = await plaidService.simulateTransaction(
      accessToken,
      amount,
      date,
      name
    );
    if (!res.success) {
      fastify.log.error('Plaid: sandbox simulation failed:', res.error);
      return reply
        .status(500)
        .send({ success: false, error: res.error?.message });
    }
    fastify.log.info('Plaid: sandbox transaction fired');
    return reply.send({ success: true });
  });

  /**
   * Deposit funds into a sandbox account
   * Looks up the Plaid access token by accountId and companyId
   * @route POST /api/banking/deposit
   * @param req.body.companyId - Company identifier
   * @param req.body.accountId - Plaid account ID to deposit into
   * @param req.body.amount - Amount in USD to deposit
   */
  fastify.post('/banking/deposit', async (req, reply) => {
    const { companyId, accountId, amount, name, date } = req.body as {
      companyId: string;
      accountId: string;
      amount: number;
      name: string;
      date: string;
    };

    const { data, error } = await supabase
      .from('bank_accounts')
      .select('plaid_access_token')
      .eq('company_id', companyId)
      .eq('plaid_account_id', accountId)
      .maybeSingle();
    if (error || !data) {
      fastify.log.error('Supabase: account lookup failed', error);
      return reply.status(404).send({ success: false, error: 'Account not found' });
    }

    const res = await plaidService.simulateTransaction(
      data.plaid_access_token,
      amount,
      date,
      name,
      'credit'
    );

    if (!res.success || !res.data) {
      fastify.log.error('Plaid: deposit simulation failed:', res.error);
      return reply.status(500).send({ success: false, error: res.error?.message });
    }

    return reply.send({ success: true, requestId: res.data });
  });

  /**
   * Get linked bank accounts with real-time balances
   * @route GET /api/banking/accounts
   */
  fastify.get('/banking/accounts', async (req, reply) => {
    const { companyId } = req.query as any;
    const { data, error } = await supabase
      .from('bank_accounts')
      .select(
        'plaid_account_id, plaid_access_token, account_name, account_type, account_subtype, institution_name, updated_at'
      )
      .eq('company_id', companyId);
    if (error) {
      fastify.log.error('Supabase: failed to fetch accounts', error);
      return reply.status(500).send({ success: false, error: error.message });
    }

    const accounts = [] as any[];
    for (const row of data) {
      const balRes = await plaidService.getAccountBalance(
        row.plaid_access_token,
        row.plaid_account_id
      );
      if (!balRes.success || !balRes.data) continue;

      accounts.push({
        id: row.plaid_account_id,
        name: row.account_name,
        type: row.account_type,
        subtype: row.account_subtype,
        institutionName: row.institution_name,
        balance: balRes.data.current,
        availableBalance:
          balRes.data.available !== null
            ? balRes.data.available
            : balRes.data.current,
        lastUpdated: balRes.data.lastUpdated,
      });
    }

    return reply.send({ success: true, accounts });
  });

  /**
   * Get connection status for a company
   * @route GET /api/banking/status
   */
  fastify.get('/banking/status', async (req, reply) => {
    const { companyId } = req.query as any;
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('updated_at')
      .eq('company_id', companyId);
    if (error) {
      fastify.log.error('Supabase: failed to fetch accounts', error);
      return reply.status(500).send({ success: false, error: error.message });
    }
    return reply.send({
      success: true,
      connected: data.length > 0,
      lastSync: data[0]?.updated_at || null,
      accountCount: data.length,
      status: data.length > 0 ? 'healthy' : 'missing',
    });
  });

  /**
   * Trigger refresh of Plaid data
   * @route POST /api/banking/refresh
   */
  fastify.post('/banking/refresh', async (req, reply) => {
    const { companyId } = req.body as any;
    const { data: accounts, error } = await supabase
      .from('bank_accounts')
      .select('plaid_access_token')
      .eq('company_id', companyId);
    if (error) {
      fastify.log.error('Supabase: failed to fetch accounts', error);
      return reply.status(500).send({ success: false, error: error.message });
    }
    const tokens = [...new Set(accounts.map(a => a.plaid_access_token))];
    for (const token of tokens) {
      await plaidService.getBalances(token);
    }
    return reply.send({ success: true });
  });

  /**
   * Get current account balances for a company
   * @route GET /api/banking/balances
   */
  fastify.get('/banking/balances', async (req, reply) => {
    const { companyId } = req.query as any;
    const { data: accounts, error } = await supabase
      .from('bank_accounts')
      .select('plaid_access_token, plaid_account_id')
      .eq('company_id', companyId);
    if (error) {
      fastify.log.error('Supabase: failed to fetch accounts', error);
      return reply.status(500).send({ success: false, error: error.message });
    }
    const balances = [] as any[];
    const tokens = [...new Set(accounts.map(a => a.plaid_access_token))];
    for (const token of tokens) {
      const res = await plaidService.getBalances(token);
      if (res.success && res.data) {
        balances.push(
          ...res.data.filter(b =>
            accounts.some(a => a.plaid_account_id === b.accountId)
          )
        );
      }
    }
    return reply.send({ success: true, balances });
  });

  /**
   * Get transactions for a company
   * @route GET /api/banking/transactions
   */
  fastify.get('/banking/transactions', async (req, reply) => {
    const { companyId, startDate, endDate } = req.query as any;
    const { data: accounts, error } = await supabase
      .from('bank_accounts')
      .select('plaid_access_token, plaid_account_id')
      .eq('company_id', companyId);
    if (error) {
      fastify.log.error('Supabase: failed to fetch accounts', error);
      return reply.status(500).send({ success: false, error: error.message });
    }
    const transactions = [] as any[];
    const tokens = [...new Set(accounts.map(a => a.plaid_access_token))];
    for (const token of tokens) {
      const res = await plaidService.getTransactions(
        token,
        startDate ||
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
        endDate || new Date().toISOString().slice(0, 10)
      );
      if (res.success && res.data) {
        transactions.push(
          ...res.data.filter(t =>
            accounts.some(a => a.plaid_account_id === t.account_id)
          )
        );
      }
    }
    return reply.send({ success: true, transactions });
  });
}

export default bankingRoutes;
// @ts-nocheck
