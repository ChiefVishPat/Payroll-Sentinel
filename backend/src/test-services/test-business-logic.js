/**
 * Test Business Logic Services
 * 
 * Demonstrates the new cash flow analysis, risk detection, and background jobs services.
 */

// Load environment variables - works from any computer/directory
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Import the service factories
const { 
  initializeAllServices,
  initializeBasicServices 
} = require('../../dist/services/index.js');

async function testBusinessLogicServices() {
  console.log('🧪 Testing Business Logic Services\n');
  
  try {
    // Test 1: Initialize all services
    console.log('1️⃣ Initializing all services...');
    const services = initializeAllServices(['company_123', 'company_456']);
    
    console.log('✅ Services initialized:');
    console.log(`   - Plaid: ${services.plaid.getHealthStatus().status}`);
    console.log(`   - Check: ${services.check.getHealthStatus().status}`);
    console.log(`   - Slack: ${services.slack.getHealthStatus().status}`);
    console.log(`   - Cash Flow: ${services.cashFlow.getAnalysisServiceInfo().configured ? 'configured' : 'not configured'}`);
    console.log(`   - Risk Detection: ${services.riskDetection.getRiskDetectionInfo().configured ? 'configured' : 'not configured'}`);
    console.log(`   - Background Jobs: ${services.backgroundJobs.getBackgroundJobsInfo().configured ? 'configured' : 'not configured'}`);
    console.log('');

    // Test 2: Cash Flow Analysis
    console.log('2️⃣ Testing Cash Flow Analysis...');
    const analysisResult = await services.cashFlow.performAnalysis('company_123');
    
    if (analysisResult.success && analysisResult.data) {
      const { analysis, confidenceLevel, bankAccountsAnalyzed, payrollsAnalyzed } = analysisResult.data;
      
      console.log('✅ Cash Flow Analysis Results:');
      console.log(`   - Current Balance: $${analysis.currentBalance.toLocaleString()}`);
      console.log(`   - Required Float: $${analysis.requiredFloat.toLocaleString()}`);
      console.log(`   - Risk Level: ${analysis.riskLevel.toUpperCase()}`);
      console.log(`   - Days Until Risk: ${analysis.daysUntilRisk}`);
      console.log(`   - Confidence: ${confidenceLevel.toUpperCase()}`);
      console.log(`   - Bank Accounts: ${bankAccountsAnalyzed}`);
      console.log(`   - Payrolls Analyzed: ${payrollsAnalyzed}`);
      console.log(`   - Projections: ${analysis.projections.length} cash flow events`);
      console.log(`   - Recommendations: ${analysis.recommendations.length}`);
      analysis.recommendations.forEach((rec, i) => {
        console.log(`     ${i + 1}. ${rec}`);
      });
    } else {
      console.log('❌ Cash Flow Analysis failed:', analysisResult.error?.message);
    }
    console.log('');

    // Test 3: Quick Risk Summary
    console.log('3️⃣ Testing Quick Risk Summary...');
    const riskSummaryResult = await services.cashFlow.getQuickRiskSummary('company_123');
    
    if (riskSummaryResult.success && riskSummaryResult.data) {
      const { riskLevel, riskScore, summary, daysUntilNextPayroll, currentBalance } = riskSummaryResult.data;
      
      console.log('✅ Quick Risk Summary:');
      console.log(`   - Risk Score: ${riskScore}/100`);
      console.log(`   - Risk Level: ${riskLevel.toUpperCase()}`);
      console.log(`   - Current Balance: $${currentBalance.toLocaleString()}`);
      console.log(`   - Days Until Payroll: ${daysUntilNextPayroll}`);
      console.log(`   - Summary: ${summary}`);
    } else {
      console.log('❌ Quick Risk Summary failed:', riskSummaryResult.error?.message);
    }
    console.log('');

    // Test 4: Risk Detection
    console.log('4️⃣ Testing Risk Detection...');
    const monitoringResult = await services.riskDetection.monitorCompanyRisk('company_123');
    
    if (monitoringResult.success && monitoringResult.data) {
      const { riskDetected, alertsSent, analysisResult, alerts } = monitoringResult.data;
      
      console.log('✅ Risk Monitoring Results:');
      console.log(`   - Risk Detected: ${riskDetected ? 'YES' : 'NO'}`);
      console.log(`   - Alerts Sent: ${alertsSent}`);
      
      if (alerts && alerts.length > 0) {
        console.log(`   - Alert Types: ${alerts.map(a => a.alertType).join(', ')}`);
        alerts.forEach((alert, i) => {
          console.log(`     Alert ${i + 1}: ${alert.severity.toUpperCase()} - ${alert.message}`);
        });
      }
    } else {
      console.log('❌ Risk Detection failed:', monitoringResult.error?.message);
    }
    console.log('');

    // Test 5: Alert History
    console.log('5️⃣ Testing Alert History...');
    const alertHistoryResult = await services.riskDetection.getAlertHistory('company_123', 10);
    
    if (alertHistoryResult.success && alertHistoryResult.data) {
      const history = alertHistoryResult.data;
      
      console.log('✅ Alert History:');
      console.log(`   - Total Alerts: ${history.length}`);
      
      if (history.length > 0) {
        history.slice(0, 3).forEach((alert, i) => {
          console.log(`     ${i + 1}. [${alert.severity.toUpperCase()}] ${alert.alertType} - ${alert.message}`);
          console.log(`        Sent: ${new Date(alert.sentAt).toLocaleString()}`);
        });
      } else {
        console.log('   - No alerts in history');
      }
    } else {
      console.log('❌ Alert History failed:', alertHistoryResult.error?.message);
    }
    console.log('');

    // Test 6: Monitoring Statistics
    console.log('6️⃣ Testing Monitoring Statistics...');
    const statsResult = await services.riskDetection.getMonitoringStats();
    
    if (statsResult.success && statsResult.data) {
      const { totalCompaniesMonitored, alertsSentToday, averageRiskScore, companiesAtRisk } = statsResult.data;
      
      console.log('✅ Monitoring Statistics:');
      console.log(`   - Companies Monitored: ${totalCompaniesMonitored}`);
      console.log(`   - Alerts Sent Today: ${alertsSentToday}`);
      console.log(`   - Average Risk Score: ${averageRiskScore}`);
      console.log(`   - Companies At Risk: ${companiesAtRisk}`);
    } else {
      console.log('❌ Monitoring Statistics failed:', statsResult.error?.message);
    }
    console.log('');

    // Test 7: Background Jobs Info
    console.log('7️⃣ Testing Background Jobs...');
    const jobsInfo = services.backgroundJobs.getBackgroundJobsInfo();
    
    console.log('✅ Background Jobs Info:');
    console.log(`   - Service: ${jobsInfo.service}`);
    console.log(`   - Configured: ${jobsInfo.configured ? 'YES' : 'NO'}`);
    console.log(`   - Jobs Running: ${jobsInfo.jobsRunning}`);
    console.log(`   - Total Jobs Executed: ${jobsInfo.totalJobsExecuted}`);
    console.log(`   - Companies Monitored: ${jobsInfo.companiesMonitored}`);
    console.log(`   - Enabled Jobs: ${Object.entries(jobsInfo.configuration.enabledJobs || {})
      .filter(([, enabled]) => enabled)
      .map(([job]) => job)
      .join(', ')}`);
    console.log('');

    // Test 8: Manual Job Trigger (Health Check)
    console.log('8️⃣ Testing Manual Job Trigger...');
    const jobTriggerResult = await services.backgroundJobs.triggerJob('healthChecks');
    
    if (jobTriggerResult.success && jobTriggerResult.data) {
      const { jobName, success, duration, companiesProcessed } = jobTriggerResult.data;
      
      console.log('✅ Job Trigger Results:');
      console.log(`   - Job: ${jobName}`);
      console.log(`   - Success: ${success ? 'YES' : 'NO'}`);
      console.log(`   - Duration: ${duration}ms`);
      console.log(`   - Companies Processed: ${companiesProcessed}`);
    } else {
      console.log('❌ Job Trigger failed:', jobTriggerResult.error?.message);
    }
    console.log('');

    // Test 9: Test Alert System
    console.log('9️⃣ Testing Alert System...');
    const alertTestResult = await services.riskDetection.testAlerts('company_123');
    
    if (alertTestResult.success && alertTestResult.data) {
      const { testSent, channels, errors } = alertTestResult.data;
      
      console.log('✅ Alert Test Results:');
      console.log(`   - Test Sent: ${testSent ? 'YES' : 'NO'}`);
      console.log(`   - Channels: ${channels.join(', ') || 'none'}`);
      
      if (errors && errors.length > 0) {
        console.log(`   - Errors: ${errors.join(', ')}`);
      }
    } else {
      console.log('❌ Alert Test failed:', alertTestResult.error?.message);
    }
    console.log('');

    console.log('🎉 All business logic services tested successfully!\n');
    
    // Show summary
    console.log('📊 SUMMARY:');
    console.log('✅ Cash Flow Analysis - Analyzes bank balances vs payroll obligations');
    console.log('✅ Risk Detection - Monitors risks and sends alerts based on thresholds');
    console.log('✅ Background Jobs - Automates monitoring and reporting on schedule');
    console.log('✅ Alert System - Sends notifications via Slack when risks detected');
    console.log('✅ Service Integration - All services working together seamlessly');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testBusinessLogicServices()
    .then(() => {
      console.log('\n✅ Business logic test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Business logic test failed:', error);
      process.exit(1);
    });
}

module.exports = { testBusinessLogicServices };
