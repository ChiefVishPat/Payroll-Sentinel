// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { supabase } from '@backend/db/client';
import { PlaidService } from '@backend/services/plaid';
import { handleRoute, resolveCompanyId } from '@backend/routes/helpers';
import type { BankAccount } from '@shared/types';

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
    environment: (process.env.PLAID_ENV as 'sandbox' | 'production') || 'sandbox',
  });
  
  /**
   * Create link token for Plaid Link initialization
   * @route POST /api/banking/link-token
   * @param req.body.userId - User ID for link token (defaults to 'demo-user')
   * @returns {Object} Link token and expiration for frontend integration
   */
  fastify.post('/banking/link-token', async (req, reply) => {
    const { userId = 'demo-user', companyId } = req.body as { userId?: string; companyId: string };
    void companyId; // Reserved for future DB association
    fastify.log.info(`Plaid: creating link_token for user ${userId}`);
    const res = await plaidService.createLinkToken(userId, 'Payroll Demo');
    if (!res.success || !res.data) {
      fastify.log.error('Plaid: link_token creation failed:', res.error);
      return reply.status(500).send({ success: false, error: res.error?.message });
    }
    fastify.log.info(`Plaid: link_token created (${res.data.requestId})`);
    return reply.send({ success: true, linkToken: res.data.linkToken, expiration: res.data.expiration });
  });
  
  /**
   * Exchange public token for access token after successful Plaid Link flow
   * @route POST /api/banking/exchange-token
   * @param req.body.publicToken - Public token received from Plaid Link
   * @returns {Object} Success status and item ID
   */
  fastify.post('/banking/exchange-token', async (req, reply) => {
    const { publicToken, companyId } = req.body as { publicToken: string; companyId: string };
    fastify.log.info('Plaid: exchanging public_token');
    const ex = await plaidService.exchangePublicToken(publicToken);
    if (!ex.success || !ex.data) {
      fastify.log.error('Plaid: public_token exchange failed:', ex.error);
      return reply.status(500).send({ success: false, error: ex.error?.message });
    }
    const { accessToken, itemId } = ex.data;
    // Fetch account metadata and persist to DB
    const acctRes = await plaidService.getAccounts(accessToken);
    if (!acctRes.success || !acctRes.data) {
      fastify.log.error('Plaid: getAccounts failed:', acctRes.error);
      return reply.status(500).send({ success: false, error: acctRes.error?.message });
    }
    for (const acct of acctRes.data) {
      try {
        await supabase.from('bank_accounts').insert([{ 
          company_id: companyId,
          plaid_account_id: acct.accountId,
          plaid_access_token: accessToken,
          account_name: acct.name,
          account_type: acct.type,
          account_subtype: acct.subtype,
          institution_name: acct.institutionName || null 
        }]);
      } catch (dbError) {
        fastify.log.warn('Failed to save to database, continuing with in-memory storage', dbError);
      }
    }
    fastify.log.info(`Plaid: access_token stored for item ${itemId}`);
    accessTokens.set(itemId, accessToken);
    return reply.send({ success: true, itemId });
  });
  
  // Also handle the /banking/exchange route for backward compatibility
  fastify.post('/banking/exchange', async (req, reply) => {
    const { publicToken, companyId } = req.body as { publicToken: string; companyId: string };
    fastify.log.info('Plaid: exchanging public_token (legacy endpoint)');
    const ex = await plaidService.exchangePublicToken(publicToken);
    if (!ex.success || !ex.data) {
      fastify.log.error('Plaid: public_token exchange failed:', ex.error);
      return reply.status(500).send({ success: false, error: ex.error?.message });
    }
    const { accessToken, itemId } = ex.data;
    // Fetch account metadata and persist to DB
    const acctRes = await plaidService.getAccounts(accessToken);
    if (!acctRes.success || !acctRes.data) {
      fastify.log.error('Plaid: getAccounts failed:', acctRes.error);
      return reply.status(500).send({ success: false, error: acctRes.error?.message });
    }
    for (const acct of acctRes.data) {
      try {
        await supabase.from('bank_accounts').insert([{ 
          company_id: companyId,
          plaid_account_id: acct.accountId,
          plaid_access_token: accessToken,
          account_name: acct.name,
          account_type: acct.type,
          account_subtype: acct.subtype,
          institution_name: acct.institutionName || null 
        }]);
      } catch (dbError) {
        fastify.log.warn('Failed to save to database, continuing with in-memory storage', dbError);
      }
    }
    fastify.log.info(`Plaid: access_token stored for item ${itemId}`);
    accessTokens.set(itemId, accessToken);
    return reply.send({ success: true, itemId, accessToken });
  });

  /**
   * Fetch active bank accounts for a company
   * @route GET /api/banking/accounts
   * @param request.query.companyId - Unique company identifier
   */
  fastify.get(
    '/banking/accounts',
    handleRoute(async (request, _reply) => {
      const query = request.query as any;
      const companyId = await resolveCompanyId(query.companyId);
      fastify.log.info(`Fetching bank accounts for company ${companyId}`);

      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (error) {
        fastify.log.error('Failed to fetch bank accounts:', error);
        throw error;
      }

      const accounts: BankAccount[] = (data || []).map((row: any) => ({
        id: row.id,
        company_id: row.company_id,
        plaid_account_id: row.plaid_account_id,
        account_name: row.account_name,
        account_type: row.account_type,
        account_subtype: row.account_subtype,
        institution_name: row.institution_name,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      return accounts;
    })
  );
  
  /**
   * Simulate a sandbox transaction (deposit or withdrawal)
   * @route POST /api/banking/simulate
   */
  fastify.post('/banking/simulate', async (req, reply) => {
    const { accessToken, amount, date, name } = req.body as any;
    fastify.log.info('Plaid: simulating transaction');
    const res = await plaidService.simulateTransaction(accessToken, amount, date, name);
    if (!res.success) {
      fastify.log.error('Plaid: sandbox simulation failed:', res.error);
      return reply.status(500).send({ success: false, error: res.error?.message });
    }
    fastify.log.info('Plaid: sandbox transaction fired');
    return reply.send({ success: true });
  });

  /**
   * Get current account balances
   * @route GET /api/banking/balances
   */
  fastify.get('/banking/balances', async (req, reply) => {
    const { itemId } = req.query as any;
    const accessToken = accessTokens.get(itemId);
    if (!accessToken) {
      return reply.status(400).send({ success: false, error: 'Unknown itemId' });
    }
    const res = await plaidService.getBalances(accessToken);
    if (!res.success || !res.data) {
      fastify.log.error('Plaid: get balances failed:', res.error);
      return reply.status(500).send({ success: false, error: res.error?.message });
    }
    return reply.send({ success: true, balances: res.data });
  });

  /**
   * Get transactions for all accounts of a company
   * @route GET /api/banking/transactions
   */
  fastify.get('/banking/transactions', async (req, reply) => {
    const { companyId, startDate, endDate } = req.query as any;

    try {
      const resolvedCompanyId = await resolveCompanyId(companyId);
      const { data: accounts, error } = await supabase
        .from('bank_accounts')
        .select('plaid_access_token')
        .eq('company_id', resolvedCompanyId)
        .eq('is_active', true);

      if (error) {
        fastify.log.error('Failed to fetch access tokens:', error);
        return reply.status(500).send({ success: false, error: error.message });
      }

      const tokens = (accounts || []).map(a => a.plaid_access_token);
      const transactions: any[] = [];

      for (const token of tokens) {
        const res = await plaidService.getTransactions(token, startDate, endDate);
        if (!res.success || !res.data) {
          fastify.log.error('Plaid: get transactions failed:', res.error);
          continue;
        }
        transactions.push(...res.data);
      }

      return reply.send({ success: true, transactions });
    } catch (err) {
      fastify.log.error('Error fetching transactions:', err);
      return reply.status(500).send({ success: false, error: 'Failed to fetch transactions' });
    }
  });
  
}

export default bankingRoutes;
// @ts-nocheck
