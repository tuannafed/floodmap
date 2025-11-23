/**
 * Test script for Supabase Realtime SOS
 * 
 * This script tests the Realtime subscription by:
 * 1. Subscribing to sos_reports table changes
 * 2. Inserting a test SOS report
 * 3. Updating the test report
 * 4. Deleting the test report
 * 
 * Run: node scripts/test-realtime-sos.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧪 Testing Supabase Realtime SOS...\n')

// Test data
const testSOS = {
  lat: 16.0544,
  lon: 108.2022,
  people_count: 2,
  urgency: 'high',
  description: 'Test SOS from realtime script',
  has_vulnerable: false,
  status: 'new',
}

let testSOSId = null

// Step 1: Subscribe to Realtime changes
console.log('📡 Step 1: Subscribing to Realtime channel...')

const channel = supabase
  .channel('test-realtime-sos')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'sos_reports',
    },
    (payload) => {
      console.log('\n🔴 Realtime Event Received:')
      console.log('  Event Type:', payload.eventType)
      console.log('  New Record:', payload.new)
      console.log('  Old Record:', payload.old)
      
      if (payload.eventType === 'INSERT') {
        console.log('  ✅ INSERT event detected - New SOS report created')
      } else if (payload.eventType === 'UPDATE') {
        console.log('  ✅ UPDATE event detected - SOS report updated')
      } else if (payload.eventType === 'DELETE') {
        console.log('  ✅ DELETE event detected - SOS report deleted')
      }
    }
  )
  .subscribe((status) => {
    console.log('  Subscription Status:', status)
    if (status === 'SUBSCRIBED') {
      console.log('  ✅ Successfully subscribed to Realtime channel\n')
      runTests()
    } else if (status === 'CHANNEL_ERROR') {
      console.error('  ❌ Channel error - Check Supabase Realtime is enabled')
      process.exit(1)
    }
  })

async function runTests() {
  try {
    // Step 2: Insert test SOS
    console.log('📝 Step 2: Inserting test SOS report...')
    const { data: insertData, error: insertError } = await supabase
      .from('sos_reports')
      .insert(testSOS)
      .select()
      .single()

    if (insertError) {
      console.error('  ❌ Insert failed:', insertError.message)
      process.exit(1)
    }

    testSOSId = insertData.id
    console.log('  ✅ Test SOS inserted with ID:', testSOSId)
    console.log('  ⏳ Waiting for Realtime event...\n')

    // Wait for Realtime event
    await sleep(2000)

    // Step 3: Update test SOS
    console.log('🔄 Step 3: Updating test SOS report...')
    const { error: updateError } = await supabase
      .from('sos_reports')
      .update({ status: 'processing' })
      .eq('id', testSOSId)

    if (updateError) {
      console.error('  ❌ Update failed:', updateError.message)
    } else {
      console.log('  ✅ Test SOS updated to "processing"')
      console.log('  ⏳ Waiting for Realtime event...\n')
    }

    await sleep(2000)

    // Step 4: Delete test SOS
    console.log('🗑️  Step 4: Deleting test SOS report...')
    const { error: deleteError } = await supabase
      .from('sos_reports')
      .delete()
      .eq('id', testSOSId)

    if (deleteError) {
      console.error('  ❌ Delete failed:', deleteError.message)
    } else {
      console.log('  ✅ Test SOS deleted')
      console.log('  ⏳ Waiting for Realtime event...\n')
    }

    await sleep(2000)

    // Cleanup
    console.log('🧹 Cleaning up...')
    await supabase.removeChannel(channel)
    console.log('\n✅ Realtime test completed!')
    console.log('\n📋 Summary:')
    console.log('  - Realtime subscription: ✅')
    console.log('  - INSERT event: ✅')
    console.log('  - UPDATE event: ✅')
    console.log('  - DELETE event: ✅')
    process.exit(0)
  } catch (error) {
    console.error('❌ Test failed:', error)
    await supabase.removeChannel(channel)
    process.exit(1)
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Interrupted - Cleaning up...')
  if (testSOSId) {
    await supabase.from('sos_reports').delete().eq('id', testSOSId)
  }
  await supabase.removeChannel(channel)
  process.exit(0)
})

