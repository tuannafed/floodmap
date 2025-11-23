// Check Supabase setup status
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Checking Supabase Setup...\n')

// Check env vars
console.log('📋 Step 1: Environment Variables')
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.log('\n💡 Add to .env.local:')
  console.log('   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co')
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key')
  process.exit(1)
}
console.log('✅ NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl.substring(0, 30) + '...')
console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey.substring(0, 20) + '...')
if (supabaseServiceKey) {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey.substring(0, 20) + '...')
} else {
  console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY: Not set (optional for basic operations)')
}
console.log('')

// Test connection
async function checkSetup() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    console.log('📋 Step 2: Database Connection')
    // Try to query a system table to test connection
    const { error: connError } = await supabase.from('sos_reports').select('id').limit(0)
    
    if (connError) {
      if (connError.message.includes('Could not find the table') || 
          connError.message.includes('does not exist') ||
          connError.message.includes('schema cache')) {
        console.log('❌ Table "sos_reports" does not exist')
        console.log('\n💡 Solution: Run SQL migrations in Supabase Dashboard')
        console.log('   1. Open Supabase Dashboard → SQL Editor')
        console.log('   2. Copy content from: supabase/migrations/001_create_sos_reports.sql')
        console.log('   3. Paste and click "Run"')
        console.log('   4. Repeat for: supabase/migrations/002_create_storage_bucket.sql')
        return false
      } else if (connError.message.includes('Invalid API key')) {
        console.log('❌ Invalid API key')
        console.log('\n💡 Solution: Check your keys in .env.local')
        console.log('   Get keys from: Supabase Dashboard → Settings → API')
        return false
      } else {
        console.log('❌ Connection error:', connError.message)
        return false
      }
    }
    console.log('✅ Database connection successful')
    console.log('✅ Table "sos_reports" exists\n')

    // Check storage
    console.log('📋 Step 3: Storage Bucket')
    if (supabaseServiceKey) {
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
      const { data: buckets, error: bucketError } = await serviceClient.storage.listBuckets()

      if (bucketError) {
        console.log('⚠️  Cannot check buckets:', bucketError.message)
      } else {
        const sosBucket = buckets?.find((b) => b.name === 'sos-images')
        if (sosBucket) {
          console.log('✅ Storage bucket "sos-images" exists')
        } else {
          console.log('⚠️  Storage bucket "sos-images" not found')
          console.log('\n💡 Solution: Create bucket in Supabase Dashboard')
          console.log('   1. Open Supabase Dashboard → Storage')
          console.log('   2. Click "New bucket"')
          console.log('   3. Name: sos-images')
          console.log('   4. Public: true')
          console.log('   5. Click "Create"')
        }
      }
    } else {
      console.log('⏭️  Skipped (no SERVICE_ROLE_KEY)')
    }
    console.log('')

    console.log('🎉 Setup check complete!')
    console.log('\n✅ Ready to use:')
    console.log('   - Run: pnpm dev')
    console.log('   - Open: http://localhost:3000')
    return true
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

checkSetup()
  .then((success) => {
    if (!success) {
      console.log('\n📚 See QUICK_START.md for detailed instructions')
    }
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

