import { useState, useEffect, useRef } from 'react'

const cache = {}

async function commonsGeoImage(lat, lng) {
  // Step 1: find photos taken near the park's coordinates
  const search = await fetch(
    `https://commons.wikimedia.org/w/api.php?action=query&list=geosearch` +
    `&gsprimary=photo&gsnamespace=6&gslat=${lat}&gslon=${lng}` +
    `&gsradius=150&gslimit=5&format=json&origin=*`
  ).then(r => r.json())

  const hits = search.query?.geosearch
  if (!hits?.length) return null

  // Step 2: resolve the file title to an actual image URL
  const title = hits[0].title
  const info = await fetch(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}` +
    `&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=600&format=json&origin=*`
  ).then(r => r.json())

  const page = Object.values(info.query?.pages || {})[0]
  const imgUrl = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url
  if (!imgUrl) return null

  const credit = page?.imageinfo?.[0]?.extmetadata?.Artist?.value
    ?.replace(/<[^>]+>/g, '') // strip HTML tags
    .slice(0, 40) || 'Wikimedia Commons'

  return { src: imgUrl, caption: credit }
}

async function wikipediaImage(name) {
  const attempts = [`${name}, San Francisco`, name]
  for (const query of attempts) {
    const data = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}` +
      `&prop=pageimages&format=json&pithumbsize=600&origin=*`
    ).then(r => r.json())
    const page = Object.values(data.query?.pages || {})[0]
    if (page && !page.missing && page.thumbnail?.source) {
      return { src: page.thumbnail.source, caption: 'Wikipedia' }
    }
  }
  return null
}

export function useParkImage(parkName, lat, lng) {
  const [image, setImage] = useState(null)
  const [status, setStatus] = useState('idle')
  const prevKey = useRef(null)

  useEffect(() => {
    if (!parkName || !lat || !lng) return
    const key = `${lat},${lng}`
    if (key === prevKey.current) return
    prevKey.current = key

    if (cache[key] !== undefined) {
      setImage(cache[key])
      setStatus(cache[key] ? 'found' : 'missing')
      return
    }

    setStatus('loading')
    setImage(null)

    commonsGeoImage(lat, lng)
      .then(result => result || wikipediaImage(parkName))
      .then(result => {
        cache[key] = result
        setImage(result)
        setStatus(result ? 'found' : 'missing')
      })
      .catch(() => {
        cache[key] = null
        setStatus('missing')
      })
  }, [parkName, lat, lng])

  return { image, status }
}
