/**
 * Check Service Tests
 * Tests payroll data and cash flow functionality
 * Run with: node src/test-services/test-check.js
 */

const { createCheckService } = require('../../dist/services');

async function testCheck() {
  console.log('📋 Testing Check Service...\n');

  const checkService = createCheckService({
    apiKey: 'demo_key',
    environment: 'sandbox'
  });

  console.log('📊 Service Status:');
  console.log(JSON.stringify(checkService.getHealthStatus(), null, 2));
  console.log();

  const companyId = 'demo_company_001';

  console.log('👥 Getting employees...');
  const employees = await checkService.getEmployees(companyId);
  
  if (employees.success) {
    console.log(`✅ Found ${employees.data.length} employees`);
    employees.data.forEach(emp => {
      const pay = emp.annualSalary ? 
        `$${emp.annualSalary.toLocaleString()}/year` : 
        `$${emp.hourlyRate}/hour`;
      console.log(`   - ${emp.firstName} ${emp.lastName}: ${pay}`);
    });
  } else {
    console.log('❌ Failed to get employees');
    return;
  }

  console.log('\n💼 Creating payroll run...');
  const today = new Date();
  const payDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const payrollRun = await checkService.createPayrollRun(
    companyId,
    today.toISOString().split('T')[0],
    new Date(today.getTime() + 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payDate.toISOString().split('T')[0]
  );
  
  if (payrollRun.success) {
    console.log('✅ Payroll run created successfully');
    console.log(`   Run ID: ${payrollRun.data.id}`);
    console.log(`   Total Gross: $${payrollRun.data.totalGross.toLocaleString()}`);
    console.log(`   Total Net: $${payrollRun.data.totalNet.toLocaleString()}`);
    console.log(`   Pay Date: ${payrollRun.data.payDate}`);
  }

  console.log('\n📈 Getting payroll summary...');
  const summary = await checkService.getPayrollSummary(companyId);
  
  if (summary.success) {
    console.log('✅ Payroll summary retrieved');
    console.log(`   Upcoming payrolls: ${summary.data.upcomingPayrolls.length}`);
    const totalUpcoming = summary.data.upcomingPayrolls.reduce((sum, p) => sum + p.estimatedAmount, 0);
    console.log(`   Total upcoming: $${totalUpcoming.toLocaleString()}`);
    console.log(`   Next payroll: ${summary.data.nextPayrollDate}`);
  }

  console.log('\n📅 Getting next payroll...');
  const nextPayroll = await checkService.getNextPayroll(companyId);
  
  if (nextPayroll.success && nextPayroll.data) {
    console.log('✅ Next payroll found');
    console.log(`   Amount: $${nextPayroll.data.estimatedAmount.toLocaleString()}`);
    console.log(`   Pay Date: ${nextPayroll.data.payDate}`);
    console.log(`   Days until: ${Math.ceil((new Date(nextPayroll.data.payDate) - new Date()) / (24 * 60 * 60 * 1000))}`);
  }

  console.log('\n✅ Check service tests completed!');
}

testCheck().catch(error => {
  console.error('❌ Check test failed:', error.message);
  process.exit(1);
});
