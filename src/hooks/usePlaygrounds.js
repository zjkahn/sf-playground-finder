import { useState, useEffect } from 'react'

// SF Recreation & Park Properties dataset
const API_URL = 'https://data.sfgov.org/resource/gtr9-ntp6.json?$limit=500'

const PARK_TYPES = new Set(['playground', 'mini park', 'neighborhood park', 'tot lot', 'rec center'])

function parsePG(raw) {
  const lat = parseFloat(raw.latitude)
  const lng = parseFloat(raw.longitude)

  // Derive amenity hints from property type and name text
  const nameType = ((raw.property_name || '') + ' ' + (raw.propertytype || '')).toLowerCase()
  const toddlerFriendly = /playground|tot.?lot|toddler/i.test(nameType)

  return {
    id: String(raw.objectid || raw.property_id || Math.random()),
    name: raw.property_name || 'Unnamed Park',
    address: [raw.address, raw.zipcode].filter(Boolean).join(', ') || 'San Francisco, CA',
    neighborhood: raw.planning_neighborhood || raw.supdist || '',
    propertyType: raw.propertytype || '',
    lat: isNaN(lat) ? null : lat,
    lng: isNaN(lng) ? null : lng,
    // This dataset doesn't expose amenity flags directly — default false
    hasRestrooms: false,
    hasParking: false,
    hasPicnicTables: false,
    toddlerFriendly,
    rawAmenities: raw,
  }
}

export function usePlaygrounds() {
  const [playgrounds, setPlaygrounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(API_URL)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        const parsed = data
          .map(parsePG)
          .filter(p => p.lat !== null && p.lng !== null)
          .filter(p => PARK_TYPES.has((p.propertyType || '').toLowerCase()))
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
