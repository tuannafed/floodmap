/**
 * Test script for Supabase Realtime SOS (ESM version)
 * 
 * Run: node scripts/test-realtime-sos.mjs
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

try {
  const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8')
  envFile.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
} catch (err) {
  console.warn('⚠️  Could not read .env.local, using process.env')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
  console.error('\nPlease check your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧪 Testing Supabase Realtime SOS...\n')
console.log('📡 Supabase URL:', supabaseUrl.substring(0, 30) + '...')
console.log('🔑 Using ANON key:', supabaseKey.substring(0, 20) + '...\n')

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
let eventsReceived = {
  INSERT: false,
  UPDATE: false,
  DELETE: false,
}

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
      console.log('  New Record:', payload.new ? JSON.stringify(payload.new, null, 2) : null)
      console.log('  Old Record:', payload.old ? JSON.stringify(payload.old, null, 2) : null)
      
      if (payload.eventType === 'INSERT') {
        eventsReceived.INSERT = true
        console.log('  ✅ INSERT event detected - New SOS report created')
      } else if (payload.eventType === 'UPDATE') {
        eventsReceived.UPDATE = true
        console.log('  ✅ UPDATE event detected - SOS report updated')
      } else if (payload.eventType === 'DELETE') {
        eventsReceived.DELETE = true
        console.log('  ✅ DELETE event detected - SOS report deleted')
      }
    }
  )
  .subscribe((status) => {
    console.log('  Subscription Status:', status)
    if (status === 'SUBSCRIBED') {
      console.log('  ✅ Successfully subscribed to Realtime channel\n')
      setTimeout(() => runTests(), 1000)
    } else if (status === 'CHANNEL_ERROR') {
      console.error('  ❌ Channel error - Check Supabase Realtime is enabled')
      console.error('  💡 Make sure Realtime is enabled in Supabase Dashboard:')
      console.error('     Database → Replication → Enable for sos_reports table')
      process.exit(1)
    } else if (status === 'TIMED_OUT') {
      console.error('  ❌ Subscription timed out')
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
      console.error('  Details:', insertError)
      await cleanup()
      process.exit(1)
    }

    testSOSId = insertData.id
    console.log('  ✅ Test SOS inserted with ID:', testSOSId)
    console.log('  ⏳ Waiting for Realtime event (2s)...\n')

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
      console.log('  ⏳ Waiting for Realtime event (2s)...\n')
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
      console.log('  ⏳ Waiting for Realtime event (2s)...\n')
    }

    await sleep(2000)

    // Summary
    console.log('\n📋 Test Summary:')
    console.log('  - Realtime subscription: ✅')
    console.log('  - INSERT event:', eventsReceived.INSERT ? '✅' : '❌')
    console.log('  - UPDATE event:', eventsReceived.UPDATE ? '✅' : '❌')
    console.log('  - DELETE event:', eventsReceived.DELETE ? '✅' : '❌')

    const allPassed = Object.values(eventsReceived).every((v) => v === true)
    
    if (allPassed) {
      console.log('\n✅ All Realtime tests passed!')
    } else {
      console.log('\n⚠️  Some events were not received')
      console.log('💡 Make sure Realtime is enabled in Supabase Dashboard')
    }

    await cleanup()
    process.exit(allPassed ? 0 : 1)
  } catch (error) {
    console.error('❌ Test failed:', error)
    await cleanup()
    process.exit(1)
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up...')
  if (testSOSId) {
    try {
      await supabase.from('sos_reports').delete().eq('id', testSOSId)
      console.log('  ✅ Test SOS cleaned up')
    } catch (err) {
      console.log('  ⚠️  Could not clean up test SOS:', err.message)
    }
  }
  try {
    await supabase.removeChannel(channel)
    console.log('  ✅ Channel removed')
  } catch (err) {
    console.log('  ⚠️  Could not remove channel:', err.message)
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Interrupted - Cleaning up...')
  await cleanup()
  process.exit(0)
})

