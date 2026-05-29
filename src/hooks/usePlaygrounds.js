import { useState, useEffect } from 'react'

const PARKS_URL      = 'https://data.sfgov.org/resource/gtr9-ntp6.json?$limit=500'
const FACILITIES_URL = 'https://data.sfgov.org/resource/ib5c-xgwu.json?$limit=5000&$select=property_id,facility_type'

const PARK_TYPES = new Set(['neighborhood park or playground', 'mini park', 'regional park'])

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
  return {
    id: String(raw.objectid || raw.property_id || Math.random()),
    name: raw.property_name || 'Unnamed Park',
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
        setPlaygrounds(parsed)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { playgrounds, loading, error }
}
