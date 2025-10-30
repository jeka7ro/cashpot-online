import express from 'express'
import axios from 'axios'
import { load } from 'cheerio'

const router = express.Router()

const BASE_URL = 'https://registru.onjn.gov.ro'
const LIST_PATH = '/mijloace-de-joc/2'

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

// GET /api/onjn/class2
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

    // total results (e.g., "45187 rezultate.")
    const totalText = normalizeText($('body').text()).match(/(\d[\d\.,]*) rezultate/)
    const totalResults = totalText ? parseInt(totalText[1].replace(/[\.,]/g, '')) : null

    const rows = []
    $('table tbody tr').each((_, row) => {
      const cells = $(row).find('td')
      if (cells.length < 8) return
      const serialCell = $(cells[0])
      const serialLink = serialCell.find('a')
      const serial = normalizeText(serialLink.text()) || normalizeText(serialCell.text())
      const detailHref = serialLink.attr('href') || ''
      const detailId = detailHref.split('/').pop()
      // Deduplicate operator text that sometimes appears twice in the same cell
      const rawOperator = normalizeText($(cells[3]).text())
      const operator = rawOperator.split(/\s{2,}/)[0] || rawOperator

      rows.push({
        id: detailId,
        serial,
        type: normalizeText($(cells[1]).text()),
        address: normalizeText($(cells[2]).text()),
        operator,
        license: normalizeText($(cells[4]).text()),
        status: normalizeText($(cells[5]).text()),
        transfer: normalizeText($(cells[6]).text()),
        link: `${BASE_URL}${detailHref.startsWith('/') ? '' : '/'}${detailHref}`
      })
    })

    // pagination: detect next link
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

// GET /api/onjn/class2/:id - details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const url = `${BASE_URL}/e/${id}`
    const response = await http.get(url)
    const $ = load(response.data)

    // Extract key-value details from definition lists or tables
    const details = {}
    $('dl, table').each((_, el) => {
      const isTable = el.tagName?.toLowerCase() === 'table'
      if (isTable) {
        // two-column table
        $(el).find('tr').each((__, tr) => {
          const tds = $(tr).find('td')
          if (tds.length === 2) {
            const key = normalizeText($(tds[0]).text())
            const val = normalizeText($(tds[1]).text())
            if (key) details[key] = val
          }
        })
      } else {
        // definition list
        const terms = $(el).find('dt')
        const defs = $(el).find('dd')
        if (terms.length && defs.length && terms.length === defs.length) {
          terms.each((i, dt) => {
            const key = normalizeText($(dt).text())
            const val = normalizeText($(defs[i]).text())
            if (key) details[key] = val
          })
        }
      }
    })

    // Title/heading if available
    const title = normalizeText($('h1, h2').first().text())

    res.json({ success: true, id, title, details, source: url })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router


