import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const API_URL = process.env.VITE_API_URL || 'http://localhost:5001'

async function warmupMonthlyPLCache() {
    console.log('🔥 Warming up monthly P&L cache...\n')

    try {
        // You need a valid auth token - get it from your browser's localStorage or login
        const token = process.env.AUTH_TOKEN

        if (!token) {
            console.error('❌ AUTH_TOKEN not set in .env file')
            console.log('💡 To get a token:')
            console.log('   1. Login to the app in your browser')
            console.log('   2. Open DevTools Console')
            console.log('   3. Run: localStorage.getItem("token")')
            console.log('   4. Add AUTH_TOKEN=<your-token> to backend/.env')
            process.exit(1)
        }

        console.log('📡 Calling /api/incasari/monthly-by-location...')
        const startTime = Date.now()

        const response = await axios.get(`${API_URL}/api/incasari/monthly-by-location`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            timeout: 180000 // 3 minutes
        })

        const duration = ((Date.now() - startTime) / 1000).toFixed(2)

        if (response.data?.success) {
            const rowCount = response.data.rows?.length || 0
            console.log(`✅ Cache warmed successfully in ${duration}s`)
            console.log(`📊 Loaded ${rowCount} month-location records`)
            console.log(`💾 Data is now cached for 1 hour`)

            // Show some stats
            const years = new Set(response.data.rows.map(r => r.year))
            const locations = new Set(response.data.rows.map(r => r.location_id))
            console.log(`\n📈 Coverage:`)
            console.log(`   Years: ${Array.from(years).sort().join(', ')}`)
            console.log(`   Locations: ${locations.size}`)
        } else {
            console.error('❌ Unexpected response:', response.data)
        }

    } catch (error) {
        console.error('❌ Error warming cache:', error.message)
        if (error.response) {
            console.error('Response status:', error.response.status)
            console.error('Response data:', error.response.data)
        }
        process.exit(1)
    }
}

warmupMonthlyPLCache()
