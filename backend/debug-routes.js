#!/usr/bin/env node

// Quick script to test if routes are working
import axios from 'axios'

const BASE_URL = process.env.BASE_URL || 'https://cashpot-backend.onrender.com'

const testEndpoints = [
  '/api/promotions',
  '/api/tasks',
  '/api/messages',
  '/api/notifications',
  '/api/cyber/slots',
  '/api/cyber/locations',
  '/api/cyber/machine-audit-summaries'
]

console.log('🔍 Testing endpoints on:', BASE_URL)
console.log('=' .repeat(60))

async function testRoute(endpoint) {
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      timeout: 5000,
      validateStatus: () => true // Accept any status
    })
    
    const status = response.status
    const emoji = status === 200 ? '✅' : status === 404 ? '❌' : '⚠️'
    console.log(`${emoji} ${endpoint} - Status: ${status}`)
    
    if (status === 200) {
      const dataLength = Array.isArray(response.data) ? response.data.length : 'N/A'
      console.log(`   📊 Data: ${dataLength} items`)
    }
  } catch (error) {
    console.log(`❌ ${endpoint} - Error: ${error.message}`)
  }
}

async function runTests() {
  for (const endpoint of testEndpoints) {
    await testRoute(endpoint)
  }
  console.log('=' .repeat(60))
  console.log('✅ Testing complete!')
}

runTests()

