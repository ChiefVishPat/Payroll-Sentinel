# Payroll Sentinel Backend - Codebase Documentation

## Overview

Payroll Sentinel is a cash flow monitoring and risk detection system designed to prevent payroll failures by analyzing bank account balances against upcoming payroll obligations. The backend provides real-time risk assessment, automated alerting, and comprehensive cash flow projections.

## Architecture

### Core Components

1. **Base Service Framework** (`src/services/base.ts`)
   - Standardized error handling and response formatting
   - Retry logic with exponential backoff
   - Request logging and monitoring
   - Configuration validation

2. **Risk Analysis Engine** (`src/utils/risk.ts`)
   - Cash flow projection modeling
   - Risk level determination (safe/warning/critical)
   - Numerical risk scoring (0-100)
   - Automated recommendation generation

3. **External Service Integrations**
   - **Plaid Service**: Bank account monitoring and balance retrieval
   - **Check Service**: Payroll data and obligation tracking (mocked)
   - **Slack Service**: Alert notifications and team communication

4. **Business Logic Services**
   - **Cash Flow Analysis**: Orchestrates data from multiple sources
   - **Risk Detection**: Automated monitoring and threshold evaluation
   - **Background Jobs**: Scheduled monitoring and reporting

## Service Architecture

### BaseService Pattern

All external service integrations extend the `BaseService` class:

```typescript
export abstract class BaseService {
  // Standardized error handling
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<ServiceResponse<T>>

  // Retry logic for transient failures
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts?: number,
    baseDelayMs?: number
  ): Promise<T>

  // Configuration validation
  protected validateConfig(requiredFields: string[]): void
}
```

### Response Standardization

All service responses follow a consistent format:

```typescript
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  metadata?: ServiceMetadata;
}
```

## Risk Analysis System

### Risk Levels

- **SAFE**: Balance ≥ 100% of required float
- **WARNING**: Balance 80-99% of required float  
- **CRITICAL**: Balance < 80% of required float

### Risk Scoring Algorithm

Risk scores (0-100) combine multiple factors:

1. **Base Score by Risk Level**:
   - Critical: 70 points
   - Warning: 40 points
   - Safe: 10 points

2. **Urgency Adjustments**:
   - ≤1 day until payroll: +20 points
   - ≤3 days until payroll: +10 points
   - ≤7 days until payroll: +5 points

3. **Future Risk Factors**:
   - +2 points per future risk event (capped at 10)

### Cash Flow Projections

The system generates chronological projections by:

1. Combining payroll obligations and expected inflows
2. Sorting events by date
3. Calculating running balances
4. Assessing risk at each point in time

## External Service Integrations

### Plaid Integration
- **Purpose**: Real-time bank account monitoring
- **Features**: Balance retrieval, transaction history, account linking
- **Environment**: Supports sandbox and production environments
- **Error Handling**: Plaid-specific error code mapping

### Slack Integration  
- **Purpose**: Team notifications and risk alerts
- **Features**: Rich message formatting, channel management, alert escalation
- **Message Types**: Risk alerts, test notifications, system status
- **Formatting**: Emoji indicators, structured blocks, contextual information

### Check Integration (Mocked)
- **Purpose**: Payroll data and scheduling
- **Features**: Employee management, payroll run creation, obligation tracking
- **Mock Data**: Realistic payroll scenarios for testing
- **Future**: Will integrate with actual payroll providers

## Alert System

### Alert Types
- **Critical Risk**: Insufficient funds for payroll
- **Low Balance**: Balance approaching minimum requirements
- **Upcoming Payroll**: Notifications 3 days before payroll
- **Projection Warning**: Future cash flow issues detected

### Alert Filtering
- **Cooldown Periods**: 4-hour minimum between alerts per company
- **Daily Limits**: Maximum 10 alerts per company per day
- **Deduplication**: Prevents duplicate alert types within cooldown period

### Escalation Rules
- **Critical Alerts**: Mention @channel in Slack
- **Warning Alerts**: Standard notifications
- **Info Alerts**: Low-priority notifications

## Configuration Management

### Environment Variables
```bash
# Plaid Configuration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret

# Slack Configuration  
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=your_slack_channel_id

# Check Configuration (Mock)
CHECK_API_KEY=demo_key

# Environment
NODE_ENV=development|production
```

### Service Configuration
Each service accepts configuration objects with environment-specific settings:

```typescript
interface ServiceConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;        // Default: 30 seconds
  retryAttempts?: number;  // Default: 3
  environment: 'sandbox' | 'production';
}
```

## Testing Framework

### Unit Tests (`src/test/`)
- **Framework**: Vitest
- **Scope**: Business logic, utility functions, type validation
- **Mocking**: External dependencies mocked
- **Purpose**: Fast feedback, CI/CD integration

### Integration Tests (`src/test-services/`)
- **Scope**: Real API interactions, end-to-end workflows
- **Environment**: Uses actual credentials from `.env`
- **Purpose**: Manual testing, development verification

### Test Scenarios
- **Risk Level Testing**: Safe, warning, and critical scenarios
- **Alert System Testing**: Multi-level alert verification
- **Service Integration**: Cross-service communication validation

## Error Handling Strategy

### Error Classification
1. **Retryable Errors**: Network timeouts, 5xx HTTP errors, rate limits
2. **Non-Retryable Errors**: Authentication failures, 4xx HTTP errors
3. **Configuration Errors**: Missing credentials, invalid settings

### Error Response Format
```typescript
interface ServiceError {
  code: string;           // Programmatic error code
  message: string;        // Human-readable message
  details?: object;       // Additional context
  retryable: boolean;     // Whether retry is appropriate
  statusCode?: number;    // HTTP status (if applicable)
}
```

### Logging Strategy
- **Request Tracking**: Unique request IDs for correlation
- **Performance Monitoring**: Duration logging for all operations
- **Error Context**: Full error details with stack traces
- **Structured Logging**: Consistent format across services

## Deployment and Operations

### Build Process
```bash
npm run build   # Compile TypeScript to JavaScript
npm test        # Run unit tests
npm run dev     # Start development server
```

### Health Monitoring
Each service provides health status:
```typescript
{
  service: string;
  status: 'configured' | 'unconfigured';
  environment: string;
  lastChecked: string;
}
```

### Background Jobs
- **Risk Monitoring**: Periodic company risk assessment
- **Daily Reports**: Summary reports and statistics
- **Health Checks**: System component validation

## Security Considerations

### API Key Management
- Environment variable storage
- No hardcoded credentials
- Service-specific key validation

### Data Privacy
- Minimal data retention
- No sensitive financial data storage
- Encrypted communication channels

### Rate Limiting
- Respect external API limits
- Exponential backoff for retries
- Request throttling implementation

## Performance Optimization

### Caching Strategy
- In-memory alert history storage
- Configuration caching
- Response caching for frequent operations

### Request Optimization
- Concurrent API calls where possible
- Minimal data transfer
- Efficient error handling

### Monitoring
- Response time tracking
- Error rate monitoring
- Service availability metrics

## Future Enhancements

### Planned Features
1. **Database Integration**: Persistent data storage
2. **Additional Payroll Providers**: Beyond Check integration
3. **Advanced Analytics**: Trend analysis, forecasting
4. **Web Dashboard**: Real-time monitoring interface
5. **Mobile Notifications**: Push notifications for critical alerts

### Scalability Considerations
- Microservice architecture readiness
- Database sharding strategies
- Load balancing implementation
- Multi-tenant support

## Development Guidelines

### Code Style
- TypeScript strict mode enabled
- Comprehensive error handling
- Detailed function documentation
- Consistent naming conventions

### Testing Standards
- Minimum 80% code coverage
- Unit tests for all utilities
- Integration tests for workflows
- End-to-end testing for critical paths

### Documentation Requirements
- JSDoc comments for all public functions
- README updates for new features
- API documentation maintenance
- Deployment guide updates

## Troubleshooting Guide

### Common Issues
1. **Missing Environment Variables**: Check `.env` file configuration
2. **API Authentication Failures**: Verify credentials and permissions
3. **Slack Permissions**: Ensure bot has channel access
4. **Network Timeouts**: Check retry configuration and network stability

### Debug Tools
- Request ID tracking for operation correlation
- Detailed error logging with context
- Service health status endpoints
- Test scripts for individual components

### Support Resources
- Test scripts in `src/test-services/`
- Health check utilities
- Configuration validation tools
- Error code reference documentation

This documentation provides a comprehensive overview of the Payroll Sentinel backend architecture, implementation patterns, and operational considerations. Regular updates ensure accuracy as the system evolves.
