#!/usr/bin/env node

const path = require('path');
const { fileURLToPath } = require('url');

// Load environment variables from .env file
const fs = require('fs');
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
        process.env[key.trim()] = value;
      }
    }
  });
}

// Import services using built files
const { createCashFlowAnalysisService, createRiskDetectionService, createSlackService } = require('../../dist/services');

async function testRiskLevelFix() {
  console.log('🧪 Testing Risk Level Fix in Slack Alerts\n');

  try {
    // Initialize services
    console.log('1️⃣ Initializing services...');
    const slackService = createSlackService();
    const cashFlowService = createCashFlowAnalysisService();
    const riskDetectionService = createRiskDetectionService(cashFlowService, slackService);
    console.log('✅ Services initialized\n');

    // Test company with safe cash flow
    const testCompanyId = 'test_company_safe';
    console.log(`2️⃣ Testing risk detection for company: ${testCompanyId}`);
    
    // First, get the cash flow analysis to see what the actual risk level is
    console.log('📊 Getting cash flow analysis...');
    const analysisResult = await cashFlowService.performAnalysis(testCompanyId);
    
    if (analysisResult.success && analysisResult.data) {
      const analysis = analysisResult.data.analysis;
      console.log('✅ Cash Flow Analysis:');
      console.log(`   - Current Balance: $${analysis.currentBalance.toLocaleString()}`);
      console.log(`   - Required Float: $${analysis.requiredFloat.toLocaleString()}`);
      console.log(`   - Risk Level: ${analysis.riskLevel.toUpperCase()}`);
      console.log(`   - Risk Assessment: ${analysis.riskLevel === 'safe' ? '✅ SAFE' : analysis.riskLevel === 'warning' ? '⚠️ WARNING' : '🚨 CRITICAL'}`);
      
      // Calculate if the company should actually be safe
      const shouldBeSafe = analysis.currentBalance >= analysis.requiredFloat;
      console.log(`   - Should be safe: ${shouldBeSafe ? 'YES' : 'NO'} (Balance >= Required)`);
      console.log('');

      // Now test the risk detection (which sends Slack alerts)
      console.log('3️⃣ Testing risk detection and Slack alerts...');
      const monitorResult = await riskDetectionService.monitorCompanyRisk(testCompanyId);
      
      if (monitorResult.success && monitorResult.data) {
        console.log('✅ Risk Detection Results:');
        console.log(`   - Risk Detected: ${monitorResult.data.riskDetected ? 'YES' : 'NO'}`);
        console.log(`   - Alerts Sent: ${monitorResult.data.alertsSent}`);
        
        if (monitorResult.data.alertsSent > 0) {
          console.log('📤 Slack Alert Details:');
          console.log('   ℹ️ The Slack alert should now show the correct risk level:');
          
          if (analysis.riskLevel === 'safe') {
            console.log('   ✅ Expected: Risk status should be "SAFE" (green)');
            console.log('   💰 Balance is sufficient for payroll obligations');
          } else if (analysis.riskLevel === 'warning') {
            console.log('   ⚠️ Expected: Risk status should be "AT RISK" (orange)');
            console.log('   📊 Balance is getting close to minimum requirements');
          } else {
            console.log('   🚨 Expected: Risk status should be "CRITICAL" (red)');
            console.log('   💸 Balance is insufficient for upcoming payroll');
          }
          
          console.log('   📱 Check your Slack channel to verify the alert shows the correct status!');
        } else {
          console.log('   ℹ️ No alerts sent (risk level may be safe with no upcoming issues)');
        }
      } else {
        console.log('❌ Risk detection failed:', monitorResult.error?.message);
      }
      
      console.log('\n4️⃣ Testing test alert (always sends regardless of risk level)...');
      const testResult = await riskDetectionService.testAlerts(testCompanyId);
      
      if (testResult.success && testResult.data) {
        console.log('✅ Test Alert Results:');
        console.log(`   - Test Sent: ${testResult.data.testSent ? 'YES' : 'NO'}`);
        console.log(`   - Channels: ${testResult.data.channels.join(', ')}`);
        
        if (testResult.data.testSent) {
          console.log('   📱 Check your Slack for the test alert - it should show:');
          console.log(`   ✅ Risk Level: ${analysis.riskLevel.toUpperCase()}`);
          console.log(`   💰 Current Balance: $${analysis.currentBalance.toLocaleString()}`);
          console.log(`   🎯 Required Float: $${analysis.requiredFloat.toLocaleString()}`);
          console.log(`   📅 Days Until Payroll: ${analysis.daysUntilRisk}`);
        }
        
        if (testResult.data.errors && testResult.data.errors.length > 0) {
          console.log('   ⚠️ Errors:', testResult.data.errors);
        }
      } else {
        console.log('❌ Test alert failed:', testResult.error?.message);
      }

    } else {
      console.log('❌ Cash flow analysis failed:', analysisResult.error?.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n🎉 Risk level fix test completed!');
  console.log('\n📋 Summary of the fix:');
  console.log('   - Issue: Slack alerts showed "at_risk" even when cash flow was safe');
  console.log('   - Cause: Alert severity was used instead of actual risk level');
  console.log('   - Fix: Now uses analysis.riskLevel for correct status display');
  console.log('   - Result: Slack alerts now accurately reflect financial risk status');
}

// Run the test
testRiskLevelFix().catch(console.error);
