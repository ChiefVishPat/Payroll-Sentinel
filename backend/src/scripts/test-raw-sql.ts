#!/usr/bin/env tsx

/**
 * Raw SQL Test
 * 
 * This script uses raw SQL to test database insertion and bypass potential RLS issues
 */

import '../loadEnv.js';
import { supabase } from '../db/client';

async function testRawSQL(): Promise<void> {
  console.log('🔧 Testing with raw SQL...\n');
  
  try {
    console.log('1. Testing raw SQL query...');
    
    // Use raw SQL to insert
    const { data, error } = await supabase
      .rpc('exec_sql', { 
        sql: `INSERT INTO companies (name) VALUES ('Raw SQL Test Company') RETURNING *;` 
      });
    
    if (error) {
      console.error('❌ Raw SQL failed:', error);
      
      // Try a simpler approach - direct SQL execution
      console.log('\n2. Trying alternative approach...');
      
      const { data: insertData, error: insertError } = await supabase
        .from('companies')
        .insert({ name: 'Alternative Test Company' })
        .select('*');
      
      if (insertError) {
        console.error('❌ Alternative insert failed:');
        console.error('Full error:', insertError);
        
        // Let's try to understand what's happening
        console.log('\n3. Debugging the issue...');
        console.log('Environment check:');
        console.log('- SUPABASE_URL:', process.env.SUPABASE_URL);
        console.log('- Service role key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);
        
        // Check if we can read from the table
        console.log('\n4. Testing read access...');
        const { data: readData, error: readError } = await supabase
          .from('companies')
          .select('*')
          .limit(1);
        
        if (readError) {
          console.error('❌ Cannot read from companies table:', readError);
        } else {
          console.log('✅ Can read from companies table');
          console.log('Current data:', readData);
        }
        
        return;
      }
      
      console.log('✅ Alternative insert worked!');
      console.log('Data:', insertData);
      return;
    }
    
    console.log('✅ Raw SQL worked!');
    console.log('Data:', data);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testRawSQL().catch(console.error);
