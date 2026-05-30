const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

export function getStreetViewUrl(lat, lng, width = 600, height = 200) {
  if (!GOOGLE_KEY) return null
  return (
    `https://maps.googleapis.com/maps/api/streetview` +
    `?size=${width}x${height}&location=${lat},${lng}` +
    `&fov=90&pitch=10&key=${GOOGLE_KEY}`
  )
}

// Build a Places API photo media URL — browser follows the redirect automatically
export function getPlacesPhotoUrl(photoName, maxWidth = 800) {
  if (!photoName || !GOOGLE_KEY) return null
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_KEY}`
}

// Street View Metadata API — check if imagery actually exists at this location
const metaCache = {}

export async function checkStreetViewExists(lat, lng) {
  const key = `${lat},${lng}`
  if (metaCache[key] !== undefined) return metaCache[key]

  if (!GOOGLE_KEY) return false

  const url =
    `https://maps.googleapis.com/maps/api/streetview/metadata` +
    `?location=${lat},${lng}&key=${GOOGLE_KEY}`

  try {
    const data = await fetch(url).then(r => r.json())
    const exists = data.status === 'OK'
    metaCache[key] = exists
    return exists
  } catch {
    metaCache[key] = false
    return false
  }
}
