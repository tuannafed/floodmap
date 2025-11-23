// Simple API test script
const http = require('http')

const PORT = process.env.PORT || 3000
const BASE_URL = `http://localhost:${PORT}`

console.log('🧪 Testing API endpoints...\n')

async function testEndpoint(name, path) {
  return new Promise((resolve) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (res.statusCode === 200) {
            console.log(`✅ ${name}: OK`)
            if (json.reports) {
              console.log(`   Found ${json.reports.length} SOS reports`)
            }
            resolve(true)
          } else {
            console.log(`❌ ${name}: Status ${res.statusCode}`)
            console.log(`   Error: ${json.error || data}`)
            resolve(false)
          }
        } catch (e) {
          console.log(`⚠️  ${name}: Invalid JSON response`)
          resolve(false)
        }
      })
    }).on('error', (err) => {
      console.log(`❌ ${name}: Connection failed`)
      console.log(`   Make sure dev server is running: pnpm dev`)
      resolve(false)
    })
  })
}

async function runTests() {
  console.log(`Testing against: ${BASE_URL}\n`)

  await testEndpoint('GET /api/sos/report', '/api/sos/report')

  console.log('\n💡 To test POST, submit a SOS report from the UI')
  console.log('💡 Make sure Supabase is configured correctly')
}

runTests()

