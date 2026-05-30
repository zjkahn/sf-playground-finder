#!/usr/bin/env node
/**
 * enrich-playgrounds.js
 *
 * One-time build script — uses Apify's Google Maps Scraper to fetch reviews
 * for all 131 SF playgrounds, then extracts structured data via keyword matching.
 *
 * Run: APIFY_TOKEN=your_token bun run scripts/enrich-playgrounds.js
 *
 * Output: src/data/enriched.json
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const APIFY_TOKEN = process.env.APIFY_TOKEN
if (!APIFY_TOKEN) {
  console.error('Error: APIFY_TOKEN env var is required')
  process.exit(1)
}

// ── SF Open Data ─────────────────────────────────────────────────────────────

const PARKS_URL      = 'https://data.sfgov.org/resource/gtr9-ntp6.json?$limit=500'
const FACILITIES_URL = 'https://data.sfgov.org/resource/ib5c-xgwu.json?$limit=5000&$select=property_id,facility_type'
const PARK_TYPES     = new Set(['neighborhood park or playground', 'mini park', 'regional park'])
const TODDLER_TYPES  = new Set(["children's play area", 'childrens play area', 'nature exploration area'])

async function fetchPlaygrounds() {
  console.log('Fetching SF parks data…')
  const [parks, facilities] = await Promise.all([
    fetch(PARKS_URL).then(r => r.json()),
    fetch(FACILITIES_URL).then(r => r.json()),
  ])
  const amenityMap = {}
  for (const { property_id, facility_type } of facilities) {
    if (!property_id || !facility_type) continue
    if (!amenityMap[property_id]) amenityMap[property_id] = { toddlerFriendly: false }
    if (TODDLER_TYPES.has(facility_type.toLowerCase())) amenityMap[property_id].toddlerFriendly = true
  }
  return parks
    .map(raw => ({
      id: String(raw.objectid || raw.property_id),
      name: raw.property_name || 'Unnamed Park',
      propertyType: raw.propertytype || '',
      lat: parseFloat(raw.latitude),
      lng: parseFloat(raw.longitude),
      toddlerFriendly: amenityMap[raw.property_id]?.toddlerFriendly || false,
    }))
    .filter(p => !isNaN(p.lat) && !isNaN(p.lng))
    .filter(p => PARK_TYPES.has(p.propertyType.toLowerCase()))
    .filter(p => p.toddlerFriendly)
}

// ── Apify ─────────────────────────────────────────────────────────────────────

const APIFY_BASE = 'https://api.apify.com/v2'
const ACTOR_ID   = 'compass~crawler-google-places'

async function runApifyScraper(startUrls) {
  console.log(`\nStarting Apify run for ${startUrls.length} playgrounds…`)

  const res = await fetch(`${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startUrls,
      maxReviews: 100,
      language: 'en',
      countryCode: 'us',
      reviewsSort: 'newest',
      scrapeReviewerName: false,
      scrapeReviewerUrl: false,
    }),
  })
  const { data } = await res.json()
  const runId = data.id
  const datasetId = data.defaultDatasetId
  console.log(`Run started: ${runId}`)

  // Poll until finished
  process.stdout.write('Waiting for Apify run to complete')
  while (true) {
    await new Promise(r => setTimeout(r, 10000))
    process.stdout.write('.')
    const statusRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`)
    const { data: run } = await statusRes.json()
    if (run.status === 'SUCCEEDED') break
    if (run.status === 'FAILED' || run.status === 'ABORTED') {
      throw new Error(`Apify run ${run.status}`)
    }
  }
  console.log(' done!\n')

  // Fetch results
  const itemsRes = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=1000&clean=true`
  )
  return itemsRes.json()
}

// ── Keyword extraction ────────────────────────────────────────────────────────

function extractFromReviews(reviews) {
  const text = (reviews || [])
    .map(r => r.text || r.textTranslated || '')
    .join(' ')
    .toLowerCase()

  if (!text.trim()) return { ageRange: [], shade: null, equipment: [], crowdPatterns: '' }

  // Age range
  const ageRange = []
  if (/toddler|infant|baby|\b[12] year|\b[12]-year|1-3 year/.test(text)) ageRange.push('toddler')
  if (/preschool|pre-school|\b[34] year|\b[34]-year|3-5 year|4-5 year/.test(text)) ageRange.push('preschool')
  if (/big kid|older kid|school.age|\b[6-9] year|\b[6-9]-year|elementary/.test(text)) ageRange.push('bigKids')

  // Shade
  const shadeHits = (text.match(/\bshad(e|ed|y)\b|cool spot|lots of trees|well.shaded/g) || []).length
  const sunnyHits = (text.match(/\bsunny\b|\bno shade\b|\bhot\b|full sun|very sunny/g) || []).length
  let shade = null
  if (shadeHits + sunnyHits >= 2) {
    if (shadeHits >= sunnyHits * 2) shade = 'mostly shaded'
    else if (sunnyHits >= shadeHits * 2) shade = 'full sun'
    else shade = 'partial'
  }

  // Equipment
  const EQUIPMENT_PATTERNS = [
    ['baby swings',        /baby swing|infant swing|bucket swing/],
    ['swings',             /\bswing/],
    ['slide',              /\bslide/],
    ['climbing structure', /climb/],
    ['sandbox',            /sandbox|sand box|sand play/],
    ['water play',         /water play|spray|splash pad|sprinkler/],
    ['zip line',           /zip.?line|zipline/],
    ['rock wall',          /rock wall|bouldering/],
    ['balance beam',       /balance beam/],
    ['seesaw',             /seesaw|see.saw|teeter/],
    ['merry-go-round',     /merry.go.round|roundabout/],
  ]
  const equipment = []
  for (const [label, pattern] of EQUIPMENT_PATTERNS) {
    if (pattern.test(text)) equipment.push(label)
  }

  // Crowd patterns
  const crowdSentences = []
  for (const s of text.split(/[.!?]+/)) {
    if (/busy|crowd|packed|quiet|empty|not busy/.test(s) && s.trim().length > 10 && s.trim().length < 120) {
      const clean = s.trim().replace(/^./, c => c.toUpperCase())
      if (clean) crowdSentences.push(clean)
      if (crowdSentences.length >= 2) break
    }
  }

  return { ageRange, shade, equipment, crowdPatterns: crowdSentences.join('. ').trim() }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const playgrounds = await fetchPlaygrounds()
  console.log(`Found ${playgrounds.length} playgrounds.`)

  // Load existing enriched.json — reuse placeIds from previous Places API run
  const existingPath = join(__dirname, '../src/data/enriched.json')
  const existing = JSON.parse(readFileSync(existingPath, 'utf8'))

  // Build start URLs: use known place IDs where available, otherwise text search
  const startUrls = playgrounds.map(pg => {
    const placeId = existing[pg.id]?.placeId
    const url = placeId
      ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
      : `https://www.google.com/maps/search/${encodeURIComponent(pg.name + ' San Francisco CA')}`
    return { url, uniqueKey: pg.id }
  })

  const placeIdsKnown = playgrounds.filter(pg => existing[pg.id]?.placeId).length
  console.log(`Using place IDs for ${placeIdsKnown}/${playgrounds.length} playgrounds, text search for the rest.`)

  const results = await runApifyScraper(startUrls)
  console.log(`Apify returned ${results.length} place results.`)

  // Build lookup by Google place ID and by input URL key
  const byPlaceId = {}
  for (const place of results) {
    if (place.placeId) byPlaceId[place.placeId] = place
  }

  // Match results back to playgrounds and extract data
  const enriched = {}
  let enrichedCount = 0

  for (const pg of playgrounds) {
    const placeId = existing[pg.id]?.placeId
    const place = placeId ? byPlaceId[placeId] : null

    if (!place) {
      // Keep existing enrichment if present
      if (existing[pg.id]) enriched[pg.id] = existing[pg.id]
      process.stdout.write(`[${pg.name}] no match\n`)
      continue
    }

    const reviewCount = place.totalScore ? place.reviewsCount || 0 : 0
    const extracted = extractFromReviews(place.reviews || [])
    const reviewsRead = (place.reviews || []).length

    enriched[pg.id] = {
      ...extracted,
      googleRating: place.totalScore ?? null,
      reviewCount: place.reviewsCount ?? 0,
      placeId: placeId || place.placeId,
    }

    const flags = [
      extracted.ageRange.join('/') || '—',
      extracted.shade || '—',
      `${extracted.equipment.length} equipment`,
      `${reviewsRead} reviews read`,
      `⭐ ${place.totalScore ?? '?'}`,
    ].join(' | ')
    console.log(`[${pg.name}] ${flags}`)
    enrichedCount++
  }

  writeFileSync(existingPath, JSON.stringify(enriched, null, 2))
  console.log(`\nDone! ${enrichedCount}/${playgrounds.length} enriched.`)
  console.log(`Output: ${existingPath}`)
}

main().catch(err => { console.error(err); process.exit(1) })
