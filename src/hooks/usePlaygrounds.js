import { useState, useEffect } from 'react'
import enriched from '../data/enriched.json'
import extraParks from '../data/extra-parks.json'

const PARKS_URL      = 'https://data.sfgov.org/resource/gtr9-ntp6.json?$limit=500'
const FACILITIES_URL = 'https://data.sfgov.org/resource/ib5c-xgwu.json?$limit=5000&$select=property_id,facility_type'

const PARK_TYPES = new Set(['neighborhood park or playground', 'mini park', 'regional park'])

// Human-readable names for Golden Gate Park sections (keyed by property_id)
const GGP_NAMES = {
  '756665': 'Panhandle Playground',
  '756666': '9th & Fulton Playground',
  '756668': 'Mothers Meadow Playground',
  '756670': 'Boat Children\'s Play Area',
  '957231': 'Koret Children\'s Quarter',
}

// Map facility_type values → amenity flags
const TODDLER_TYPES  = new Set(['children\'s play area', 'childrens play area', 'nature exploration area'])
const RESTROOM_TYPES = new Set(['restroom'])
const PARKING_TYPES  = new Set(['parking lot'])
const PICNIC_TYPES   = new Set(['picnic area'])

function buildAmenityMap(facilities) {
  const map = {}
  for (const { property_id, facility_type } of facilities) {
    if (!property_id || !facility_type) continue
    if (!map[property_id]) map[property_id] = { toddlerFriendly: false, hasRestrooms: false, hasParking: false, hasPicnicTables: false }
    const t = facility_type.toLowerCase()
    if (TODDLER_TYPES.has(t))  map[property_id].toddlerFriendly = true
    if (RESTROOM_TYPES.has(t)) map[property_id].hasRestrooms    = true
    if (PARKING_TYPES.has(t))  map[property_id].hasParking      = true
    if (PICNIC_TYPES.has(t))   map[property_id].hasPicnicTables = true
  }
  return map
}

function parsePG(raw, amenities) {
  const lat = parseFloat(raw.latitude)
  const lng = parseFloat(raw.longitude)
  const a = amenities[raw.property_id] || {}
  const id = String(raw.objectid || raw.property_id || Math.random())
  const e = enriched[id] || {}
  return {
    id,
    name: GGP_NAMES[raw.property_id] || raw.property_name || 'Unnamed Park',
    address: [raw.address, raw.zipcode].filter(Boolean).join(', ') || 'San Francisco, CA',
    neighborhood: raw.planning_neighborhood || '',
    propertyType: raw.propertytype || '',
    lat: isNaN(lat) ? null : lat,
    lng: isNaN(lng) ? null : lng,
    toddlerFriendly: a.toddlerFriendly  || false,
    hasRestrooms:    a.hasRestrooms     || false,
    hasParking:      a.hasParking       || false,
    hasPicnicTables: a.hasPicnicTables  || false,
    rawAmenities: raw,
    // Enriched from Google Places reviews
    ageRange:      e.ageRange      ?? [],
    shade:         e.shade         ?? null,
    equipment:     e.equipment     ?? [],
    crowdPatterns: e.crowdPatterns ?? '',
    googleRating:  e.googleRating  ?? null,
    reviewCount:   e.reviewCount   ?? 0,
  }
}

export function usePlaygrounds() {
  const [playgrounds, setPlaygrounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch(PARKS_URL).then(r => { if (!r.ok) throw new Error(`Parks API: HTTP ${r.status}`); return r.json() }),
      fetch(FACILITIES_URL).then(r => { if (!r.ok) throw new Error(`Facilities API: HTTP ${r.status}`); return r.json() }),
    ])
      .then(([parks, facilities]) => {
        const amenityMap = buildAmenityMap(facilities)
        const parsed = parks
          .map(raw => parsePG(raw, amenityMap))
          .filter(p => p.lat !== null && p.lng !== null)
          .filter(p => PARK_TYPES.has(p.propertyType.toLowerCase()))
          .filter(p => p.toddlerFriendly)

        // Merge in supplemental parks not in SF Open Data
        const extras = extraParks.map(p => {
          const e = enriched[p.id] || {}
          return {
            ...p,
            propertyType: 'neighborhood park or playground',
            toddlerFriendly: true,
            hasRestrooms: false,
            hasParking: false,
            hasPicnicTables: false,
            ageRange:      e.ageRange      ?? [],
            shade:         e.shade         ?? null,
            equipment:     e.equipment     ?? [],
            crowdPatterns: e.crowdPatterns ?? '',
            googleRating:  e.googleRating  ?? null,
            reviewCount:   e.reviewCount   ?? 0,
          }
        })

        setPlaygrounds([...parsed, ...extras])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { playgrounds, loading, error }
}
