import express from 'express'
import axios from 'axios'
import { load } from 'cheerio'

const router = express.Router()

const BASE_URL = 'https://registru.onjn.gov.ro'
const LIST_PATH = '/mijloace-de-joc/1'

const http = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7'
  }
})

function normalizeText(t) {
  return (t || '').replace(/\s+/g, ' ').trim()
}

// GET /api/onjn/class1/by-city/:city
// Fetch all Class 1 gaming machines in a specific city
router.get('/by-city/:city', async (req, res) => {
  try {
    const { city } = req.params
    
    if (!city) {
      return res.status(400).json({ success: false, error: 'City parameter is required' })
    }

    // Scrape ONJN Class 1 filtered by city
    const params = new URLSearchParams()
    params.set('city', city)
    params.set('page', '1')

    const url = `${BASE_URL}${LIST_PATH}?${params}`
    const response = await http.get(url)
    const $ = load(response.data)

    // Parse table rows
    const locations = new Map() // Group by address to get unique locations

    $('table tbody tr').each((_, row) => {
      const cells = $(row).find('td')
      if (cells.length < 6) return

      const address = normalizeText($(cells[2]).text()) // Adresă
      const operator = normalizeText($(cells[3]).text()) // Operator
      const slotBrand = normalizeText($(cells[1]).text()) // Tip (brand/model)

      if (!address || address === 'N/A') return

      // Group by address (location)
      if (!locations.has(address)) {
        locations.set(address, {
          address,
          operator,
          slot_count: 0,
          brands: new Set()
        })
      }

      const location = locations.get(address)
      location.slot_count++
      
      if (slotBrand && slotBrand !== 'N/A') {
        location.brands.add(slotBrand)
      }
    })

    // Convert to array and format
    const locationArray = Array.from(locations.values()).map(loc => ({
      ...loc,
      brands: Array.from(loc.brands)
    }))

    res.json({
      success: true,
      city,
      totalLocations: locationArray.length,
      locations: locationArray
    })

  } catch (error) {
    console.error('Error fetching ONJN Class 1 by city:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/onjn/class1
// Query: page, operator, county, city, status
router.get('/', async (req, res) => {
  try {
    const { page = 1, operator = '', county = '', city = '', status = '' } = req.query
    const params = new URLSearchParams()
    if (page) params.set('page', String(page))
    if (operator) params.set('operator', String(operator))
    if (county) params.set('county', String(county))
    if (city) params.set('city', String(city))
    if (status) params.set('status', String(status))

    const url = `${BASE_URL}${LIST_PATH}${params.toString() ? `?${params}` : ''}`
    const response = await http.get(url)
    const $ = load(response.data)

    // total results
    const totalText = normalizeText($('body').text()).match(/(\d[\d\.,]*) rezultate/)
    const totalResults = totalText ? parseInt(totalText[1].replace(/[\.,]/g, '')) : null

    const rows = []
    $('table tbody tr').each((_, row) => {
      const cells = $(row).find('td')
      if (cells.length < 6) return
      
      const serialCell = $(cells[0])
      const serialLink = serialCell.find('a')
      const serial = normalizeText(serialLink.text()) || normalizeText(serialCell.text())
      const detailHref = serialLink.attr('href') || ''
      const detailId = detailHref.split('/').pop()

      rows.push({
        id: detailId,
        serial,
        type: normalizeText($(cells[1]).text()),
        address: normalizeText($(cells[2]).text()),
        operator: normalizeText($(cells[3]).text()),
        license: normalizeText($(cells[4]).text()),
        status: normalizeText($(cells[5]).text()),
        link: `${BASE_URL}${detailHref.startsWith('/') ? '' : '/'}${detailHref}`
      })
    })

    const hasNext = $('a[rel="next"], a:contains("Next")').length > 0

    res.json({
      success: true,
      page: Number(page),
      totalResults,
      hasNext,
      items: rows
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/onjn/class1/:id - details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const url = `${BASE_URL}/e/${id}`
    const response = await http.get(url)
    const $ = load(response.data)

    const details = {}
    
    $('dl, table').each((_, el) => {
      const isTable = el.tagName?.toLowerCase() === 'table'
      if (isTable) {
        $(el).find('tr').each((__, tr) => {
          const tds = $(tr).find('td')
          if (tds.length === 2) {
            const key = normalizeText($(tds[0]).text()).replace(/:$/, '')
            const value = normalizeText($(tds[1]).text())
            if (key) details[key] = value
          }
        })
      } else {
        $(el).find('dt').each((__, dt) => {
          const key = normalizeText($(dt).text()).replace(/:$/, '')
          const dd = $(dt).next('dd')
          const value = normalizeText(dd.text())
          if (key) details[key] = value
        })
      }
    })

    res.json({
      success: true,
      id,
      details,
      url
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router

