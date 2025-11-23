// Debug Supabase key issue
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Debugging Supabase Keys...\n')

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not set')
  process.exit(1)
}

console.log('✅ NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl.substring(0, 30) + '...')

if (!anonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not set')
  process.exit(1)
}
console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY:', anonKey.substring(0, 30) + '...')

if (!serviceKey) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set, will use anon key')
} else {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY:', serviceKey.substring(0, 30) + '...')
}

console.log('')

// Test with anon key
async function testWithAnonKey() {
  console.log('🧪 Test 1: Using ANON key...')
  const supabase = createClient(supabaseUrl, anonKey)
  
  const testReport = {
    id: `test-anon-${Date.now()}`,
    lat: 16.0544,
    lon: 108.2022,
    people_count: 1,
    urgency: 'high',
    description: 'Test with anon key',
    has_vulnerable: false,
    status: 'new',
    created_at: Date.now(),
    updated_at: Date.now(),
  }

  const { data, error } = await supabase
    .from('sos_reports')
    .insert(testReport)
    .select()
    .single()

  if (error) {
    console.log('❌ Failed:', error.message)
    console.log('   Code:', error.code)
    return false
  }
  
  console.log('✅ Success with ANON key')
  console.log('   ID:', data.id)
  
  // Cleanup
  await supabase.from('sos_reports').delete().eq('id', testReport.id)
  return true
}

// Test with service key
async function testWithServiceKey() {
  if (!serviceKey) {
    console.log('⏭️  Test 2: Skipped (no SERVICE_ROLE_KEY)')
    return false
  }

  console.log('🧪 Test 2: Using SERVICE_ROLE key...')
  const supabase = createClient(supabaseUrl, serviceKey)
  
  const testReport = {
    id: `test-service-${Date.now()}`,
    lat: 16.0544,
    lon: 108.2022,
    people_count: 1,
    urgency: 'high',
    description: 'Test with service key',
    has_vulnerable: false,
    status: 'new',
    created_at: Date.now(),
    updated_at: Date.now(),
  }

  const { data, error } = await supabase
    .from('sos_reports')
    .insert(testReport)
    .select()
    .single()

  if (error) {
    console.log('❌ Failed:', error.message)
    console.log('   Code:', error.code)
    if (error.message.includes('Invalid API key')) {
      console.log('\n💡 SERVICE_ROLE_KEY có vẻ không đúng!')
      console.log('   Hãy kiểm tra lại key trong Supabase Dashboard → Settings → API')
    }
    return false
  }
  
  console.log('✅ Success with SERVICE_ROLE key')
  console.log('   ID:', data.id)
  
  // Cleanup
  await supabase.from('sos_reports').delete().eq('id', testReport.id)
  return true
}

async function runTests() {
  const anonWorks = await testWithAnonKey()
  console.log('')
  const serviceWorks = await testWithServiceKey()
  console.log('')
  
  if (anonWorks) {
    console.log('✅ Recommendation: Use ANON key (works correctly)')
  } else if (serviceWorks) {
    console.log('✅ Recommendation: Use SERVICE_ROLE key')
  } else {
    console.log('❌ Both keys failed. Check RLS policies and keys.')
  }
}

runTests().catch(console.error)

