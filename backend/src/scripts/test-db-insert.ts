#!/usr/bin/env tsx

/**
 * Quick Database Insert Test
 * 
 * This script directly tests database insertion to identify the issue
 */

import '@backend/loadEnv';
import { supabase } from '@backend/db/client';

async function testDatabaseInsert(): Promise<void> {
  console.log('🧪 Testing direct database insertion...\n');
  
  try {
    console.log('1. Testing basic connection...');
    const { error: testError } = await supabase
      .from('companies')
      .select('count', { count: 'exact', head: true });
    
    if (testError) {
      console.error('❌ Connection test failed:', testError);
      return;
    }
    console.log('✅ Connection test passed\n');
    
    console.log('2. Testing current user context...');
    const { data: user } = await supabase.auth.getUser();
    console.log('Current user:', user?.user ? 'Authenticated' : 'Service role (no user)');
    
    console.log('\n3. Attempting to insert a test company...');
    console.log('Using service role key for direct database access...');
    
    // Try a simpler insert first
    const { data: company, error } = await supabase
      .from('companies')
      .insert({ name: 'Direct Test Company' })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Insert failed:');
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      return;
    }
    
    console.log('✅ Insert successful!');
    console.log('Created company:', JSON.stringify(company, null, 2));
    
    // Clean up - delete the test company
    console.log('\n4. Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('companies')
      .delete()
      .eq('id', company.id);
    
    if (deleteError) {
      console.error('⚠️  Could not delete test company:', deleteError.message);
    } else {
      console.log('✅ Test company deleted');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDatabaseInsert().catch(console.error);
