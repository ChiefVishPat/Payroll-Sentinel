#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Load environment variables manually
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value;
      }
    }
  });
}

// Verify critical environment variables
function checkEnvironment() {
  const required = ['SLACK_BOT_TOKEN', 'SLACK_CHANNEL_ID'];
  const missing = required.filter(key => !process.env[key] || process.env[key].includes('your_') || process.env[key] === 'placeholder');
  
  if (missing.length > 0) {
    console.log('⚠️ Missing or placeholder environment variables:', missing.join(', '));
    console.log('💡 Update your .env file with valid Slack credentials to test alerts');
    console.log('📋 Current values:');
    required.forEach(key => {
      const value = process.env[key];
      console.log(`   ${key}: ${value ? (value.substring(0, 10) + '...') : 'undefined'}`);
    });
    return false;
  }
  return true;
}

const { createCashFlowAnalysisService, createRiskDetectionService, createSlackService } = require('../../dist/services');

async function testAllRiskLevels() {
  console.log('🧪 Testing All Risk Levels with Slack Alerts\n');
  console.log('This test will demonstrate how Payroll Sentinel handles different cash flow scenarios:\n');

  try {
    // Check environment
    const hasSlackCredentials = checkEnvironment();
    
    // Initialize services
    console.log('🔧 Initializing services...');
    const cashFlowService = createCashFlowAnalysisService();
    
    let slackService;
    let riskDetectionService;
    
    if (hasSlackCredentials) {
      slackService = createSlackService();
      riskDetectionService = createRiskDetectionService(cashFlowService, slackService);
      console.log('✅ Services initialized with Slack integration\n');
    } else {
      riskDetectionService = createRiskDetectionService(cashFlowService);
      console.log('✅ Services initialized (Slack alerts disabled)\n');
    }

    // Test scenarios - different company IDs trigger different mock balances
    const testScenarios = [
      {
        companyId: 'test_safe_company',
        name: 'SAFE Company',
        description: 'Healthy cash flow with sufficient funds',
        expectedRisk: 'safe',
        expectedBalance: 200000,
        expectedFloat: 56100, // 10% buffer on ~$51,000 payroll
      },
      {
        companyId: 'test_warning_company', 
        name: 'WARNING Company',
        description: 'Cash flow approaching critical levels',
        expectedRisk: 'warning',
        expectedBalance: 50000,
        expectedFloat: 56100, // Same payroll, but balance between 80%-100%
      },
      {
        companyId: 'test_critical_company',
        name: 'CRITICAL Company', 
        description: 'Insufficient funds for upcoming payroll',
        expectedRisk: 'critical',
        expectedBalance: 40000,
        expectedFloat: 56100, // Same payroll, but balance < 80%
      }
    ];

    console.log('📊 CASH FLOW ANALYSIS COMPARISON\n');
    console.log('═'.repeat(80));
    console.log('| Scenario     | Balance    | Required   | Risk Level | Status      |');
    console.log('═'.repeat(80));

    const results = [];

    // Test each scenario
    for (let i = 0; i < testScenarios.length; i++) {
      const scenario = testScenarios[i];
      console.log(`\n${i + 1}️⃣ Testing ${scenario.name}...`);
      
      try {
        // Get cash flow analysis
        const analysisResult = await cashFlowService.performAnalysis(scenario.companyId);
        
        if (analysisResult.success && analysisResult.data) {
          const analysis = analysisResult.data.analysis;
          
          // Display analysis in table format
          const balanceStr = `$${analysis.currentBalance.toLocaleString()}`.padEnd(10);
          const floatStr = `$${analysis.requiredFloat.toLocaleString()}`.padEnd(10);
          const riskStr = analysis.riskLevel.toUpperCase().padEnd(10);
          const statusIcon = analysis.riskLevel === 'safe' ? '✅ GOOD' : 
                           analysis.riskLevel === 'warning' ? '⚠️ WATCH' : '🚨 URGENT';
          
          console.log(`| ${scenario.name.padEnd(12)} | ${balanceStr} | ${floatStr} | ${riskStr} | ${statusIcon.padEnd(11)} |`);
          
          // Store for alerts testing
          results.push({
            scenario,
            analysis,
            analysisResult: analysisResult.data
          });
          
        } else {
          console.log(`❌ Analysis failed for ${scenario.name}:`, analysisResult.error?.message);
        }
        
      } catch (error) {
        console.log(`❌ Error testing ${scenario.name}:`, error.message);
      }
    }
    
    console.log('═'.repeat(80));
    console.log('\n🔍 DETAILED RISK ANALYSIS\n');

    // Show detailed analysis for each scenario
    results.forEach((result, index) => {
      const { scenario, analysis } = result;
      console.log(`${index + 1}. ${scenario.name} (${analysis.riskLevel.toUpperCase()})`);
      console.log(`   💰 Current Balance: $${analysis.currentBalance.toLocaleString()}`);
      console.log(`   🎯 Required Float: $${analysis.requiredFloat.toLocaleString()}`);
      console.log(`   📊 Coverage Ratio: ${(analysis.currentBalance / analysis.requiredFloat * 100).toFixed(1)}%`);
      console.log(`   📅 Days Until Payroll: ${analysis.daysUntilRisk}`);
      console.log(`   💡 Recommendations:`);
      
      analysis.recommendations.slice(0, 3).forEach(rec => {
        console.log(`      - ${rec}`);
      });
      console.log('');
    });

    console.log('🚨 TESTING RISK DETECTION & SLACK ALERTS\n');

    // Test risk detection and send Slack alerts for each scenario
    for (let i = 0; i < results.length; i++) {
      const { scenario, analysis } = results[i];
      
      console.log(`${i + 1}️⃣ Testing alerts for ${scenario.name}...`);
      
      try {
        // Monitor company risk (this triggers alerts)
        const monitorResult = await riskDetectionService.monitorCompanyRisk(scenario.companyId);
        
        if (monitorResult.success && monitorResult.data) {
          console.log(`   📤 Risk Detected: ${monitorResult.data.riskDetected ? 'YES' : 'NO'}`);
          console.log(`   📨 Alerts Sent: ${monitorResult.data.alertsSent}`);
          
          if (monitorResult.data.alerts && monitorResult.data.alerts.length > 0) {
            console.log('   🔔 Alert Details:');
            monitorResult.data.alerts.forEach(alert => {
              console.log(`      - ${alert.severity.toUpperCase()}: ${alert.message}`);
            });
          }
          
          // Send a test alert if Slack is configured
          if (hasSlackCredentials) {
            console.log('   🧪 Sending test alert to verify Slack formatting...');
            const testResult = await riskDetectionService.testAlerts(scenario.companyId);
            
            if (testResult.success && testResult.data?.testSent) {
              console.log('   ✅ Test alert sent successfully');
              console.log(`   📱 Check Slack - should show "${analysis.riskLevel.toUpperCase()}" status`);
            } else {
              console.log('   ❌ Test alert failed:', testResult.data?.errors?.join(', '));
            }
          } else {
            console.log('   📧 Slack not configured - skipping alert test');
          }
          
        } else {
          console.log(`   ❌ Risk monitoring failed:`, monitorResult.error?.message);
        }
        
      } catch (error) {
        console.log(`   ❌ Error in risk detection:`, error.message);
      }
      
      // Add delay between tests to avoid rate limiting
      if (i < results.length - 1) {
        console.log('   ⏳ Waiting 2 seconds before next test...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log('');
      }
    }

    console.log('🎉 ALL RISK LEVEL TESTS COMPLETED!\n');
    
    console.log('📋 SUMMARY OF WHAT YOU SHOULD SEE IN SLACK:\n');
    console.log('1️⃣ SAFE Company Alert:');
    console.log('   🟢 Status: SAFE (Green indicator)');
    console.log('   💰 Balance: $200,000 | Required: $56,100');
    console.log('   📝 Message: Company has sufficient funds for payroll\n');
    
    console.log('2️⃣ WARNING Company Alert:');
    console.log('   🟡 Status: AT RISK (Orange indicator)');
    console.log('   💰 Balance: $50,000 | Required: $56,100');
    console.log('   📝 Message: Cash flow approaching critical levels\n');
    
    console.log('3️⃣ CRITICAL Company Alert:');
    console.log('   🔴 Status: CRITICAL (Red indicator)');
    console.log('   💰 Balance: $40,000 | Required: $56,100');
    console.log('   📝 Message: Insufficient funds for upcoming payroll\n');
    
    console.log('💡 KEY INSIGHTS:');
    console.log('   - Required Float = Payroll Amount × 1.1 (10% safety buffer)');
    console.log('   - WARNING = Balance between 80% and 100% of required float');
    console.log('   - CRITICAL = Balance below 80% of required float');
    console.log('   - Each scenario triggers appropriate recommendations');
    console.log('   - Slack alerts reflect the true financial risk status');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.error(error.stack);
  }
}

// Run the comprehensive test
testAllRiskLevels().catch(console.error);
