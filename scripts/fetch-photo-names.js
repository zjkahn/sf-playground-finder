#!/usr/bin/env node
/**
 * fetch-photo-names.js
 *
 * Standalone script — fetches the top Google Places photo reference (photoName)
 * for each park that has a placeId in enriched.json. Stores photoName back into
 * enriched.json for use at runtime.
 *
 * Run: GOOGLE_MAPS_KEY=your_key bun run scripts/fetch-photo-names.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const GOOGLE_KEY = process.env.GOOGLE_MAPS_KEY
if (!GOOGLE_KEY) {
  console.error('Error: GOOGLE_MAPS_KEY env var is required')
  process.exit(1)
}

const enrichedPath = join(__dirname, '../src/data/enriched.json')
const enriched = JSON.parse(readFileSync(enrichedPath, 'utf8'))

const entries = Object.entries(enriched).filter(([, v]) => v.placeId)
console.log(`Found ${entries.length} parks with placeIds. Fetching photo names…\n`)

let fetched = 0
let skipped = 0
let failed = 0

for (const [id, data] of entries) {
  // Skip if we already have a photoName
  if (data.photoName) {
    skipped++
    continue
  }

  const url = `https://places.googleapis.com/v1/places/${data.placeId}`
  try {
    const res = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': GOOGLE_KEY,
        'X-Goog-FieldMask': 'photos',
        'Referer': 'https://zjkahn.github.io/',
      },
    })

    if (!res.ok) {
      const text = await res.text()
      console.log(`[${id}] HTTP ${res.status}: ${text.slice(0, 100)}`)
      failed++
      continue
    }

    const place = await res.json()
    const photoName = place.photos?.[0]?.name

    if (photoName) {
      enriched[id].photoName = photoName
      fetched++
      process.stdout.write(`[${id}] ✓ ${photoName.slice(-30)}\n`)
    } else {
      process.stdout.write(`[${id}] no photos\n`)
      failed++
    }

    // Small delay to be kind to the API
    await new Promise(r => setTimeout(r, 50))
  } catch (err) {
    console.log(`[${id}] Error: ${err.message}`)
    failed++
  }
}

writeFileSync(enrichedPath, JSON.stringify(enriched, null, 2))
console.log(`\nDone! Fetched: ${fetched}, Already had: ${skipped}, Failed/no photo: ${failed}`)
console.log(`Output: ${enrichedPath}`)
