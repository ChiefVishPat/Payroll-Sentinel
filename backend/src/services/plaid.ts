/**
 * Plaid Service
 * 
 * Handles all Plaid API interactions for bank account monitoring, balance tracking,
 * and transaction history. Uses sandbox environment for development and testing.
 */

import { PlaidApi, Configuration, PlaidEnvironments } from 'plaid';
import { BaseService, ServiceResponse, ServiceConfig } from './base';

// Plaid-specific types and interfaces
export interface PlaidConfig extends ServiceConfig {
  clientId: string;
  secret: string;
  environment: 'sandbox' | 'production';
}

/**
 * Account information returned by Plaid
 */
export interface PlaidAccount {
  accountId: string;
  name: string;
  type: string;
  subtype: string | null;
  institutionName?: string | undefined;
  mask?: string | undefined;
}

/**
 * Account balance information
 */
export interface AccountBalance {
  accountId: string;
  current: number;
  available: number | null;
  currencyCode: string;
  lastUpdated: string;
}

/**
 * Bank institution information
 */
export interface Institution {
  institutionId: string;
  name: string;
  products: string[];
  countryCodes: string[];
}

/**
 * Link token creation response
 */
export interface LinkTokenResponse {
  linkToken: string;
  expiration: string;
  requestId: string;
}

/**
 * Access token exchange response
 */
export interface AccessTokenResponse {
  accessToken: string;
  itemId: string;
  requestId: string;
}

/**
 * Plaid service class implementing bank account monitoring functionality
 */
export class PlaidService extends BaseService {
  private client: PlaidApi;
  private readonly plaidConfig: PlaidConfig;

  constructor(config: PlaidConfig) {
    super('plaid', config);
    this.plaidConfig = config;
    
    // Validate required Plaid configuration
    this.validateConfig(['clientId', 'secret']);
    
    // Initialize Plaid client
    const basePath = config.environment === 'sandbox' 
      ? PlaidEnvironments.sandbox 
      : PlaidEnvironments.production;
      
    const plaidConfiguration = new Configuration({
      basePath: basePath!,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': config.clientId,
          'PLAID-SECRET': config.secret,
          'Plaid-Version': '2020-09-14', // Use stable API version
        },
      },
    });
    
    this.client = new PlaidApi(plaidConfiguration);
  }

  /**
   * Create a link token for Plaid Link initialization
   * Used to start the bank account linking process
   * @param userId - Unique identifier for the user
   * @param clientName - Name of the application
   * @returns Link token response for frontend integration
   */
  async createLinkToken(
    userId: string, 
    clientName: string = 'Warp Sentinel'
  ): Promise<ServiceResponse<LinkTokenResponse>> {
    return this.executeWithErrorHandling(async () => {
      const response = await this.client.linkTokenCreate({
        user: { client_user_id: userId },
        client_name: clientName,
        products: ['auth' as any, 'transactions' as any], // Request auth and transaction access
        country_codes: ['US' as any], // Support US banks
        language: 'en',
        // webhook: undefined, // Could add webhook URL for real-time updates
      });

      return {
        linkToken: response.data.link_token,
        expiration: response.data.expiration,
        requestId: response.data.request_id,
      };
    }, 'create link token');
  }

  /**
   * Exchange public token for access token
   * Called after successful Plaid Link flow completion
   * @param publicToken - Public token from Plaid Link
   * @returns Access token for ongoing API calls
   */
  async exchangePublicToken(publicToken: string): Promise<ServiceResponse<AccessTokenResponse>> {
    return this.executeWithErrorHandling(async () => {
      const response = await this.client.itemPublicTokenExchange({
        public_token: publicToken,
      });

      return {
        accessToken: response.data.access_token,
        itemId: response.data.item_id,
        requestId: response.data.request_id,
      };
    }, 'exchange public token');
  }

  /**
   * Get account information for a linked bank account
   * @param accessToken - Access token for the account
   * @returns Account details and metadata
   */
  async getAccounts(accessToken: string): Promise<ServiceResponse<PlaidAccount[]>> {
    return this.executeWithErrorHandling(async () => {
      // Get accounts
      const accountsResponse = await this.client.accountsGet({
        access_token: accessToken,
      });

      // Get institution info to enrich account data
      const itemResponse = await this.client.itemGet({
        access_token: accessToken,
      });

      let institutionName: string | undefined;
      if (itemResponse.data.item.institution_id) {
        try {
          const institutionResponse = await this.client.institutionsGetById({
            institution_id: itemResponse.data.item.institution_id,
            country_codes: ['US' as any],
          });
          institutionName = institutionResponse.data.institution.name;
        } catch (error) {
          // If institution lookup fails, continue without it
          this.logger.warn('Failed to fetch institution details:', error);
        }
      }

      // Map Plaid accounts to our interface
      const accounts: PlaidAccount[] = accountsResponse.data.accounts.map(account => ({
        accountId: account.account_id,
        name: account.name,
        type: account.type as string,
        subtype: account.subtype,
        institutionName,
        mask: account.mask || undefined,
      }));

      return accounts;
    }, 'get accounts');
  }

  /**
   * Get current account balances
   * @param accessToken - Access token for the account
   * @param accountIds - Optional array of specific account IDs to fetch
   * @returns Current balance information for accounts
   */
  async getBalances(
    accessToken: string, 
    accountIds?: string[]
  ): Promise<ServiceResponse<AccountBalance[]>> {
    return this.executeWithErrorHandling(async () => {
      const requestOptions = accountIds ? { account_ids: accountIds } : {};
      const response = await this.client.accountsBalanceGet({
        access_token: accessToken,
        options: requestOptions,
      });

      const balances: AccountBalance[] = response.data.accounts.map(account => ({
        accountId: account.account_id,
        current: account.balances.current || 0,
        available: account.balances.available,
        currencyCode: account.balances.iso_currency_code || 'USD',
        lastUpdated: new Date().toISOString(),
      }));

      return balances;
    }, 'get balances');
  }

  /**
   * Get a specific account's current balance
   * Convenience method for single account balance checks
   * @param accessToken - Access token for the account
   * @param accountId - Specific account ID
   * @returns Balance information for the account
   */
  async getAccountBalance(
    accessToken: string, 
    accountId: string
  ): Promise<ServiceResponse<AccountBalance | null>> {
    return this.executeWithErrorHandling(async () => {
      const balancesResponse = await this.getBalances(accessToken, [accountId]);
      
      if (!balancesResponse.success || !balancesResponse.data) {
        throw new Error(`Failed to fetch balance: ${balancesResponse.error?.message}`);
      }

      const balance = balancesResponse.data.find(b => b.accountId === accountId);
      return balance || null;
    }, `get balance for account ${accountId}`);
  }

  /**
   * Check if an access token is still valid
   * @param accessToken - Access token to validate
   * @returns Whether the token is valid
   */
  async validateAccessToken(accessToken: string): Promise<ServiceResponse<boolean>> {
    return this.executeWithErrorHandling(async () => {
      // Try a simple API call to check token validity
      await this.client.accountsGet({
        access_token: accessToken,
      });
      return true;
    }, 'validate access token');
  }

  /**
   * Get information about available institutions (for development/debugging)
   * @param count - Number of institutions to return
   * @param offset - Offset for pagination
   * @returns List of available institutions
   */
  async getInstitutions(
    count: number = 100, 
    offset: number = 0
  ): Promise<ServiceResponse<Institution[]>> {
    return this.executeWithErrorHandling(async () => {
      const response = await this.client.institutionsGet({
        count,
        offset,
        country_codes: ['US' as any],
      });

      const institutions: Institution[] = response.data.institutions.map(inst => ({
        institutionId: inst.institution_id,
        name: inst.name,
        products: inst.products,
        countryCodes: inst.country_codes,
      }));

      return institutions;
    }, 'get institutions');
  }

  /**
   * Generate sandbox public token for testing
   * Only works in sandbox environment
   * @param institutionId - Institution to create test account for
   * @param initialProducts - Products to enable for test account
   * @returns Public token for testing
   */
  async createSandboxPublicToken(
    institutionId: string = 'ins_109508', // Chase Bank in sandbox
    initialProducts: string[] = ['auth', 'transactions']
  ): Promise<ServiceResponse<string>> {
    if (this.plaidConfig.environment !== 'sandbox') {
      throw new Error('Sandbox public token creation only available in sandbox environment');
    }

    return this.executeWithErrorHandling(async () => {
      const response = await this.client.sandboxPublicTokenCreate({
        institution_id: institutionId,
        initial_products: initialProducts as any,
      });

      return response.data.public_token;
    }, 'create sandbox public token');
  }

  /**
   * Get service configuration and status
   * @returns Service configuration information
   */
  public getServiceInfo(): {
    environment: string;
    configured: boolean;
    supportedCountries: string[];
    supportedProducts: string[];
  } {
    return {
      environment: this.plaidConfig.environment,
      configured: !!(this.plaidConfig.clientId && this.plaidConfig.secret),
      supportedCountries: ['US'],
      supportedProducts: ['auth', 'transactions'],
    };
  }
}
