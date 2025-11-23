// Test Supabase connection locally
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Testing Supabase Connection...\n')

// Check env vars
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.log('Required:')
  console.log('  - NEXT_PUBLIC_SUPABASE_URL')
  console.log('  - NEXT_PUBLIC_SUPABASE_ANON_KEY')
  console.log('  - SUPABASE_SERVICE_ROLE_KEY (optional for this test)')
  process.exit(1)
}

console.log('✅ Environment variables found')
console.log(`   URL: ${supabaseUrl.substring(0, 30)}...`)
console.log(`   Anon Key: ${supabaseAnonKey.substring(0, 20)}...\n`)

// Test connection
async function testConnection() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Test 1: Check if table exists
    console.log('📊 Test 1: Checking sos_reports table...')
    const { data: tables, error: tableError } = await supabase
      .from('sos_reports')
      .select('id')
      .limit(1)

    if (tableError) {
      console.error('❌ Table check failed:', tableError.message)
      if (tableError.message.includes('relation') || tableError.message.includes('does not exist')) {
        console.log('\n💡 Tip: Run SQL migrations in Supabase Dashboard:')
        console.log('   - supabase/migrations/001_create_sos_reports.sql')
        console.log('   - supabase/migrations/002_create_storage_bucket.sql')
      }
      return false
    }
    console.log('✅ Table exists and accessible\n')

    // Test 2: Test insert (with cleanup)
    console.log('📝 Test 2: Testing insert...')
    const testReport = {
      id: `test-${Date.now()}`,
      lat: 16.0544,
      lon: 108.2022,
      people_count: 1,
      urgency: 'low',
      description: 'Test report - will be deleted',
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

    // Test 3: Test select
    console.log('📖 Test 3: Testing select...')
    const { data: reports, error: selectError } = await supabase
      .from('sos_reports')
      .select('*')
      .eq('id', testReport.id)
      .single()

    if (selectError) {
      console.error('❌ Select failed:', selectError.message)
      return false
    }
    console.log('✅ Select successful')
    console.log(`   Found: ${reports.id}\n`)

    // Test 4: Cleanup test data
    console.log('🧹 Test 4: Cleaning up test data...')
    const { error: deleteError } = await supabase
      .from('sos_reports')
      .delete()
      .eq('id', testReport.id)

    if (deleteError) {
      console.warn('⚠️  Cleanup failed (non-critical):', deleteError.message)
    } else {
      console.log('✅ Cleanup successful\n')
    }

    // Test 5: Test storage bucket (if service key available)
    if (supabaseServiceKey) {
      console.log('🪣 Test 5: Testing storage bucket...')
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
      const { data: buckets, error: bucketError } = await serviceClient.storage.listBuckets()

      if (bucketError) {
        console.warn('⚠️  Storage check failed:', bucketError.message)
      } else {
        const sosBucket = buckets?.find((b) => b.name === 'sos-images')
        if (sosBucket) {
          console.log('✅ Storage bucket "sos-images" exists\n')
        } else {
          console.log('⚠️  Storage bucket "sos-images" not found')
          console.log('💡 Tip: Create bucket in Supabase Dashboard > Storage\n')
        }
      }
    } else {
      console.log('⏭️  Test 5: Skipped (no SERVICE_ROLE_KEY)\n')
    }

    console.log('🎉 All tests passed! Supabase is configured correctly.')
    return true
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

