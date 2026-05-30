#!/usr/bin/env node
/**
 * enrich-playgrounds.js
 *
 * One-time build script — fetches Google Places reviews for every playground
 * and extracts structured data via keyword matching.
 *
 * Prerequisites:
 *   1. Enable "Places API (New)" in your Google Cloud project
 *      (same project as Street View Static API)
 *   2. Run: GOOGLE_MAPS_KEY=your_key node scripts/enrich-playgrounds.js
 *
 * Output: src/data/enriched.json
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const GOOGLE_KEY = process.env.GOOGLE_MAPS_KEY
if (!GOOGLE_KEY) {
  console.error('Error: GOOGLE_MAPS_KEY env var is required')
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

  // Build amenity map
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

// ── Places API (New) ──────────────────────────────────────────────────────────

async function searchPlace(name) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName',
    },
    body: JSON.stringify({ textQuery: `${name} playground San Francisco CA` }),
  })
  const data = await res.json()
  return data.places?.[0]?.id ?? null
}

async function fetchPlaceDetails(placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_KEY,
      'X-Goog-FieldMask': 'reviews,rating,userRatingCount',
    },
  })
  return res.json()
}

// ── Keyword extraction ────────────────────────────────────────────────────────

function extractFromReviews(reviews) {
  const text = (reviews || [])
    .map(r => r.text?.text || r.originalText?.text || '')
    .join(' ')
    .toLowerCase()

  // Age range
  const ageRange = []
  if (/toddler|infant|baby|\b[12] year|\b[12]-year|1-3 year/.test(text)) ageRange.push('toddler')
  if (/preschool|pre-school|\b[34] year|\b[34]-year|3-5 year|4-5 year/.test(text)) ageRange.push('preschool')
  if (/big kid|older kid|school.age|\b[6-9] year|\b[6-9]-year|elementary/.test(text)) ageRange.push('bigKids')

  // Shade
  const shadeHits  = (text.match(/\bshad(e|ed|y)\b|cool spot|lots of trees|well.shaded/g) || []).length
  const sunnyHits  = (text.match(/\bsunny\b|\bno shade\b|\bhot\b|full sun|very sunny/g) || []).length
  let shade = null
  if (shadeHits + sunnyHits >= 2) {
    if (shadeHits >= sunnyHits * 2) shade = 'mostly shaded'
    else if (sunnyHits >= shadeHits * 2) shade = 'full sun'
    else shade = 'partial'
  }

  // Equipment
  const EQUIPMENT_PATTERNS = [
    ['baby swings',      /baby swing|infant swing|bucket swing/],
    ['swings',           /\bswing/],
    ['slide',            /\bslide/],
    ['climbing structure', /climb/],
    ['sandbox',          /sandbox|sand box|sand play/],
    ['water play',       /water play|spray|splash pad|sprinkler/],
    ['zip line',         /zip.?line|zipline/],
    ['rock wall',        /rock wall|bouldering/],
    ['balance beam',     /balance beam/],
    ['seesaw',           /seesaw|see.saw|teeter/],
    ['merry-go-round',   /merry.go.round|roundabout/],
  ]
  const equipment = []
  for (const [label, pattern] of EQUIPMENT_PATTERNS) {
    if (pattern.test(text)) equipment.push(label)
  }

  // Crowd patterns — grab short sentences mentioning busyness
  const crowdSentences = []
  const sentences = text.split(/[.!?]+/)
  for (const s of sentences) {
    if (/busy|crowd|packed|quiet|empty|not busy/.test(s) && s.trim().length > 10 && s.trim().length < 120) {
      // Capitalise first letter
      const clean = s.trim().replace(/^./, c => c.toUpperCase())
      if (clean) crowdSentences.push(clean)
      if (crowdSentences.length >= 2) break
    }
  }
  const crowdPatterns = crowdSentences.join('. ').trim()

  return { ageRange, shade, equipment, crowdPatterns }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const playgrounds = await fetchPlaygrounds()
  console.log(`Found ${playgrounds.length} playgrounds. Fetching Places data…\n`)

  const enriched = {}
  let found = 0, notFound = 0

  for (let i = 0; i < playgrounds.length; i++) {
    const pg = playgrounds[i]
    process.stdout.write(`[${i + 1}/${playgrounds.length}] ${pg.name}… `)

    try {
      const placeId = await searchPlace(pg.name)
      if (!placeId) {
        console.log('not found in Places')
        notFound++
        continue
      }

      const details = await fetchPlaceDetails(placeId)
      const extracted = extractFromReviews(details.reviews)

      enriched[pg.id] = {
        ...extracted,
        googleRating: details.rating ?? null,
        reviewCount: details.userRatingCount ?? 0,
        placeId,
      }

      const flags = [
        extracted.ageRange.join('/') || '—',
        extracted.shade || '—',
        `${extracted.equipment.length} equipment`,
        `⭐ ${details.rating ?? '?'} (${details.userRatingCount ?? 0})`,
      ].join(' | ')
      console.log(`✓ ${flags}`)
      found++

      // Polite rate limiting — 20 req/s limit on Places API (New)
      await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      console.log(`error: ${err.message}`)
    }
  }

  const outPath = join(__dirname, '../src/data/enriched.json')
  writeFileSync(outPath, JSON.stringify(enriched, null, 2))

  console.log(`\nDone! ${found} enriched, ${notFound} not found in Places.`)
  console.log(`Output: ${outPath}`)
}

main().catch(err => { console.error(err); process.exit(1) })
