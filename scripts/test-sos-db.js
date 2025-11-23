// Test SOS database operations
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🧪 Testing SOS Database Operations...\n')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testSOS() {
  try {
    // Test 1: Insert SOS report
    console.log('📝 Test 1: Inserting SOS report...')
    const testReport = {
      id: `test-${Date.now()}`,
      lat: 16.0544,
      lon: 108.2022,
      people_count: 1,
      urgency: 'high',
      description: 'Test SOS report from script',
      has_vulnerable: false,
      status: 'new',
      created_at: Date.now(),
      updated_at: Date.now(),
    }

    const { data: inserted, error: insertError } = await supabase
      .from('sos_reports')
      .insert(testReport)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Insert failed:', insertError.message)
      return false
    }
    console.log('✅ Insert successful')
    console.log(`   ID: ${inserted.id}\n`)

    // Test 2: Read SOS reports
    console.log('📖 Test 2: Reading SOS reports...')
    const { data: reports, error: readError } = await supabase
      .from('sos_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (readError) {
      console.error('❌ Read failed:', readError.message)
      return false
    }
    console.log(`✅ Read successful: Found ${reports?.length || 0} reports`)
    if (reports && reports.length > 0) {
      console.log(`   Latest: ${reports[0].id} (${reports[0].urgency})`)
    }
    console.log('')

    // Test 3: Cleanup test data
    console.log('🧹 Test 3: Cleaning up test data...')
    const { error: deleteError } = await supabase
      .from('sos_reports')
      .delete()
      .eq('id', testReport.id)

    if (deleteError) {
      console.warn('⚠️  Cleanup failed (non-critical):', deleteError.message)
    } else {
      console.log('✅ Cleanup successful\n')
    }

    console.log('🎉 All tests passed! SOS feature is using Supabase database ✅')
    return true
  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

testSOS()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

